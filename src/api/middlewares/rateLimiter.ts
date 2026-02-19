import { Request, Response, NextFunction } from "express";
import { redisConnection } from '../../config/redis'



function createRateLimiter(options: { windowMs: number, limit: number; prefix?: string }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // 1. Get the client's IP address
        const ip = req.ip;

        // 2. Calculate which time window we're in
        const windowId = Math.floor(Date.now() / options.windowMs);

        // 3. Build the Redis key
        // e.g., "ratelimit:payment:192.168.1.1:29251830"
        const key = `ratelimit:${options.prefix || 'global'}:${ip}:${windowId}`;

        // 4. Increment the counter (creates the key with value 1 if it doesn't exist)
        const count = await redisConnection.incr(key);

        // 5. If this is the first request in this window, set the key to auto-expire
        if (count === 1) {
            await redisConnection.expire(key, Math.ceil(options.windowMs / 1000));
        }

        // 6. Check if over the limit
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