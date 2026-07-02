# Pi Agent with Kubernetes-Leased Sandbox Execution

A TypeScript backend that runs a chat agent on the **Pi TypeScript SDK** backed by **Google Gemini**. The
agent answers normally, but whenever it calls a tool, that tool executes **inside
a Kubernetes sandbox pod**. The service owns a fixed pool of **8 warm pods**.
Pods are not assigned to users or sessions; a pod is **leased just-in-time** for
a single tool call, **locked** while the tool runs, and **released** the instant
the tool finishes, fails, or times out.

The lock source of truth is Kubernetes `coordination.k8s.io/v1` **Lease**
objects, acquired with **optimistic concurrency**. When all 8 pods are busy,
tool calls enter a bounded **FIFO queue** with a 15s max wait.

```
POST /chat ──> Pi agent loop ──> tool call ──> [ lease a free pod ]
                                                      │  (FIFO queue if all 8 busy, 15s max)
                                                      ▼
                                            kubectl exec into sandbox-runner-N
                                                      │
                                                      ▼
                                            release Lease (always)
```

---

## Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Quick start](#quick-start)
4. [Configure credentials](#configure-credentials)
5. [Run locally](#run-the-api-service)
6. [Call `/chat` with curl](#calling-chat)
7. [Endpoints](#endpoints)
8. [The Lease model](#the-lease-model)
9. [FIFO queue & max wait](#the-fifo-queue--max-wait)
10. [Timeouts & cleanup](#timeouts--cleanup)
11. [9 concurrent tool calls example](#example-9-concurrent-tool-calls)
12. [Tool](#tool)
13. [Security](#security)
14. [Exec vs in-pod HTTP runner](#tradeoff-podsexec-vs-in-pod-http-runner)
15. [Production notes](#production-notes)

---

## Architecture

```
src/
  index.ts              Entrypoint: load config, wire everything, start HTTP server
  config.ts             Validated config + podNames helper; reads env vars with safe defaults
  server.ts             Hono app: POST /chat, GET /health, GET /api/telemetry, GET /
  telemetry.ts          RuntimeTelemetry: tracks requests, tool calls, pod state, queue, events
  dashboard.ts          Renders the live HTML dashboard served at GET /
  kubernetes/
    client.ts           KubeConfig + CoreV1Api / CoordinationV1Api / Exec
    sandbox-pool.yaml   StatefulSet (8 pods) + Leases manifest
  sandbox/
    types.ts            LeaseRecord, LeaseBackend interface, ConflictError, NotFoundError, AcquiredLease
    lease-backend.ts    K8sLeaseBackend: real Lease CRUD with optimistic concurrency (409 → ConflictError)
    lease-manager.ts    ★ LeaseManager: just-in-time leasing, FIFO queue, TTL/expiry recovery
    executor.ts         SandboxExecutor: lease → exec → release lifecycle for every tool call
  agent/
    pi-agent.ts         createPiAgent / chatWithAgent backed by the Pi SDK + Gemini
    tools.ts            run_in_sandbox AgentTool: executes shell commands via SandboxExecutor
```

The key design decision is the **`LeaseBackend` seam**
([src/sandbox/types.ts](src/sandbox/types.ts)): the lease/queue logic in
[src/sandbox/lease-manager.ts](src/sandbox/lease-manager.ts) depends only on that
interface, so the same logic can run against an in-memory fake for testing
or a real Kubernetes cluster in production.

---

## Prerequisites

- **Node.js ≥ 20**
- **Docker** (running)
- **kind** (`brew install kind`) and **kubectl**
- A **Gemini API key** (`GEMINI_API_KEY`)

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Create the local kind cluster
npm run create-cluster

# 3. Deploy the sandbox pod pool
npm run pods

# 4. Configure your Pi credential
cp .env.example .env
#   then edit .env and set GEMINI_API_KEY=your-gemini-api-key

# 5. Run the API locally (it talks to the kind cluster via your kubeconfig)
npm run dev        # development (tsx, no build step)
npm run build      # compile to dist/
npm start          # run compiled dist/index.js

# 6. In another terminal
curl localhost:3000/health
curl -s -X POST localhost:3000/chat -H 'Content-Type: application/json' \
  -d '{"message":"List the files in the sandbox."}' | jq
```

### How to create the local Kubernetes cluster

`npm run create-cluster` creates a kind cluster named `pi-sandbox-cluster` and waits up to 5 minutes for it to be ready.

### How to deploy the sandbox pod pool

`npm run pods` applies the sandbox manifest:

```bash
kubectl apply -f src/kubernetes/sandbox-pool.yaml
```

---

## Configure credentials

The service uses the **Pi TypeScript SDK** (`@mariozechner/pi-ai` + `@mariozechner/pi-agent-core`) with **Google Gemini** as the LLM provider.

```bash
cp .env.example .env
# .env:
GEMINI_API_KEY=your-gemini-api-key

# Optional overrides (these are the defaults):
PI_PROVIDER=google
PI_MODEL=gemini-2.5-flash
```

- **The service refuses to start if `GEMINI_API_KEY` is missing** — it throws immediately at startup.
- `PI_PROVIDER` and `PI_MODEL` can be overridden via env vars; they default to `google` / `gemini-2.5-flash`.

The agent is created per-request in [src/agent/pi-agent.ts](src/agent/pi-agent.ts) via `createPiAgent`, which builds a Pi `Agent` with the `run_in_sandbox` tool and runs one prompt turn via `chatWithAgent`.

---

## Run the API service

The simplest path runs the API **on your machine** against the kind cluster
(exec and lease calls go through the cluster's API server, so no port-forward to
pods is needed):

```bash
npm run dev        # development with tsx, no build step needed
npm run build      # compile TypeScript to dist/
npm start          # run compiled output (dist/index.js)
```

---

## Calling `/chat`

```bash
curl -s -X POST localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Print the current directory inside the sandbox."}' | jq
```

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "answer": "The current directory inside the sandbox is /workspace.",
  "tools": [
    {
      "toolName": "run_in_sandbox",
      "toolCallId": "tc_01...",
      "arguments": { "command": "pwd" },
      "result": { "podName": "sandbox-runner-3", "exitCode": 0, "durationMs": 312, "stdout": "/workspace\n", "stderr": "" },
      "isError": false
    }
  ]
}
```

---

## Endpoints

| Method | Path              | Description |
| ------ | ----------------- | ----------- |
| POST   | `/chat`           | Runs a chat turn. Accepts `{ message }`, generates a `requestId`, routes every tool call through the lease manager, returns `{ requestId, answer, tools }`. |
| GET    | `/api/telemetry`  | Live snapshot: pod lease states, queue depth, tracked requests, tool runs, and a rolling event log. Accepts `?since=<eventId>` for incremental polling. |
| POST   | `/api/reset`      | Clears all in-memory telemetry (events, requests, tools, pod state). Called automatically on dashboard load. |
| GET    | `/health`         | `{ status: "ok" }` |
| GET    | `/`               | Live HTML dashboard (auto-polls `/api/telemetry` every 150 ms). |

---

## The Lease model

Each pod has a Kubernetes `Lease` of the same name (`sandbox-runner-0` …
`sandbox-runner-7`). The Lease — **not** any in-memory flag or pod annotation —
is the lock source of truth.

- **Acquire** = compare-and-swap. The manager lists leases, finds a free one
  (no holder, or expired), and `PUT`s it back with our `holderIdentity` **and the
  observed `resourceVersion`**. If another writer changed it first, the API
  server returns **HTTP 409**; we treat that as a lost race
  ([ConflictError](src/sandbox/types.ts)) and try a different lease. This is what
  prevents two requests — or two API replicas — from grabbing the same pod.
- **`holderIdentity`** is `serviceInstanceId-<randomhex>` (6 random bytes), written into the Lease so you can identify which API instance owns a pod.
- Inspect live state any time:

  ```bash
  kubectl -n pi-sandbox get leases
  kubectl -n pi-sandbox get lease sandbox-runner-3 -o yaml
  ```

---

## The FIFO queue & max wait

When all 8 leases are held, callers wait in a **process-local FIFO queue**
([src/sandbox/lease-manager.ts](src/sandbox/lease-manager.ts)):

1. The queue is process-local (one API replica for this assignment).
2. It is FIFO — the oldest waiter is always served first.
3. Each waiter has a **15s** max wait (`QUEUE_MAX_WAIT_MS`).
4. If a pod frees up first (a release, or a poll that finds an expired lease),
   the head waiter acquires it and runs.
5. Otherwise the waiter fails with **`sandbox_capacity_timeout`**.

**Why a process-local queue is acceptable here:** the assignment runs a single
API replica, so the in-process queue *is* the global queue — ordering and the
wait bound are exact. The Kubernetes Lease still provides the real mutual
exclusion, so even concurrent acquirers (including a second replica, were one
running) can never double-book a pod; they would just lose FIFO fairness across
replicas. See [Production notes](#production-notes) for what changes at scale.

---

## Timeouts & cleanup

| Setting | Default | Meaning |
| ------- | ------- | ------- |
| `QUEUE_MAX_WAIT_MS` | 15000 | Max time a tool call waits in the FIFO queue. |
| `TOOL_TIMEOUT_MS`   | 30000 | Max time a single tool execution may run in a pod. |
| `LEASE_TTL_SECONDS` | 45    | Lease duration; an expired lease is reclaimable. |

The lease is **released on every exit path** — success, tool failure, tool
timeout, client cancellation, and unexpected error — via the `finally` block in
[src/sandbox/executor.ts](src/sandbox/executor.ts). Release is also **defensive**: it
only clears the lease if we are still the recorded holder, so it never clobbers a
pod that was already reclaimed.

**Crash recovery:** if the API process dies while holding a lease, the lease is
never explicitly released — but it still carries `renewTime + leaseDurationSeconds`.
Once that expires, any future request treats the lease as free and reclaims it
(logged as `sandbox.lease.expired_reclaimed`). A background poll re-scans leases
while waiters are queued, so recovery happens without needing a new release event.

---

## Example: 9 concurrent tool calls

With 8 pods, the 9th simultaneous tool call must wait for a pod (or time out):

```bash
# API running + cluster up — send 9 concurrent requests:
for i in $(seq 1 9); do
  curl -s -X POST localhost:3000/chat \
    -H 'Content-Type: application/json' \
    -d "{\"message\":\"Run whoami.\"}" &
done
wait
```

Watch the API logs: you'll see eight pods go `busy`, one
`sandbox.queue.wait_started` that stays pending, then either the 9th acquires
a pod once one frees or it times out after 15s.

---

## Tool

One tool runs **inside a leased pod** via `pods/exec`:

| Tool | Purpose |
| ---- | ------- |
| `run_in_sandbox` | Execute any shell command inside the sandbox pod. Accepts `{ command, workdir? }`. The command runs via `sh -lc` in the configured working directory (default `/workspace`). Returns `stdout`, `stderr`, `exitCode`, `podName`, and `durationMs`. |

---

---

## Security

- **Shell execution via `sh -lc`.** The `run_in_sandbox` tool passes the LLM-provided command string to `sh -lc` inside the pod. There is no command allowlist — the sandbox pod itself is the isolation boundary.
- **Namespace-scoped RBAC** ([src/kubernetes/sandbox-pool.yaml](src/kubernetes/sandbox-pool.yaml)): a Role +
  RoleBinding granting only get/list/watch pods, create pods/exec, get pods/log,
  and get/list/watch/create/update/patch leases. **No cluster-admin, no
  cluster-wide permissions.**
- Sandbox pods: **no privileged containers, no hostPath mounts**, `runAsNonRoot`,
  dropped capabilities, `seccompProfile: RuntimeDefault`, `automountServiceAccountToken:
  false`, and **resource limits** (250m CPU / 128Mi). The workspace is an
  ephemeral `emptyDir`.
- **Network egress:** not restricted by default in this assignment (kind has no
  default NetworkPolicy). Documented assumption: sandbox pods may reach the
  network. In production you'd add a default-deny `NetworkPolicy` (see below).

---

## Tradeoff: `pods/exec` vs in-pod HTTP runner

This service uses **`pods/exec`**. Tradeoffs:

| | `pods/exec` (chosen) | In-pod HTTP runner |
| --- | --- | --- |
| Pod image | stock `node:22-alpine`, no app code | custom image with a server |
| Auth | reuses API-server authn/authz + RBAC | you build/secure the endpoint |
| Moving parts | none in the pod | a long-running server per pod |
| Latency | WebSocket setup per call | lower per-call once warm |
| Streaming | per-exec stdout/stderr framing | full control |

For 8 warm pods and short allowlisted commands, exec is simpler, needs no custom
image, and keeps authorization in one place (Kubernetes RBAC). A long-lived
in-pod runner would cut per-call latency and make in-pod allowlist enforcement
easier, at the cost of a custom image and another process to operate.

---

## Production notes

This is a single-replica, local-cluster design. To evolve it:

- **Process-local queue is insufficient for multiple API replicas.** Each replica
  would keep its own FIFO order, so global fairness and the global wait bound are
  lost (correctness is still safe — the Lease prevents double-booking). Move the
  queue out of process: a **distributed queue/scheduler** such as Redis
  (e.g. a sorted-set/stream with a fair consumer), NATS JetStream, or a small
  scheduler service that owns pod assignment. The Lease stays the lock; the queue
  just decides *who asks next*.
- **Lease renewal for long-running tools.** Today TTL (45s) > tool timeout (30s),
  so renewal isn't required. For longer tools, run a heartbeat that `PUT`s the
  Lease with a fresh `renewTime` every TTL/3 while the tool runs, and stop
  renewing on completion so crash recovery still works.
- **API process crashes.** Handled by Lease expiry + reclaim (above). Add a
  liveness probe and a controller/poll that proactively frees leases whose holder
  instance is gone (e.g. cross-checking against live API-pod identities).
- **Execution history / audit.** Persist every tool call (request id, session,
  tool, args hash, pod, lease holder, exit code, duration, error) to an append-only
  store (Postgres, or an audit log shipped to a SIEM). Today this lives only in
  structured logs.
- **Pod image hardening.** Replace stock node with a pinned, digest-referenced,
  minimal/distroless image; scan it; run read-only root filesystem with explicit
  writable mounts; drop all capabilities (already done); consider gVisor/Kata for
  stronger isolation between tenants.
- **Network isolation.** Default-deny `NetworkPolicy` on sandbox pods (no egress
  except what a tool genuinely needs), separate namespace per tenant if needed,
  and no access to cluster metadata/IMDS.
- **Per-user / per-tenant limits.** Token-bucket rate limits and concurrency caps
  per session/tenant, fair-share scheduling so one tenant can't starve the pool,
  and per-tenant pod pools or quotas for stronger isolation.
- **Metrics & alerts.** Export Prometheus metrics: pool utilization, queue depth,
  queue wait histogram, capacity-timeout rate, lease-conflict rate, tool
  duration/timeout/error rates, exec failures. Alert on sustained queue depth,
  high capacity-timeout rate, low ready-pod count, and rising lease conflicts.

---

## Deliverables note

The "live web URL" deliverable requires a hosted Kubernetes cluster (the service
needs a cluster to lease pods from). The repo is fully runnable locally via kind
as documented; to host it, apply the same manifests to a managed cluster (GKE/EKS/AKS)
and expose the API `Service` via an Ingress/LoadBalancer.
