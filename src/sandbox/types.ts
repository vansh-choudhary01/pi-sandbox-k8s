/**
 * Simplified Lease data used by our application.
 *
 * We keep Kubernetes-specific objects out of the LeaseManager so its logic
 * can later be tested without needing a real Kubernetes cluster.
 */
export interface LeaseRecord {
  /** Lease name; it will normally match the sandbox pod name. */
  name: string;

  /** Unique API instance/tool-call identity currently holding the pod. */
  holderIdentity?: string;

  /** Time when the lease was most recently acquired or renewed. */
  renewTime?: Date;

  /** Number of seconds before the lease is considered expired. */
  leaseDurationSeconds: number;

  /**
   * Kubernetes resource version used for optimistic concurrency.
   *
   * When two API instances update the same Lease, Kubernetes accepts only the
   * update containing the latest resourceVersion and rejects the other.
   */
  resourceVersion?: string;
}

/**
 * Abstraction for storing sandbox locks.
 *
 * The real implementation will use Kubernetes Lease objects, while tests can
 * use a simple in-memory implementation.
 */
export interface LeaseBackend {
  /** Return one Lease, or undefined when it does not exist. */
  get(name: string): Promise<LeaseRecord | undefined>;

  /** Create the initial Lease object for a sandbox pod. */
  create(lease: LeaseRecord): Promise<LeaseRecord>;

  /**
   * Replace an existing Lease.
   *
   * The provided resourceVersion ensures optimistic concurrency.
   */
  replace(lease: LeaseRecord): Promise<LeaseRecord>;
}

/**
 * Thrown when another API instance changed the Lease before our update.
 *
 * This is expected during races; the LeaseManager can retry another pod.
 */
export class ConflictError extends Error {
  constructor(message = "Lease was changed by another process") {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when Kubernetes says the requested Lease does not exist.
 */
export class NotFoundError extends Error {
  constructor(message = "Lease was not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Result returned after successfully locking one sandbox pod.
 */
export interface AcquiredLease {
  /** Pod selected for this tool call. */
  podName: string;

  /** Identity written into the Kubernetes Lease. */
  holderIdentity: string;

  /**
   * Releases the pod.
   *
   * Later we will call this inside `finally`, ensuring the pod is unlocked
   * whether the command succeeds, fails, or times out.
   */
  release(): Promise<void>;
}