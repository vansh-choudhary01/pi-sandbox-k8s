import { randomBytes } from "node:crypto";

import {
  ConflictError,
  NotFoundError,
  type AcquiredLease,
  type LeaseBackend,
  type LeaseRecord,
} from "./types.js";
import type {
  LeaseAcquireContext,
  QueueSnapshot,
  RuntimeTelemetry,
} from "../telemetry.js";

export interface LeaseManagerOptions {
  /** Stable names of all sandbox pods in the pool. */
  podNames: string[];

  /** Unique identity of this running API service. */
  serviceInstanceId: string;

  /** Maximum time a caller waits when every pod is busy. */
  queueMaxWaitMs: number;

  /** Time after which an abandoned Lease is considered expired. */
  leaseTtlSeconds: number;

  /** How often the queue checks Kubernetes for a newly available pod. */
  retryIntervalMs?: number;
}

interface LocalQueueEntry extends LeaseAcquireContext {
  id: string;
  queuedAt: string;
  turnStartedAt?: string;
}

/**
 * Selects and locks sandbox pods using Kubernetes Lease objects.
 *
 * Responsibilities:
 * - create missing Lease objects
 * - find free or expired leases
 * - acquire leases using optimistic concurrency
 * - maintain a FIFO queue when all pods are busy
 * - release leases after tool execution
 */
export class LeaseManager {
  private readonly retryIntervalMs: number;

  /**
   * Promise chain used as a small local mutex.
   *
   * It keeps callers inside this API process in FIFO order. Kubernetes
   * resourceVersion still protects against races with other API replicas.
   */
  private queueTail: Promise<void> = Promise.resolve();
  private readonly waitingQueue = new Map<string, LocalQueueEntry>();
  private readonly acquiringQueue = new Map<string, LocalQueueEntry>();

  constructor(
    private readonly backend: LeaseBackend,
    private readonly options: LeaseManagerOptions,
    private readonly telemetry?: RuntimeTelemetry,
  ) {
    if (options.podNames.length === 0) {
      throw new Error("LeaseManager requires at least one sandbox pod");
    }

    this.retryIntervalMs = options.retryIntervalMs ?? 200;
    this.publishQueueSnapshot();
  }

  /**
   * Ensure every sandbox pod has a corresponding Lease object.
   *
   * This should run once during service startup.
   */
  async initialize(): Promise<void> {
    for (const podName of this.options.podNames) {
      const existing = await this.backend.get(podName);

      if (existing) {
        continue;
      }

      try {
        await this.backend.create({
          name: podName,

          // Empty holder means this pod is initially free.
          holderIdentity: undefined,
          renewTime: undefined,

          leaseDurationSeconds: this.options.leaseTtlSeconds,
        });
      } catch (error) {
        /**
         * Another API replica may have created the Lease after our get().
         * That race is safe, so a conflict can be ignored.
         */
        if (!(error instanceof ConflictError)) {
          throw error;
        }
      }
    }
  }

  async inspectLeases(): Promise<Array<LeaseRecord | undefined>> {
    return Promise.all(
      this.options.podNames.map((podName) => this.backend.get(podName)),
    );
  }

  /**
   * Wait for this caller's FIFO turn, then acquire a sandbox pod.
   *
   * The returned release() function must be called in a finally block.
   */
  async acquire(context: LeaseAcquireContext = {}): Promise<AcquiredLease> {
    const previousCaller = this.queueTail;
    const queueEntry: LocalQueueEntry = {
      id:
        context.toolCallId ??
        `${context.requestId ?? "request"}-${Date.now()}-${Math.random()}`,
      ...context,
      queuedAt: new Date().toISOString(),
    };

    this.waitingQueue.set(queueEntry.id, queueEntry);
    this.publishQueueSnapshot();

    // This promise represents the current caller's place in the local queue.
    let finishTurn!: () => void;

    this.queueTail = new Promise<void>((resolve) => {
      finishTurn = resolve;
    });

    // Wait until every earlier caller in this process has acquired or failed.
    await previousCaller;
    this.waitingQueue.delete(queueEntry.id);
    this.acquiringQueue.set(queueEntry.id, {
      ...queueEntry,
      turnStartedAt: new Date().toISOString(),
    });
    this.publishQueueSnapshot();

    try {
      return await this.acquireBeforeDeadline();
    } finally {
      /**
       * Once this caller acquires a pod, the next queued caller may start
       * searching for another pod immediately. It does not wait for this
       * caller's tool execution to finish.
       */
      finishTurn();
      this.acquiringQueue.delete(queueEntry.id);
      this.publishQueueSnapshot();
    }
  }

