import app from "./app";
import { env } from "./config/env";
import { closePool } from "./config/db";
import { logger } from "./lib/logger";

const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// ─── Graceful shutdown ──────────────────────────────────────

function shutdown(signal: string) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
        logger.info("HTTP server closed.");

        try {
            await closePool();
        } catch (err) {
            logger.error("Error closing DB pool during shutdown", { error: err });
        }

        logger.info("Shutdown complete. Bye 👋");
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
        logger.error("Graceful shutdown timed out. Forcing exit.");
        process.exit(1);
    }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled promise rejection", { reason });
    // Let the process crash so it can be restarted by a process manager
    throw reason;
});

process.on("uncaughtException", (err: Error) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    process.exit(1);
});
