import type { LeaseRecord } from "./sandbox/types";

export type RuntimeEventType =
  | "request_started"
  | "request_completed"
  | "request_failed"
  | "tool_started"
  | "tool_waiting"
  | "tool_acquired"
  | "tool_completed"
  | "tool_failed"
  | "pod_released"
  | "queue_changed";

export interface RuntimeEvent {
  id: number;
  at: string;
  type: RuntimeEventType;
  message: string;
  requestId?: string;
  toolCallId?: string;
  podName?: string;
  data?: unknown;
}

export interface QueueSnapshot {
  waiting: Array<{
    requestId?: string;
    toolCallId?: string;
    toolName?: string;
    command?: string;
    queuedAt: string;
  }>;
  acquiring: Array<{
    requestId?: string;
    toolCallId?: string;
    toolName?: string;
    command?: string;
    queuedAt: string;
    turnStartedAt: string;
  }>;
  retryIntervalMs: number;
  queueMaxWaitMs: number;
}

export interface LeaseAcquireContext {
  requestId?: string;
  toolCallId?: string;
  toolName?: string;
  command?: string;
}

interface TrackedRequest {
  id: string;
  message: string;
  status: "active" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  answer?: string;
  error?: string;
  toolCount: number;
}

interface TrackedTool {
  requestId?: string;
  toolCallId: string;
  toolName: string;
  status:
  | "started"
  | "waiting"
  | "running"
  | "completed"
  | "failed"
  | "released";
  arguments?: unknown;
  command?: string;
  workdir?: string;
  podName?: string;
  holderIdentity?: string;
  exitCode?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  startedAt: string;
  acquiredAt?: string;
  finishedAt?: string;
  releasedAt?: string;
}

interface PodSnapshot {
  podName: string;
  status: "free" | "busy" | "expired" | "unknown";
  holderIdentity?: string;
  renewTime?: string;
  expiresAt?: string;
  requestId?: string;
  toolCallId?: string;
  toolName?: string;
  command?: string;
  lastReleasedAt?: string;
  leaseDurationSeconds?: number;
}

export class RuntimeTelemetry {
  private nextEventId = 1;
  private readonly events: RuntimeEvent[] = [];
  private readonly requests = new Map<string, TrackedRequest>();
  private readonly tools = new Map<string, TrackedTool>();
  private readonly podRuntime = new Map<string, PodSnapshot>();
  private queue: QueueSnapshot = {
    waiting: [],
    acquiring: [],
    retryIntervalMs: 0,
    queueMaxWaitMs: 0,
  };

  constructor(private readonly podNames: string[]) {
    for (const podName of podNames) {
      this.podRuntime.set(podName, {
        podName,
        status: "unknown",
      });
    }
  }

  requestStarted(requestId: string, message: string): void {
    const startedAt = new Date().toISOString();

    this.requests.set(requestId, {
      id: requestId,
      message,
      status: "active",
      startedAt,
      toolCount: 0,
    });

    this.addEvent({
      type: "request_started",
      message: `Request ${requestId} started`,
      requestId,
      data: { message },
    });
  }

  requestCompleted(
    requestId: string,
    answer: string,
    toolCount: number,
    startedAt: number,
  ): void {
    const request = this.requests.get(requestId);
    const finishedAt = new Date().toISOString();

    if (request) {
      request.status = "completed";
      request.answer = answer;
      request.toolCount = toolCount;
      request.finishedAt = finishedAt;
      request.durationMs = Date.now() - startedAt;
    }

    this.addEvent({
      type: "request_completed",
      message: `Request ${requestId} completed with ${toolCount} tool call${toolCount === 1 ? "" : "s"}`,
      requestId,
      data: { answer, toolCount },
    });
  }

  requestFailed(requestId: string, error: string, startedAt: number): void {
    const request = this.requests.get(requestId);
    const finishedAt = new Date().toISOString();

    if (request) {
      request.status = "failed";
      request.error = error;
      request.finishedAt = finishedAt;
      request.durationMs = Date.now() - startedAt;
    }

    this.addEvent({
      type: "request_failed",
      message: `Request ${requestId} failed: ${error}`,
      requestId,
      data: { error },
    });
  }

