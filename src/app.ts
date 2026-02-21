import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { requestId, requestLogger, errorHandler } from "./api/middlewares";
import routes from "./api/routes";
import { globalLimiter } from "@api/middlewares/rateLimiter";

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Idempotency-Key"],
        credentials: true,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(requestId);
app.use(requestLogger);
app.use(globalLimiter);

app.use("/api/v1", routes);

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { message: "Route not found" },
        meta: { timestamp: new Date().toISOString() },
    });
});

app.use(errorHandler);

export default app;
