import { serve } from "@hono/node-server";

import { loadConfig, podNames } from "./config.js";
import { createKubernetesClients } from "./kubernetes/client.js";
import { K8sLeaseBackend } from "./sandbox/lease-backend.js";
import { LeaseManager } from "./sandbox/lease-manager.js";
import { SandboxExecutor } from "./sandbox/executor.js";
import { createPiAgent } from "./agent/pi-agent.js";
import { createServer } from "./server.js";
import { RuntimeTelemetry } from "./telemetry.js";

const config = loadConfig();
const kubernetes = createKubernetesClients();
const sandboxPodNames = podNames(config);
const telemetry = new RuntimeTelemetry(sandboxPodNames);

const leaseBackend = new K8sLeaseBackend(
  kubernetes.coordinationApi,
  config.namespace,
);

const leaseManager = new LeaseManager(leaseBackend, {
  podNames: sandboxPodNames,
  serviceInstanceId: config.serviceInstanceId,
  queueMaxWaitMs: config.queueMaxWaitMs,
  leaseTtlSeconds: config.leaseTtlSeconds,
}, telemetry);

await leaseManager.initialize();

const sandboxExecutor = new SandboxExecutor(
  kubernetes.exec,
  leaseManager,
  config,
  telemetry,
);

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

/**
 * Agent factory used by the HTTP server.
 *
 * The expensive Kubernetes clients and sandbox executor are shared,
 * but mutable conversation history is isolated per request.
 */
const createAgent = (requestId: string) =>
  createPiAgent(sandboxExecutor, {
    provider: process.env.PI_PROVIDER ?? "google",
    model: process.env.PI_MODEL ?? "gemini-2.5-flash",
    apiKey,
    requestId,
    telemetry,
  });

const app = createServer(createAgent, {
  leaseManager,
  telemetry,
});

/**
 * Start the HTTP server only after Kubernetes clients and Lease objects
 * are ready, so requests cannot arrive during incomplete initialization.
 */
serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`Server running at http://localhost:${config.port}`);
console.log(`Dashboard http://localhost:${config.port}/`);
console.log(`POST http://localhost:${config.port}/chat`);
