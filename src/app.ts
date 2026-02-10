import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { requestId, requestLogger, errorHandler } from "./api/middlewares";
import routes from "./api/routes";

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Idempotency-Key"],
        credentials: true,
    })
);

// ─── Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Request tracing & logging ───────────────────────────────
app.use(requestId);
app.use(requestLogger);

// ─── API Routes ──────────────────────────────────────────────
app.use("/api/v1", routes);

// ─── 404 catch-all ───────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { message: "Route not found" },
        meta: { timestamp: new Date().toISOString() },
    });
});

// ─── Global Error Handler (must be last) ─────────────────────
app.use(errorHandler);

export default app;
