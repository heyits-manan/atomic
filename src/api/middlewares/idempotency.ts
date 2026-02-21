import { pool } from "@config/db";
import { IdempotencyRepository } from "@db/repositories/IdempotencyRepository";
import { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey) {
        return next();
    }

    const client = await pool.connect();
    try {
        const existingRecord = await IdempotencyRepository.findByKey(client, idempotencyKey);
        if (existingRecord) {
            const currentHash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
            if (existingRecord.requestBodyHash !== currentHash) {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Idempotency key reused with different request body' },
                    meta: { timestamp: new Date().toISOString() },
                });
            }

            if (existingRecord.status === 'COMPLETED') {
                return res.status(existingRecord.statusCode!).json({
                    success: true,
                    data: existingRecord.responseBody,
                    meta: { timestamp: new Date().toISOString() },
                });
            }

            if (existingRecord.status === 'IN_PROGRESS') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Request is already being processed' },
                    meta: { timestamp: new Date().toISOString() },
                });
            }

            if (existingRecord.status === 'FAILED') {
                await client.query('DELETE FROM idempotency_keys WHERE key = $1', [idempotencyKey]);
            }
        }

        const requestBodyHash = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
        const record = await IdempotencyRepository.create(client, {
            key: idempotencyKey,
            method: req.method,
            path: req.path,
            requestBodyHash,
        });

        if (!record) {
            return res.status(409).json({
                success: false,
                error: { message: 'Request is already being processed' },
                meta: { timestamp: new Date().toISOString() },
            });
        }

        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            IdempotencyRepository.update(client, {
                key: idempotencyKey,
                status: 'COMPLETED',
                statusCode: res.statusCode,
                responseBody: JSON.stringify(body),
            }).catch(err => console.error("Failed to save idempotency response: ", err));
            return originalJson(body);
        }

        res.on('finish', () => {
            if (res.statusCode >= 400) {
                IdempotencyRepository.update(client, {
                    key: idempotencyKey,
                    status: 'FAILED',
                    statusCode: res.statusCode,
                    responseBody: null,
                }).catch(err => console.error('Failed to update idempotency key to FAILED:', err));
            }
        });

        next();
    } catch (error) {
        console.error('Error processing idempotency middleware:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Internal Server Error' },
            meta: { timestamp: new Date().toISOString() },
        });
    } finally {
        client.release();
    }
}
