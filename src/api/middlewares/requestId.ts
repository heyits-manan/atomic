import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../lib/logger";

/**
 * Attaches a unique request ID to every incoming request.
 * Uses the client-provided `X-Request-Id` header if present, otherwise generates one.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
    const id = (req.headers["x-request-id"] as string) || uuidv4();
    req.headers["x-request-id"] = id;
    res.setHeader("X-Request-Id", id);
    next();
}

/**
 * Logs every incoming request and its response time.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const reqId = req.headers["x-request-id"] as string;

    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
            requestId: reqId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
}
