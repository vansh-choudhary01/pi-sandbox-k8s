import { Hono } from "hono";
import type { Agent } from "@mariozechner/pi-agent-core";

import { chatWithAgent } from "./agent/pi-agent";

interface ChatRequestBody {
  message?: string;
}

/**
 * Creates a new isolated agent for each request.
 *
 * This prevents:
 * - one user's conversation leaking into another user's request
 * - concurrent requests modifying the same agent state
 */
export type AgentFactory = () => Agent;

export function createServer(createAgent: AgentFactory): Hono {
  const app = new Hono();

  app.get("/health", (context) => {
    return context.json({
      status: "ok",
    });
  });

  app.post("/chat", async (context) => {
    try {
      const body = await context.req.json<ChatRequestBody>();
      const message = body.message?.trim();

      if (!message) {
        return context.json(
          {
            error: "message is required",
          },
          400,
        );
      }

      // Every request receives its own clean agent state.
      const agent = createAgent();

      const answer = await chatWithAgent(agent, message);

      return context.json({
        answer,
      });
    } catch (error) {
      console.error("[POST /chat] Failed:", error);

      return context.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown server error",
        },
        500,
      );
    }
  });

  return app;
}