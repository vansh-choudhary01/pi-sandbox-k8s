import { serve } from "@hono/node-server";

import { loadConfig, podNames } from "./config";
import { createKubernetesClients } from "./kubernetes/client";
import { K8sLeaseBackend } from "./sandbox/lease-backend";
import { LeaseManager } from "./sandbox/lease-manager";
import { SandboxExecutor } from "./sandbox/executor";
import { createPiAgent } from "./agent/pi-agent";
import { createServer } from "./server";

const config = loadConfig();
const kubernetes = createKubernetesClients();

const leaseBackend = new K8sLeaseBackend(
  kubernetes.coordinationApi,
  config.namespace,
);

const leaseManager = new LeaseManager(leaseBackend, {
  podNames: podNames(config),
  serviceInstanceId: config.serviceInstanceId,
  queueMaxWaitMs: config.queueMaxWaitMs,
  leaseTtlSeconds: config.leaseTtlSeconds,
});

await leaseManager.initialize();

const sandboxExecutor = new SandboxExecutor(
  kubernetes.exec,
  leaseManager,
  config,
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
const createAgent = () =>
  createPiAgent(sandboxExecutor, {
    provider: process.env.PI_PROVIDER ?? "google",
    model: process.env.PI_MODEL ?? "gemini-2.5-flash",
    apiKey,
  });

const app = createServer(createAgent);

/**
 * Start the HTTP server only after Kubernetes clients and Lease objects
 * are ready, so requests cannot arrive during incomplete initialization.
 */
serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`Server running at http://localhost:${config.port}`);
console.log(`POST http://localhost:${config.port}/chat`);