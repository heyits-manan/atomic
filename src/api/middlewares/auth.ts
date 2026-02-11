import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Hash a raw API key with SHA-256.
 * This is the same function used to generate the hash stored in .env.
 */
function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Constant-time comparison of two hex strings.
 * Prevents timing attacks where an attacker measures response time
 * to figure out how many characters of the key are correct.
 */
function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * API Key Authentication Middleware.
 *
 * Flow:
 *   1. Extract token from `Authorization: Bearer sk_test_...`
 *   2. Hash the token with SHA-256
 *   3. Compare the hash against the stored hash (constant-time)
 *
 * The raw API key is NEVER stored on the server.
 * Only the hash is stored in .env (or in the DB for multi-merchant).
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    // 1. Check if header exists
    if (!authHeader) {
        res.status(401).json({
            success: false,
            error: { message: 'Missing Authorization header' },
            meta: { timestamp: new Date().toISOString() },
        });
        return;
    }

    // 2. Extract the token (Bearer sk_test_...)
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({
            success: false,
            error: { message: 'Invalid Authorization format. Expected: Bearer <token>' },
            meta: { timestamp: new Date().toISOString() },
        });
        return;
    }

    const token = parts[1];

    // 3. Hash the incoming key and compare against stored hash
    const incomingHash = hashApiKey(token!);

    if (!secureCompare(incomingHash, env.MERCHANT_API_KEY_HASH)) {
        logger.warn('Invalid API key attempt', { prefix: token?.slice(0, 8) + '...' });
        res.status(403).json({
            success: false,
            error: { message: 'Invalid API Key' },
            meta: { timestamp: new Date().toISOString() },
        });
        return;
    }

    // 4. Key is valid — proceed
    logger.debug('API key authenticated');
    next();
}

