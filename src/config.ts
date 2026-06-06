import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

// Loads variables from the project's .env file into process.env.
dotenv.config();

/**
 * Central configuration used by the whole backend.
 *
 * Keeping configuration in one object prevents different parts of the
 * application from reading environment variables in inconsistent ways.
 */
export interface Config {
  /** Kubernetes namespace containing sandbox pods and Lease objects. */
  namespace: string;

  /** Number of warm sandbox pods available for tool execution. */
  poolSize: number;

  /** Base pod name, for example: sandbox-runner-0. */
  podPrefix: string;

  /** Container inside the pod where commands will execute. */
  container: string;

  /** Default directory inside the sandbox container. */
  workdir: string;

  /** Maximum time a tool call can wait for a free sandbox pod. */
  queueMaxWaitMs: number;

  /** Maximum time a command is allowed to run inside a pod. */
  toolTimeoutMs: number;

  /**
   * How long a Kubernetes Lease remains valid.
   *
   * This protects against permanently locked pods if the API process crashes
   * before explicitly releasing a lease.
   */
  leaseTtlSeconds: number;

  /** HTTP port used by the backend server. */
  port: number;

  /**
   * Unique identifier for this running API process.
   *
   * It will later be stored in Lease holderIdentity so we can identify
   * which API instance currently owns a sandbox pod.
   */
  serviceInstanceId: string;
}

/**
 * Reads a positive numeric environment variable.
 *
 * It uses the fallback when the variable is missing and throws during startup
 * when the provided value is invalid. Failing early is better than discovering
 * a bad configuration during a tool call.
 */
function positiveNumber(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid ${name}: "${value}". Expected a positive number.`,
    );
  }

  return parsed;
}

/**
 * Loads and validates the application's configuration.
 *
 * Passing env as an argument makes this function easier to unit test because
 * tests can provide fake environment variables instead of changing process.env.
 */
export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): Config {
  return {
    // Defaults to the namespace where our sandbox Kubernetes resources live.
    namespace: env.SANDBOX_NAMESPACE?.trim() || "pi-sandbox",

    // We maintain a fixed pool of eight warm pods by default.
    poolSize: positiveNumber(
      "SANDBOX_POOL_SIZE",
      env.SANDBOX_POOL_SIZE,
      8,
    ),

    // Produces pod names such as sandbox-runner-0 and sandbox-runner-1.
    podPrefix: env.SANDBOX_POD_PREFIX?.trim() || "sandbox-runner",

    // The specific container targeted when a pod contains multiple containers.
    container: env.SANDBOX_CONTAINER?.trim() || "runner",

    // Commands executed by agent tools will start from this directory.
    workdir: env.SANDBOX_WORKDIR?.trim() || "/workspace",

    // A queued tool call fails if no pod becomes available within 15 seconds.
    queueMaxWaitMs: positiveNumber(
      "QUEUE_MAX_WAIT_MS",
      env.QUEUE_MAX_WAIT_MS,
      15_000,
    ),

    // A running tool command is terminated after 30 seconds by default.
    toolTimeoutMs: positiveNumber(
      "TOOL_TIMEOUT_MS",
      env.TOOL_TIMEOUT_MS,
      30_000,
    ),

    // A lease expires after 45 seconds if its owner crashes or disappears.
    leaseTtlSeconds: positiveNumber(
      "LEASE_TTL_SECONDS",
      env.LEASE_TTL_SECONDS,
      45,
    ),

    // Port on which POST /chat will eventually be exposed.
    port: positiveNumber("PORT", env.PORT, 3000),

    // A configured ID is useful in deployments; otherwise generate one.
    serviceInstanceId:
      env.SERVICE_INSTANCE_ID?.trim() ||
      `api-${randomBytes(4).toString("hex")}`,
  };
}

/**
 * Creates the stable pod names belonging to our sandbox pool.
 *
 * Example with poolSize=3:
 * ["sandbox-runner-0", "sandbox-runner-1", "sandbox-runner-2"]
 */
export function podNames(
  config: Pick<Config, "podPrefix" | "poolSize">,
): string[] {
  return Array.from(
    { length: config.poolSize },
    (_, index) => `${config.podPrefix}-${index}`,
  );
}