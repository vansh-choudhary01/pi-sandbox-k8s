import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

import type { SandboxExecutor } from "../sandbox/executor";
import { createSandboxCommandTool } from "./tools";

export interface PiAgentOptions {
    /** Pi provider name, for example anthropic or openai. */
    provider: string;

    /** Model ID available under the selected provider. */
    model: string;

    /** Provider API key used for LLM requests. */
    apiKey: string;
}

/**
 * Creates one Pi agent with our Kubernetes sandbox tool registered.
 *
 * The LLM runs in this backend process, while only tool commands run
 * inside leased Kubernetes pods.
 */
export function createPiAgent(
    executor: SandboxExecutor,
    options: PiAgentOptions,
): Agent {
    const sandboxTool = createSandboxCommandTool(executor);

    const agent = new Agent({
        initialState: {
            systemPrompt: [
                "You are a helpful coding assistant.",
                "Answer normally when no command execution is required.",
                "Use run_in_sandbox when you need to run code or shell commands.",
                "Never claim a command succeeded unless you used the tool.",
            ].join("\n"),

            // Resolve the model definition from Pi's built-in model registry.
            model: getModel(
                options.provider as Parameters<typeof getModel>[0],
                options.model as never,
            ),

            // The only tool available to the agent currently.
            tools: [sandboxTool],

            messages: [],

            // Disable extended reasoning for this initial version.
            thinkingLevel: "off",
        },

        /**
         * Pi calls this whenever the selected provider needs authentication.
         * Later this can refresh OAuth credentials instead of returning one key.
         */
        getApiKey: async () => options.apiKey,

        /**
         * Multiple independent tool calls may run in parallel.
         * Each call will acquire a different available sandbox pod.
         */
        toolExecution: "parallel",
    });

    /**
   * Subscribe to Pi's agent lifecycle events so we can observe:
   * LLM turns, tool calls, sandbox results and failures.
   */
    agent.subscribe((event) => {
        switch (event.type) {
            case "agent_start":
                console.log("\n[Agent] Started");
                break;

            case "turn_start":
                console.log("[Agent] New LLM turn");
                break;

            case "tool_execution_start":
                console.log("\n[Tool] Starting");
                console.log("Name:", event.toolName);
                console.log("Call ID:", event.toolCallId);
                console.log("Arguments:", event.args);
                break;

            case "tool_execution_update":
                console.log("[Tool] Progress:", event.partialResult);
                break;

            case "tool_execution_end":
                console.log("\n[Tool] Finished");
                console.log("Name:", event.toolName);
                console.log("Error:", event.isError);
                console.dir(event.result, { depth: null });
                break;

            case "turn_end":
                console.log("[Agent] Turn finished");
                break;

            case "agent_end":
                console.log("[Agent] Finished\n");
                break;
        }
    });

    return agent;
}

/**
 * Send a message through the complete Pi agent loop.
 *
 * Pi automatically:
 * 1. Sends the user message to the LLM.
 * 2. Detects tool calls.
 * 3. Executes our sandbox tool.
 * 4. Sends the tool result back to the LLM.
 * 5. Produces the final assistant response.
 */
export async function chatWithAgent(
    agent: Agent,
    message: string,
): Promise<string> {
    if (!message.trim()) {
        throw new Error("Chat message cannot be empty");
    }

    await agent.prompt(message);

    // Search backwards for the latest completed assistant message.
    const assistantMessage = [...agent.state.messages]
        .reverse()
        .find((item) => item.role === "assistant");

    if (!assistantMessage || assistantMessage.role !== "assistant") {
        throw new Error("Pi agent did not return an assistant message");
    }

    /**
     * Assistant content can contain text, reasoning and tool calls.
     * The HTTP response should return only normal text blocks.
     */
    return assistantMessage.content
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
}