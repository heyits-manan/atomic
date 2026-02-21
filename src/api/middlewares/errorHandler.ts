import { Request, Response, NextFunction } from "express";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { ApiResponse } from "../../types";
import { env } from "../../config/env";

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
): void {
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
