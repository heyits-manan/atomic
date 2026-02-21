import { Request, Response, NextFunction } from "express";
import { redisConnection } from '../../config/redis'

function createRateLimiter(options: { windowMs: number, limit: number; prefix?: string }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const ip = req.ip;
        const windowId = Math.floor(Date.now() / options.windowMs);
        const key = `ratelimit:${options.prefix || 'global'}:${ip}:${windowId}`;

        const count = await redisConnection.incr(key);

        if (count === 1) {
            await redisConnection.expire(key, Math.ceil(options.windowMs / 1000));
        }

        if (count > options.limit) {
            res.status(429).json({
                success: false,
                error: { message: "Too many requests" },
                meta: { timestamp: new Date().toISOString() },
            });
            return;
        }

        next();
    }
}

export const globalLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 100 });
export const paymentLimiter = createRateLimiter({ windowMs: 60 * 1000, limit: 10, prefix: 'payment' })