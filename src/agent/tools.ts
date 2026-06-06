import { Type, type Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

import type { SandboxExecutor } from "../sandbox/executor";

/**
 * Schema describing the arguments the LLM may provide.
 *
 * TypeBox gives Pi a JSON schema for the model and gives TypeScript
 * a matching compile-time type.
 */
const sandboxCommandParameters = Type.Object({
  command: Type.String({
    minLength: 1,
    description:
      "Shell command to execute inside an isolated Kubernetes sandbox",
  }),

  workdir: Type.Optional(
    Type.String({
      minLength: 1,
      description:
        "Working directory inside the sandbox; defaults to /workspace",
    }),
  ),
});

type SandboxCommandParameters = Static<
  typeof sandboxCommandParameters
>;

/**
 * Extra structured information kept for logging or a future UI.
 */
export interface SandboxCommandDetails {
  podName: string;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

/**
 * Creates the tool exposed to the Pi agent.
 *
 * The agent only knows this tool's name, description and schema.
 * The actual command is executed by our SandboxExecutor inside a leased pod.
 */
export function createSandboxCommandTool(
  executor: SandboxExecutor,
): AgentTool<
  typeof sandboxCommandParameters,
  SandboxCommandDetails
> {
  return {
    name: "run_in_sandbox",

    // Human-readable name that can later be displayed in logs or a UI.
    label: "Run command in Kubernetes sandbox",

    description:
      "Execute a shell command inside an isolated Kubernetes sandbox pod. " +
      "Use this when you need to run code, inspect files, or test commands.",

    parameters: sandboxCommandParameters,

    /**
     * Each Pi tool call reaches this function after its arguments have been
     * validated against sandboxCommandParameters.
     */
    async execute(
      _toolCallId: string,
      params: SandboxCommandParameters,
      signal?: AbortSignal,
    ) {
      if (signal?.aborted) {
        throw new Error("Sandbox command was cancelled");
      }

      const result = await executor.execute({
        command: params.command,
        workdir: params.workdir,
      });

      /**
       * `content` is sent back to the LLM.
       * `details` is structured data useful for logs, tracing or a UI.
       */
      const output = [
        `Pod: ${result.podName}`,
        `Exit code: ${result.exitCode}`,
        `Duration: ${result.durationMs}ms`,
        "",
        "STDOUT:",
        result.stdout || "(empty)",
        "",
        "STDERR:",
        result.stderr || "(empty)",
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],

        details: {
          podName: result.podName,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    },
  };
}