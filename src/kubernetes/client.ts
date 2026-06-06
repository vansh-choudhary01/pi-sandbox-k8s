import {
  CoordinationV1Api,
  CoreV1Api,
  Exec,
  KubeConfig,
} from "@kubernetes/client-node";

/**
 * Kubernetes clients required by our service.
 *
 * coreApi:
 *   Used for normal Kubernetes resources such as Pods.
 *
 * coordinationApi:
 *   Used for Kubernetes Lease objects that lock sandbox pods.
 *
 * exec:
 *   Used to execute commands inside a running container.
 */
export interface KubernetesClients {
  kubeConfig: KubeConfig;
  coreApi: CoreV1Api;
  coordinationApi: CoordinationV1Api;
  exec: Exec;
}

/**
 * Creates authenticated Kubernetes API clients.
 *
 * loadFromDefault() supports both:
 * - Local development using ~/.kube/config
 * - Running inside Kubernetes using the pod's ServiceAccount
 */
export function createKubernetesClients(): KubernetesClients {
  const kubeConfig = new KubeConfig();

  // Automatically find the available Kubernetes credentials.
  kubeConfig.loadFromDefault();

  // Client for reading pods and other core Kubernetes resources.
  const coreApi = kubeConfig.makeApiClient(CoreV1Api);

  // Client for creating, reading and updating Lease objects.
  const coordinationApi = kubeConfig.makeApiClient(CoordinationV1Api);

  // Helper used later to execute commands inside sandbox containers.
  const exec = new Exec(kubeConfig);

  return {
    kubeConfig,
    coreApi,
    coordinationApi,
    exec,
  };
}