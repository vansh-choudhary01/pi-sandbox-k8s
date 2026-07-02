import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

import type { SandboxExecutor } from "../sandbox/executor.js";
import type { RuntimeTelemetry } from "../telemetry.js";
import {
    createSandboxCommandTool,
    type SandboxCommandDetails,
} from "./tools.js";

export interface PiAgentOptions {
    provider: string;
    model: string;
    apiKey: string;
    requestId?: string;
    telemetry?: RuntimeTelemetry;
}

/**
 * Details about one tool execution performed during an agent request.
 */
export interface ToolExecutionTrace {
    toolName: string;
    toolCallId: string;
    arguments: unknown;
    result?: SandboxCommandDetails;
    isError: boolean;
}

/**
 * Complete result returned from one Pi agent request.
 */
export interface AgentChatResult {
    answer: string;
    tools: ToolExecutionTrace[];
}

export function createPiAgent(
    executor: SandboxExecutor,
    options: PiAgentOptions,
): Agent {
    const sandboxTool = createSandboxCommandTool(executor, {
        requestId: options.requestId,
    });

    return new Agent({
        initialState: {
            systemPrompt: [
                "You are a helpful coding assistant.",
                "Answer normally when command execution is unnecessary.",
                "Use run_in_sandbox when you need to execute or test code.",
                "Never claim that a command succeeded unless the tool confirms it.",
            ].join("\n"),

            model: getModel(
                options.provider as Parameters<typeof getModel>[0],
                options.model as never,
            ),

            tools: [sandboxTool],
            messages: [],
            thinkingLevel: "off",
        },

        getApiKey: async () => options.apiKey,

        // Independent tool calls can use separate leased pods concurrently.
        toolExecution: "parallel",
    });
}

/**
 * Runs one user message and collects both the final answer and tool traces.
 */
export async function chatWithAgent(
    agent: Agent,
    message: string,
    trace?: {
        requestId: string;
        telemetry: RuntimeTelemetry;
    },
): Promise<AgentChatResult> {
    if (!message.trim()) {
        throw new Error("Chat message cannot be empty");
    }

    const traces = new Map<string, ToolExecutionTrace>();

    /**
     * This subscription belongs only to this request because every request
     * receives a fresh Agent instance.
     */
    const unsubscribe = agent.subscribe((event) => {
        if (event.type === "tool_execution_start") {
            traces.set(event.toolCallId, {
                toolName: event.toolName,
                toolCallId: event.toolCallId,
                arguments: event.args,
                isError: false,
            });

            trace?.telemetry.toolStarted(
                trace.requestId,
                event.toolCallId,
                event.toolName,
                event.args,
            );
        }

        if (event.type === "tool_execution_end") {
            const existing = traces.get(event.toolCallId);

            traces.set(event.toolCallId, {
                toolName: event.toolName,
                toolCallId: event.toolCallId,
                arguments: existing?.arguments,
                isError: event.isError,
                result: event.result?.details as
                    | SandboxCommandDetails
                    | undefined,
            });
        }
    });

    try {
        await agent.prompt(message);
    } finally {
        // Prevent event listeners from remaining after the request finishes.
        unsubscribe();
    }

    const assistantMessage = [...agent.state.messages]
        .reverse()
        .find((item) => item.role === "assistant");

    if (!assistantMessage || assistantMessage.role !== "assistant") {
        throw new Error("Pi agent did not return an assistant message");
    }

    const answer = assistantMessage.content
        .filter(
            (
                block,
            ): block is Extract<
                (typeof assistantMessage.content)[number],
                { type: "text" }
            > => block.type === "text",
        )
        .map((block) => block.text)
        .join("")
        .trim();

    return {
        answer,
        tools: [...traces.values()],
    };
}
