import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { Agent } from "@mariozechner/pi-agent-core";

import { chatWithAgent } from "./agent/pi-agent";
import { renderDashboardHtml } from "./dashboard";
import type { LeaseManager } from "./sandbox/lease-manager";
import type { RuntimeTelemetry } from "./telemetry";

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
export type AgentFactory = (requestId: string) => Agent;

export interface RuntimeDashboardDependencies {
    leaseManager: LeaseManager;
    telemetry: RuntimeTelemetry;
}

export function createServer(
    createAgent: AgentFactory,
    runtime?: RuntimeDashboardDependencies,
): Hono {
    const app = new Hono();

    app.get("/", (context) => {
        return context.html(renderDashboardHtml());
    });

    app.get("/health", (context) => {
        return context.json({
            status: "ok",
        });
    });

    app.get("/api/telemetry", async (context) => {
        if (!runtime) {
            return context.json(
                {
                    error: "runtime telemetry is not configured",
                },
                503,
            );
        }

        const since = Number(context.req.query("since") ?? 0);
        const leases = await runtime.leaseManager.inspectLeases();
        runtime.telemetry.observeLeases(leases);

        return context.json(
            runtime.telemetry.snapshot(Number.isFinite(since) ? since : 0),
        );
    });

    app.post("/chat", async (context) => {
        const requestId = randomUUID();
        const startedAt = Date.now();

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

            runtime?.telemetry.requestStarted(requestId, message);

            const agent = createAgent(requestId);
            const result = await chatWithAgent(
                agent,
                message,
                runtime
                    ? {
                        requestId,
                        telemetry: runtime.telemetry,
                    }
                    : undefined,
            );

            runtime?.telemetry.requestCompleted(
                requestId,
                result.answer,
                result.tools.length,
                startedAt,
            );

            return context.json({
                requestId,
                answer: result.answer,
                tools: result.tools,
            });
        } catch (error) {
            console.error("[POST /chat] Failed:", error);
            runtime?.telemetry.requestFailed(
                requestId,
                error instanceof Error
                    ? error.message
                    : "Unknown server error",
                startedAt,
            );

            return context.json(
                {
                    requestId,
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
