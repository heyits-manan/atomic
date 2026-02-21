import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { pool } from '../../config/db';
import { ApiKeyRepository } from '../../db/repositories/ApiKeyRepository';
import { logger } from '../../lib/logger';

function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({
            success: false,
            error: { message: 'Missing Authorization header' },
            meta: { timestamp: new Date().toISOString() },
        });
        return;
    }

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
    const incomingHash = hashApiKey(token);

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

        (req as any).merchantId = keyRecord.merchant_id;
        (req as any).accountId = keyRecord.account_id;
        logger.debug('API key authenticated', { merchantId: keyRecord.merchant_id });
        next();
    } finally {
        client.release();
    }
}
