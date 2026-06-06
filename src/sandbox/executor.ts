import { PassThrough } from "node:stream";
import type { Exec, V1Status } from "@kubernetes/client-node";

import type { Config } from "../config";
import type { LeaseManager } from "./lease-manager";

/**
 * Input accepted by the sandbox executor.
 */
export interface ExecuteCommandInput {
    /** Command passed to the container shell. */
    command: string;

    /**
     * Optional working directory.
     * Defaults to SANDBOX_WORKDIR, normally /workspace.
     */
    workdir?: string;

    /** Optional custom timeout for this command. */
    timeoutMs?: number;
}

/**
 * Result returned after command execution.
 */
export interface ExecuteCommandResult {
    podName: string;
    stdout: string;
    stderr: string;

    /**
     * Exit code returned by the command.
     *
     * Kubernetes reports command completion through a V1Status object rather
     * than directly returning the numeric exit code.
     */
    exitCode: number;

    /** Total command execution time. */
    durationMs: number;
}

/**
 * Executes agent tool commands inside leased Kubernetes sandbox pods.
 *
 * Flow:
 * 1. Acquire one pod Lease.
 * 2. Execute the command inside that pod.
 * 3. Capture stdout, stderr and exit code.
 * 4. Release the Lease inside finally.
 */
export class SandboxExecutor {
    constructor(
        private readonly exec: Exec,
        private readonly leaseManager: LeaseManager,
        private readonly config: Pick<
            Config,
            "namespace" | "container" | "workdir" | "toolTimeoutMs"
        >,
    ) { }

    async execute(
        input: ExecuteCommandInput,
    ): Promise<ExecuteCommandResult> {
        console.log("[Sandbox] Waiting for a free pod...");

        const lease = await this.leaseManager.acquire();

        console.log(`[Sandbox] Acquired pod: ${lease.podName}`);
        console.log(`[Sandbox] Command: ${input.command}`);

        const startedAt = Date.now();

        try {
            const result = await this.executeInsidePod(
                lease.podName,
                input,
                startedAt,
            );

            console.log(`[Sandbox] Exit code: ${result.exitCode}`);
            console.log(`[Sandbox] Duration: ${result.durationMs}ms`);

            return result;
        } finally {
            await lease.release();
            console.log(`[Sandbox] Released pod: ${lease.podName}`);
        }
    }

    private async executeInsidePod(
        podName: string,
        input: ExecuteCommandInput,
        startedAt: number,
    ): Promise<ExecuteCommandResult> {
        const stdout = new PassThrough();
        const stderr = new PassThrough();

        let stdoutText = "";
        let stderrText = "";

        // Collect command output as Kubernetes streams it back.
        stdout.on("data", (chunk: Buffer | string) => {
            stdoutText += chunk.toString();
        });

        stderr.on("data", (chunk: Buffer | string) => {
            stderrText += chunk.toString();
        });

        const workdir = input.workdir ?? this.config.workdir;
        const timeoutMs = input.timeoutMs ?? this.config.toolTimeoutMs;

        /**
         * We run through `sh -lc` because it supports:
         * - shell commands such as pipes and redirects
         * - changing to the configured working directory
         * - normal PATH resolution
         *
         * The working directory is passed as a shell argument instead of being
         * directly inserted into the command, reducing shell-injection risk.
         */
        const command = [
            "sh",
            "-lc",
            'cd -- "$1" && exec sh -lc "$2"',
            "sandbox-shell",
            workdir,
            input.command,
        ];

        let remoteStatus: V1Status | undefined;

        /**
         * exec.exec() returns the underlying streaming connection.
         * Closing it allows us to stop waiting when the timeout is reached.
         */
        const connection = await this.exec.exec(
            this.config.namespace,
            podName,
            this.config.container,
            command,
            stdout,
            stderr,
            null,
            false,
            (status) => {
                remoteStatus = status;
            },
        );

        try {
            await this.waitForCompletion(
                connection,
                timeoutMs,
                podName,
            );
        } finally {
            // Stop accepting more output after command completion or timeout.
            stdout.end();
            stderr.end();
        }

        const exitCode = this.extractExitCode(remoteStatus);

        return {
            podName,
            stdout: stdoutText,
            stderr: stderrText,
            exitCode,
            durationMs: Date.now() - startedAt,
        };
    }

    /**
     * Wait until Kubernetes closes the exec connection or the timeout expires.
     */
    private waitForCompletion(
        connection: {
            once(
                event: "close" | "error",
                listener: (...args: any[]) => void,
            ): unknown;
            close(): void;
        },
        timeoutMs: number,
        podName: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false;

            const finish = (error?: Error): void => {
                if (settled) return;

                settled = true;
                clearTimeout(timer);

                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };

            connection.once("close", () => {
                finish();
            });

            connection.once("error", (error: Error) => {
                finish(error);
            });

            const timer = setTimeout(() => {
                // Close the exec stream when the command exceeds its allowed time.
                connection.close();

                finish(
                    new Error(
                        `Command in pod "${podName}" timed out after ${timeoutMs}ms`,
                    ),
                );
            }, timeoutMs);
        });
    }

    /**
     * Extract the process exit code from Kubernetes' V1Status response.
     *
     * Successful commands normally return status "Success".
     * Failed commands include an ExitCode cause.
     */
    private extractExitCode(status: V1Status | undefined): number {
        if (!status || status.status === "Success") {
            return 0;
        }

        const exitCodeCause = status.details?.causes?.find(
            (cause) => cause.reason === "ExitCode",
        );

        const exitCode = Number(exitCodeCause?.message);

        return Number.isInteger(exitCode) ? exitCode : 1;
    }
}