  /**
   * Repeatedly search for a free pod until the queue timeout is reached.
   */
  private async acquireBeforeDeadline(): Promise<AcquiredLease> {
    const deadline = Date.now() + this.options.queueMaxWaitMs;

    while (Date.now() < deadline) {
      const acquired = await this.tryAcquireAnyPod();

      if (acquired) {
        return acquired;
      }

      // Avoid continuously hammering the Kubernetes API server.
      await this.sleep(this.retryIntervalMs);
    }

    throw new Error(
      `No sandbox pod became available within ${this.options.queueMaxWaitMs}ms`,
    );
  }

  /**
   * Try each pod once and return the first successfully acquired Lease.
   */
  private async tryAcquireAnyPod(): Promise<AcquiredLease | undefined> {
    for (const podName of this.options.podNames) {
      const acquired = await this.tryAcquirePod(podName);

      if (acquired) {
        return acquired;
      }
    }

    return undefined;
  }

  /**
   * Attempt to lock one pod.
   *
   * This method may lose a race to another API instance. A conflict simply
   * means this pod was taken first, so the manager tries another pod.
   */
  private async tryAcquirePod(
    podName: string,
  ): Promise<AcquiredLease | undefined> {
    const current = await this.backend.get(podName);

    if (!current) {
      /**
       * initialize() should normally create every Lease. If one gets deleted,
       * recreate it and let the next retry attempt acquire it.
       */
      try {
        await this.backend.create({
          name: podName,
          leaseDurationSeconds: this.options.leaseTtlSeconds,
        });
      } catch (error) {
        if (!(error instanceof ConflictError)) {
          throw error;
        }
      }

      return undefined;
    }

    // A Lease can be acquired only when it is free or has expired.
    if (!this.isAvailable(current)) {
      return undefined;
    }

    /**
     * Include a random call ID because one API process can execute multiple
     * tool calls concurrently.
     */
    const holderIdentity =
      `${this.options.serviceInstanceId}-` +
      randomBytes(6).toString("hex");

    try {
      await this.backend.replace({
        ...current,
        holderIdentity,
        renewTime: new Date(),
        leaseDurationSeconds: this.options.leaseTtlSeconds,
      });
    } catch (error) {
      /**
       * HTTP 409 means another process updated the Lease after we read it.
       * The caller should simply try another pod.
       */
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError
      ) {
        return undefined;
      }

      throw error;
    }

    // Prevent release() from unlocking a Lease now owned by someone else.
    let released = false;

    return {
      podName,
      holderIdentity,

      release: async (): Promise<void> => {
        if (released) {
          return;
        }

        released = true;
        await this.release(podName, holderIdentity);
      },
    };
  }

  /**
   * A Lease is available when it has no holder or its TTL has elapsed.
   */
  private isAvailable(lease: LeaseRecord): boolean {
    if (!lease.holderIdentity) {
      return true;
    }

    if (!lease.renewTime) {
      // A holder without a timestamp cannot safely keep the Lease forever.
      return true;
    }

    const durationMs = lease.leaseDurationSeconds * 1_000;
    const expiresAt = lease.renewTime.getTime() + durationMs;

    return Date.now() >= expiresAt;
  }

  /**
   * Release a pod only when this exact tool call still owns its Lease.
   *
   * Re-reading first prevents an old release call from clearing a Lease that
   * expired and was already acquired by a different caller.
   */
  private async release(
    podName: string,
    holderIdentity: string,
  ): Promise<void> {
    const current = await this.backend.get(podName);

    if (!current) {
      return;
    }

    if (current.holderIdentity !== holderIdentity) {
      // Ownership has changed, so we must not unlock this pod.
      return;
    }

    try {
      await this.backend.replace({
        ...current,
        holderIdentity: undefined,
        renewTime: undefined,
        leaseDurationSeconds: this.options.leaseTtlSeconds,
      });
    } catch (error) {
      /**
       * A conflict means the Lease changed between our read and replace.
       * We must not retry using stale ownership information.
       */
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError
      ) {
        return;
      }

      throw error;
    }
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private publishQueueSnapshot(): void {
    const snapshot: QueueSnapshot = {
      waiting: [...this.waitingQueue.values()].map((entry) => ({
        requestId: entry.requestId,
        toolCallId: entry.toolCallId,
        toolName: entry.toolName,
        command: entry.command,
        queuedAt: entry.queuedAt,
      })),
      acquiring: [...this.acquiringQueue.values()].map((entry) => ({
        requestId: entry.requestId,
        toolCallId: entry.toolCallId,
        toolName: entry.toolName,
        command: entry.command,
        queuedAt: entry.queuedAt,
        turnStartedAt: entry.turnStartedAt ?? entry.queuedAt,
      })),
      retryIntervalMs: this.retryIntervalMs,
      queueMaxWaitMs: this.options.queueMaxWaitMs,
    };

    this.telemetry?.queueChanged(snapshot);
  }
}
