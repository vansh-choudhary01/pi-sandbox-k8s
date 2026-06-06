import type {
  CoordinationV1Api,
  V1Lease,
} from "@kubernetes/client-node";

import {
  ConflictError,
  NotFoundError,
  type LeaseBackend,
  type LeaseRecord,
} from "./types";

/**
 * Stores sandbox locks as Kubernetes Lease objects.
 *
 * This class only converts between:
 * - our simple LeaseRecord
 * - Kubernetes V1Lease
 *
 * Pod selection, expiry and queue logic will belong to LeaseManager.
 */
export class K8sLeaseBackend implements LeaseBackend {
  constructor(
    private readonly api: CoordinationV1Api,
    private readonly namespace: string,
  ) { }

  /**
   * Read one Lease from Kubernetes.
   *
   * Missing leases return undefined because the manager may need to create
   * them during initial setup.
   */
  async get(name: string): Promise<LeaseRecord | undefined> {
    try {
      const lease = await this.api.readNamespacedLease({
        name,
        namespace: this.namespace,
      });

      return this.fromKubernetesLease(lease);
    } catch (error) {
      if (this.getStatusCode(error) === 404) {
        return undefined;
      }

      throw error;
    }
  }

  /**
   * Create a new Lease object.
   *
   * Normally, we create one Lease for every sandbox pod:
   * sandbox-runner-0, sandbox-runner-1, etc.
   */
  async create(record: LeaseRecord): Promise<LeaseRecord> {
    try {
      const lease = await this.api.createNamespacedLease({
        namespace: this.namespace,
        body: this.toKubernetesLease(record),
      });

      return this.fromKubernetesLease(lease);
    } catch (error) {
      // HTTP 409 means another API instance created it first.
      if (this.getStatusCode(error) === 409) {
        throw new ConflictError(
          `Lease "${record.name}" already exists or changed`,
        );
      }

      throw error;
    }
  }

  /**
   * Replace an existing Lease using metadata.resourceVersion.
   *
   * Kubernetes rejects the update with HTTP 409 when another process changed
   * the Lease after we read it. This is optimistic concurrency control.
   */
  async replace(record: LeaseRecord): Promise<LeaseRecord> {
    try {
      const lease = await this.api.replaceNamespacedLease({
        name: record.name,
        namespace: this.namespace,
        body: this.toKubernetesLease(record),
      });

      return this.fromKubernetesLease(lease);
    } catch (error) {
      const statusCode = this.getStatusCode(error);

      if (statusCode === 409) {
        throw new ConflictError(
          `Lease "${record.name}" was changed by another API instance`,
        );
      }

      if (statusCode === 404) {
        throw new NotFoundError(`Lease "${record.name}" does not exist`);
      }

      throw error;
    }
  }

  /**
   * Convert our internal LeaseRecord into a Kubernetes Lease.
   */
  private toKubernetesLease(record: LeaseRecord): V1Lease {
    return {
      apiVersion: "coordination.k8s.io/v1",
      kind: "Lease",

      metadata: {
        name: record.name,

        // Required when replacing an existing object.
        resourceVersion: record.resourceVersion,
      },

      spec: {
        holderIdentity: record.holderIdentity,
        leaseDurationSeconds: record.leaseDurationSeconds,

        // Kubernetes client accepts Date values for MicroTime fields.
        renewTime: record.renewTime
          ? (toKubernetesMicroTime(record.renewTime) as unknown as Date)
          : undefined,
      },
    };
  }

  /**
   * Convert a Kubernetes Lease into our simpler application structure.
   */
  private fromKubernetesLease(lease: V1Lease): LeaseRecord {
    if (!lease.metadata?.name) {
      throw new Error("Kubernetes Lease is missing metadata.name");
    }

    return {
      name: lease.metadata.name,
      holderIdentity: lease.spec?.holderIdentity,
      leaseDurationSeconds: lease.spec?.leaseDurationSeconds ?? 0,
      renewTime: lease.spec?.renewTime
        ? new Date(lease.spec.renewTime)
        : undefined,
      resourceVersion: lease.metadata.resourceVersion,
    };
  }

  /**
   * Extract an HTTP status code from errors returned by the Kubernetes client.
   *
   * Different client versions may expose it as `statusCode`, `code`,
   * or inside `response.statusCode`.
   */
  private getStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
      return undefined;
    }

    const possibleError = error as {
      statusCode?: number;
      code?: number;
      response?: {
        statusCode?: number;
      };
    };

    return (
      possibleError.statusCode ??
      possibleError.code ??
      possibleError.response?.statusCode
    );
  }
}

/**
 * Kubernetes Lease renewTime uses MicroTime and expects six digits after
 * the decimal, while JavaScript Date.toISOString() only produces three.
 *
 * Example:
 * JS:         2026-06-06T19:24:05.742Z
 * Kubernetes: 2026-06-06T19:24:05.742000Z
 */
function toKubernetesMicroTime(date: Date): string {
  return date.toISOString().replace(
    /\.(\d{3})Z$/,
    ".$1000Z",
  );
}