  toolStarted(
    requestId: string,
    toolCallId: string,
    toolName: string,
    args: unknown,
  ): void {
    const command = this.extractCommand(args);
    const tool: TrackedTool = {
      requestId,
      toolCallId,
      toolName,
      status: "started",
      arguments: args,
      command,
      startedAt: new Date().toISOString(),
    };

    this.tools.set(toolCallId, tool);

    const request = this.requests.get(requestId);

    if (request) {
      request.toolCount = [...this.tools.values()].filter(
        (item) => item.requestId === requestId,
      ).length;
    }

    this.addEvent({
      type: "tool_started",
      message: `${toolName} started`,
      requestId,
      toolCallId,
      data: { args },
    });
  }

  toolWaiting(context: LeaseAcquireContext & { workdir?: string }): void {
    const tool = this.ensureTool(context);
    tool.status = "waiting";
    tool.command = context.command ?? tool.command;
    tool.workdir = context.workdir ?? tool.workdir;

    this.addEvent({
      type: "tool_waiting",
      message: `${tool.toolName} is waiting for a free pod`,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      data: {
        command: tool.command,
        workdir: tool.workdir,
      },
    });
  }

  toolAcquired(
    context: LeaseAcquireContext & {
      podName: string;
      holderIdentity: string;
    },
  ): void {
    const tool = this.ensureTool(context);
    const acquiredAt = new Date().toISOString();

    tool.status = "running";
    tool.podName = context.podName;
    tool.holderIdentity = context.holderIdentity;
    tool.acquiredAt = acquiredAt;

    this.podRuntime.set(context.podName, {
      podName: context.podName,
      status: "busy",
      holderIdentity: context.holderIdentity,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      toolName: tool.toolName,
      command: tool.command,
    });

    this.addEvent({
      type: "tool_acquired",
      message: `${tool.toolName} acquired ${context.podName}`,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      podName: context.podName,
      data: {
        holderIdentity: context.holderIdentity,
        command: tool.command,
      },
    });
  }

  toolCompleted(
    toolCallId: string | undefined,
    result: {
      podName: string;
      exitCode: number;
      durationMs: number;
      stdout: string;
      stderr: string;
    },
  ): void {
    if (!toolCallId) {
      return;
    }

    const tool = this.tools.get(toolCallId);

    if (!tool) {
      return;
    }

    tool.status = result.exitCode === 0 ? "completed" : "failed";
    tool.podName = result.podName;
    tool.exitCode = result.exitCode;
    tool.durationMs = result.durationMs;
    tool.stdout = result.stdout;
    tool.stderr = result.stderr;
    tool.finishedAt = new Date().toISOString();

    this.addEvent({
      type: "tool_completed",
      message: `${tool.toolName} finished in ${result.durationMs}ms with exit code ${result.exitCode}`,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      podName: result.podName,
      data: result,
    });
  }

  toolFailed(
    context: LeaseAcquireContext,
    error: string,
  ): void {
    const tool = this.ensureTool(context);
    tool.status = "failed";
    tool.error = error;
    tool.finishedAt = new Date().toISOString();

    this.addEvent({
      type: "tool_failed",
      message: `${tool.toolName} failed: ${error}`,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      podName: tool.podName,
      data: { error },
    });
  }

  podReleased(
    context: LeaseAcquireContext & { podName: string },
  ): void {
    const tool = this.ensureTool(context);
    const releasedAt = new Date().toISOString();

    tool.status = tool.status === "failed" ? "failed" : "released";
    tool.releasedAt = releasedAt;

    const current = this.podRuntime.get(context.podName);

    this.podRuntime.set(context.podName, {
      podName: context.podName,
      status: "free",
      lastReleasedAt: releasedAt,
      leaseDurationSeconds: current?.leaseDurationSeconds,
    });

    this.addEvent({
      type: "pod_released",
      message: `${context.podName} released`,
      requestId: tool.requestId,
      toolCallId: tool.toolCallId,
      podName: context.podName,
    });
  }

