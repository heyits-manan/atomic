import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { pool } from '../../config/db';
import { ApiKeyRepository } from '../../db/repositories/ApiKeyRepository';
import { logger } from '../../lib/logger';

/**
 * Hash a raw API key with SHA-256.
 */
function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}




/**
 * API Key Authentication Middleware.
 *
 * Flow:
 *   1. Extract token from `Authorization: Bearer sk_test_...`
 *   2. Hash the token with SHA-256
 *   3. Look up the hash in the `api_keys` table (active keys only)
 *   4. If found, attach merchantId to the request and proceed
 *
 * The raw API key is NEVER stored on the server.
 * Only the SHA-256 hash is stored in the database.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const token = parts[1]!;

    // 3. Hash the incoming key
    const incomingHash = hashApiKey(token);

    // 4. Look up hash in the api_keys table
    const client = await pool.connect();
    try {
        const keyRecord = await ApiKeyRepository.findActiveByHash(client, incomingHash);

        if (!keyRecord) {
            logger.warn('Invalid API key attempt', { prefix: token.slice(0, 14) });
            res.status(403).json({
                success: false,
                error: { message: 'Invalid API Key' },
                meta: { timestamp: new Date().toISOString() },
            });
            return;
        }

        // 5. Key is valid — attach merchant info and proceed
        (req as any).merchantId = keyRecord.merchant_id;
        (req as any).accountId = keyRecord.account_id;
        logger.debug('API key authenticated', { merchantId: keyRecord.merchant_id });
        next();
    } finally {
        client.release();
    }
}
