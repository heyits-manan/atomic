import { Request, Response, NextFunction } from "express";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { ApiResponse } from "../../types";
import { env } from "../../config/env";

/**
 * Global error handling middleware.
 * Must be registered LAST in the middleware chain (4-arg signature).
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
): void {
    // Operational errors we threw intentionally
    if (err instanceof AppError) {
        logger.warn(`AppError: ${err.message}`, {
            statusCode: err.statusCode,
            stack: err.stack,
        });

        res.status(err.statusCode).json({
            success: false,
            error: { message: err.message },
            meta: { timestamp: new Date().toISOString() },
        });
        return;
    }

    // Unexpected / programming errors
    logger.error("Unhandled error", {
        message: err.message,
        stack: err.stack,
    });

    const statusCode = 500;
    const message =
        env.NODE_ENV === "production"
            ? "Internal Server Error"
            : err.message;

    res.status(statusCode).json({
        success: false,
        error: { message },
        meta: { timestamp: new Date().toISOString() },
    });
}
