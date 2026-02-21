import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

interface JwtPayload {
    merchantId: string;
    email: string;
}

export function merchantAuth(req: Request, res: Response, next: NextFunction): void {
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

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        (req as any).merchantId = decoded.merchantId;
        (req as any).merchantEmail = decoded.email;
        logger.debug('JWT authenticated', { merchantId: decoded.merchantId });
        next();
    } catch (err) {
        logger.warn('Invalid JWT token', { error: (err as Error).message });
        res.status(401).json({
            success: false,
            error: { message: 'Invalid or expired token' },
            meta: { timestamp: new Date().toISOString() },
        });
    }
}
