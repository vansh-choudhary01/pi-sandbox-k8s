# Pi Agent with Kubernetes-Leased Sandbox Execution

A TypeScript backend that runs a chat agent on the **Pi TypeScript SDK**. The
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
4. [Configure Pi credentials](#configure-pi-credentials)
5. [Run locally](#run-the-api-service)
6. [Call `/chat` with curl](#calling-chat)
7. [Endpoints](#endpoints)
8. [The Lease model](#the-lease-model)
9. [FIFO queue & max wait](#the-fifo-queue--max-wait)
10. [Timeouts & cleanup](#timeouts--cleanup)
11. [9 concurrent tool calls example](#example-9-concurrent-tool-calls)
12. [Tools](#tools)
13. [Tests](#tests)
14. [Security](#security)
15. [Exec vs in-pod HTTP runner](#tradeoff-podsexec-vs-in-pod-http-runner)
16. [Production notes](#production-notes)

---

## Architecture

```
src/
  index.ts              Entrypoint: load config, wire everything, start HTTP server
  config.ts             Validated config; fails fast if Pi credentials are missing
  logger.ts             Structured JSON logger + canonical event names
  ids.ts                Request id + Lease holderIdentity encode/decode
  server.ts             Express app: POST /chat, GET /pods, GET /health
  poolState.ts          Builds GET /pods payload (readiness + lease status)
  k8s/
    client.ts           KubeConfig + CoreV1Api / CoordinationV1Api / Exec
    types.ts            LeaseBackend / PodExecutor / PodReader interfaces (the seams)
    leaseBackend.ts     Real Lease CRUD with optimistic concurrency (409 -> ConflictError)
    podExec.ts          pods/exec wrapper + pod readiness reader
  sandbox/
    leaseManager.ts     ★ Just-in-time leasing, FIFO queue, TTL/expiry recovery
    errors.ts           CapacityTimeoutError (sandbox_capacity_timeout), CancelledError
  tools/
    index.ts            shell.run, fs.read, env.inspect as Pi AgentTools
    runInSandbox.ts     Lease -> exec -> release lifecycle for every tool call
    security.ts         Command allowlist + path-traversal guard
    context.ts          Per-request tool context + tool-call recorder
  pi/
    types.ts            PiClient interface, ChatInput, ChatResult (the abstraction)
    realPiClient.ts     RealPiClient backed by the real Pi SDK Agent loop
k8s/                    Namespace, RBAC, StatefulSet (8 pods), Leases, API Deployment
scripts/                kind-up, deploy, create-leases, load-9
test/unit/              Fast tests with an in-memory Lease backend (no cluster)
test/integration/       Real-cluster tests + the Pi-backed smoke test
```

The key design decision is the **`LeaseBackend` / `PodExecutor` seam**
([src/k8s/types.ts](src/k8s/types.ts)): the lease/queue logic in
[src/sandbox/leaseManager.ts](src/sandbox/leaseManager.ts) depends only on those
interfaces, so the exact same logic runs against an in-memory fake (unit tests)
and a real cluster (integration tests).

---

## Prerequisites

- **Node.js ≥ 20**
- **Docker** (running)
- **kind** (`brew install kind`) and **kubectl**
- An **Anthropic API key** for the Pi SDK (see below)

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Create the local cluster + 8 sandbox pods + 8 leases
npm run kind:up

# 3. Configure your Pi credential
cp .env.example .env
#   then edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 4. Run the API locally (it talks to the kind cluster via your kubeconfig)
npm start

# 5. In another terminal
curl localhost:3000/health
curl -s -X POST localhost:3000/chat -H 'Content-Type: application/json' \
  -d '{"sessionId":"s1","message":"List the files in the sandbox."}' | jq
```

### How to create the local Kubernetes cluster

`npm run kind:up` ([scripts/kind-up.sh](scripts/kind-up.sh)) creates a kind
cluster named `pi-sandbox`, then applies the manifests and waits for all 8 pods.

### How to apply manifests manually

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-rbac.yaml
kubectl apply -f k8s/20-sandbox-statefulset.yaml
kubectl apply -f k8s/30-leases.yaml
kubectl -n pi-sandbox rollout status statefulset/sandbox-runner
```

---

## Configure Pi credentials

The Pi SDK (`@earendil-works/pi-ai` + `@earendil-works/pi-agent-core`) drives the
chat/agent loop and talks to an underlying LLM provider. There are **two ways**
to supply credentials, and the service validates one of them at startup.

**Option A — API key (env var):**

```bash
cp .env.example .env
# .env:
PI_PROVIDER=anthropic
PI_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...
# (or PI_PROVIDER=openai / PI_MODEL=gpt-4o / OPENAI_API_KEY=...)
```

**Option B — Pi login (OAuth):** if you've signed in with the Pi CLI
(`pi login`), the service reuses those stored credentials from
`~/.pi/agent/auth.json` and **refreshes the token automatically** — no env key
needed. Just point `PI_PROVIDER` at the logged-in provider:

```bash
# .env:
PI_PROVIDER=openai-codex      # OpenAI ChatGPT login
PI_MODEL=gpt-5.5
```

- Both modes are resolved and validated in [src/config.ts](src/config.ts) +
  [src/pi/auth.ts](src/pi/auth.ts).
- **The service refuses to start if no credential is available** for the
  configured provider — you get a clear `startup.pi_auth_invalid` /
  `startup.config_invalid` log line and a non-zero exit, not a runtime surprise
  on the first request.
- The Pi-backed path stays real in both modes; no mock is ever substituted.

> Note on tool names: OpenAI requires function names to match `^[a-zA-Z0-9_-]+$`,
> so the LLM-facing tool names use underscores (`shell_run`), while the
> assignment's dotted names (`shell.run`) are what appear in the `/chat` response
> and logs.

The Pi integration lives behind a small abstraction so the rest of the code is
not coupled to the SDK ([src/pi/types.ts](src/pi/types.ts)):

```ts
interface PiClient {
  runChat(input: ChatInput): Promise<ChatResult>;
}
```

`RealPiClient` ([src/pi/realPiClient.ts](src/pi/realPiClient.ts)) builds a Pi
`Agent`, registers the three sandbox tools, runs one prompt turn, and returns the
final assistant message plus per-tool metadata.

---

## Run the API service

The simplest path runs the API **on your machine** against the kind cluster
(exec and lease calls go through the cluster's API server, so no port-forward to
pods is needed):

```bash
npm start          # or: npm run dev   (watch mode)
```

### Run the API in-cluster (optional)

```bash
npm run deploy     # builds the image, loads it into kind, creates the
                   # pi-sandbox-secrets Secret from .env, deploys the API
kubectl -n pi-sandbox port-forward svc/pi-sandbox-api 3000:80
curl localhost:3000/health
```

---

## Calling `/chat`

```bash
curl -s -X POST localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"session-123","message":"Use env.inspect and tell me the pod name and user."}' | jq
```

```json
{
  "sessionId": "session-123",
  "message": "The sandbox runs as user 'node' on pod sandbox-runner-3 ...",
  "toolCalls": [
    { "toolCallId": "tc_01...", "tool": "env.inspect", "pod": "sandbox-runner-3", "status": "completed" }
  ]
}
```

---

## Endpoints

| Method | Path      | Description |
| ------ | --------- | ----------- |
| POST   | `/chat`   | Runs a chat turn. Accepts `{ sessionId, message }`, generates a request id, routes every tool call through the lease manager, returns the final assistant message + tool-call metadata. |
| GET    | `/pods`   | Current pool state: each pod's readiness and lease status (`free` / `leased` with `holderIdentity` + `expiresAt`), plus current `queueDepth`. |
| GET    | `/health` | `{ ok, kubernetes: "connected", sandboxPodsReady }`. Returns 503 if the cluster is unreachable. |

Capacity timeouts return **HTTP 429** with the assignment's error shape:

```json
{ "error": { "code": "sandbox_capacity_timeout", "message": "No sandbox pod became available within 15 seconds." } }
```

---

## The Lease model

Each pod has a Kubernetes `Lease` of the same name (`sandbox-runner-0` …
`sandbox-runner-7`). The Lease — **not** any in-memory flag or pod annotation —
is the lock source of truth.

- **Acquire** = compare-and-swap. The manager lists leases, finds a free one
  (no holder, or expired), and `PUT`s it back with our `holderIdentity` **and the
  observed `resourceVersion`**. If another writer changed it first, the API
  server returns **HTTP 409**; we treat that as a lost race
  ([ConflictError](src/k8s/types.ts)) and try a different lease. This is what
  prevents two requests — or two API replicas — from grabbing the same pod.
- **`holderIdentity`** encodes ownership for debugging:
  `instanceId:requestId:sessionId:toolCallId` (see
  [src/ids.ts](src/ids.ts)). Annotations carry the same info for observability,
  but they are never consulted for locking.
- Inspect live state any time:

  ```bash
  kubectl -n pi-sandbox get leases
  kubectl -n pi-sandbox get lease sandbox-runner-3 -o yaml
  ```

---

## The FIFO queue & max wait

When all 8 leases are held, callers wait in a **process-local FIFO queue**
([src/sandbox/leaseManager.ts](src/sandbox/leaseManager.ts)):

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
[runInSandbox.ts](src/tools/runInSandbox.ts). Release is also **defensive**: it
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
# API running + cluster up:
N=9 bash scripts/load-9.sh
```

Watch the API logs: you'll see eight `sandbox.lease.acquired`, one
`sandbox.queue.wait_started` that stays pending, then either a
`sandbox.queue.wait_completed` (a pod freed within 15s) or a
`sandbox.queue.wait_timed_out` → HTTP 429 `sandbox_capacity_timeout`.

This exact scenario is covered by the automated tests
(`leaseManager.test.ts` "more than 8 concurrent" + the real-cluster integration
test).

---

## Tools

All three run **inside a leased pod** via `pods/exec`:

| Tool | Purpose | Guards |
| ---- | ------- | ------ |
| `shell.run` | Run an allowlisted command (`pwd`, `ls`, `cat <path>`, `whoami`, `node --version`). | Command allowlist; argv is exec'd directly (no shell); path args validated; shell metacharacters rejected. |
| `fs.read`   | Read a file from the allowed root (`/workspace`). | Path-traversal / absolute-escape rejected before touching the pod. |
| `env.inspect` | Report pod name, namespace, working dir, user, runtime versions. | Fixed, non-user-controlled command. |

---

## Tests

```bash
npm test                  # fast unit tests, no cluster needed (in-memory Lease backend)
npm run test:integration  # real-cluster tests + Pi-backed smoke test
```

Unit tests model **real Kubernetes optimistic concurrency** with an in-memory
backend (resourceVersion compare-and-swap → `ConflictError`), so concurrency,
conflict, queueing, and expiry are all deterministic. Coverage maps to the
assignment's required cases:

| # | Requirement | Where |
| - | ----------- | ----- |
| 1 | Acquire a free pod | `leaseManager.test.ts` |
| 2 | Release after success | `leaseManager.test.ts`, `tools.test.ts` |
| 3 | Release after tool failure | `leaseManager.test.ts`, `tools.test.ts` |
| 4 | Release after timeout | `leaseManager.test.ts`, `tools.test.ts` |
| 5 | Two concurrent calls never share a pod | `leaseManager.test.ts` (+ real concurrency-pressure test) |
| 6 | >8 concurrent calls queue | `leaseManager.test.ts`, integration |
| 7 | Queued call runs when a pod frees | `leaseManager.test.ts`, integration |
| 8 | Queued call fails after max wait | `leaseManager.test.ts` |
| 9 | Expired Lease recovery | `leaseManager.test.ts` |
| 10 | `/pods` reflects lease state | `poolState.test.ts`, integration |
| 11 | Real Pi SDK chat triggers sandbox path | `pi.smoke.integration.test.ts` |

The integration suite includes the **Pi-backed smoke test** that runs with real
Pi credentials and exercises the sandbox tool-execution path. It skips itself
(with a warning) if the cluster or key is absent.

---

## Security

- **No arbitrary shell execution.** `shell.run` enforces a program allowlist and
  execs argv arrays directly (never `sh -c`), so shell metacharacters can't
  inject. `node` is restricted to `--version`.
- **Path allowlist** for `fs.read` — traversal and absolute escapes rejected.
- **Namespace-scoped RBAC** ([k8s/10-rbac.yaml](k8s/10-rbac.yaml)): a Role +
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