  queueChanged(snapshot: QueueSnapshot): void {
    this.queue = snapshot;

    this.addEvent({
      type: "queue_changed",
      message: `Queue changed: ${snapshot.waiting.length} waiting, ${snapshot.acquiring.length} acquiring`,
      data: snapshot,
    });
  }

  observeLeases(leases: Array<LeaseRecord | undefined>): void {
    for (const lease of leases) {
      if (!lease) {
        continue;
      }

      const existing = this.podRuntime.get(lease.name);
      const renewTime = lease.renewTime?.toISOString();
      const expiresAt = lease.renewTime
        ? new Date(
          lease.renewTime.getTime() +
          lease.leaseDurationSeconds * 1_000,
        ).toISOString()
        : undefined;

      if (!lease.holderIdentity) {
        this.podRuntime.set(lease.name, {
          podName: lease.name,
          status: "free",
          lastReleasedAt: existing?.lastReleasedAt,
          leaseDurationSeconds: lease.leaseDurationSeconds,
        });
        continue;
      }

      const matchingTool = [...this.tools.values()].find(
        (tool) => tool.holderIdentity === lease.holderIdentity,
      );

      this.podRuntime.set(lease.name, {
        podName: lease.name,
        status: expiresAt && Date.now() >= Date.parse(expiresAt)
          ? "expired"
          : "busy",
        holderIdentity: lease.holderIdentity,
        renewTime,
        expiresAt,
        requestId: matchingTool?.requestId ?? existing?.requestId,
        toolCallId: matchingTool?.toolCallId ?? existing?.toolCallId,
        toolName: matchingTool?.toolName ?? existing?.toolName,
        command: matchingTool?.command ?? existing?.command,
        lastReleasedAt: existing?.lastReleasedAt,
        leaseDurationSeconds: lease.leaseDurationSeconds,
      });
    }
  }

  snapshot(sinceEventId = 0): {
    events: RuntimeEvent[];
    snapshot: {
      pods: PodSnapshot[];
      requests: TrackedRequest[];
      tools: TrackedTool[];
      queue: QueueSnapshot;
      totals: {
        pods: number;
        busyPods: number;
        waitingTools: number;
        activeRequests: number;
      };
    };
  } {
    const requests = [...this.requests.values()]
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, 50);
    const tools = [...this.tools.values()]
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, 80);
    const pods = this.podNames.map(
      (podName) =>
        this.podRuntime.get(podName) ?? {
          podName,
          status: "unknown" as const,
        },
    );

    return {
      events: this.events.filter((event) => event.id > sinceEventId),
      snapshot: {
        pods,
        requests,
        tools,
        queue: this.queue,
        totals: {
          pods: pods.length,
          busyPods: pods.filter((pod) => pod.status === "busy").length,
          waitingTools: this.queue.waiting.length,
          activeRequests: requests.filter(
            (request) => request.status === "active",
          ).length,
        },
      },
    };
  }

  private ensureTool(context: LeaseAcquireContext): TrackedTool {
    const toolCallId = context.toolCallId ?? "unknown-tool-call";
    const existing = this.tools.get(toolCallId);

    if (existing) {
      return existing;
    }

    const tool: TrackedTool = {
      requestId: context.requestId,
      toolCallId,
      toolName: context.toolName ?? "run_in_sandbox",
      status: "started",
      command: context.command,
      startedAt: new Date().toISOString(),
    };

    this.tools.set(toolCallId, tool);

    return tool;
  }

  private extractCommand(args: unknown): string | undefined {
    if (
      typeof args === "object" &&
      args !== null &&
      "command" in args
    ) {
      const command = (args as { command?: unknown }).command;

      return typeof command === "string" ? command : undefined;
    }

    return undefined;
  }

  private addEvent(
    event: Omit<RuntimeEvent, "id" | "at">,
  ): void {
    this.events.push({
      id: this.nextEventId++,
      at: new Date().toISOString(),
      ...event,
    });

    if (this.events.length > 500) {
      this.events.splice(0, this.events.length - 500);
    }
  }
}
