import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../app';
import { redisConnection } from '../config/redis';
import { pool } from '../config/db';

/**
 * Integration tests for the custom Fixed Window Counter rate limiter.
 *
 * These tests run against a REAL Redis instance.
 * Prerequisite: `docker compose up -d`
 */

const API_KEY = 'sk_test_07e84d24cb58b80f7a9ce09a9b1b7fe1a301b7f75afdb832';
const MERCHANT_ID = 'dae5291b-f990-446e-97bd-ad2be42deccf';

describe('Rate Limiter', () => {
    beforeEach(async () => {
        // Flush all rate limit keys so tests don't interfere with each other
        const keys = await redisConnection.keys('ratelimit:*');
        if (keys.length > 0) {
            await redisConnection.del(...keys);
        }
    });

    afterAll(async () => {
        // Clean up test-created data from PostgreSQL
        const client = await pool.connect();
        try {
            // Delete ledger entries tied to test payments first (foreign key)
            await client.query(
                `DELETE FROM ledger_entries WHERE transaction_id IN (
                    SELECT id FROM payments WHERE merchant_id = $1 AND amount = 100
                )`,
                [MERCHANT_ID]
            );
            // Delete the test payments (amount=100 created by rate limit tests)
            await client.query(
                'DELETE FROM payments WHERE merchant_id = $1 AND amount = 100',
                [MERCHANT_ID]
            );
            // Delete orphaned idempotency keys from test requests
            await client.query(
                `DELETE FROM idempotency_keys WHERE response_body::text LIKE '%100%'
                 AND created_at > NOW() - INTERVAL '1 hour'`
            );
        } finally {
            client.release();
        }

        // Clean up Redis keys (rate limit + BullMQ)
        const rlKeys = await redisConnection.keys('ratelimit:*');
        const bullKeys = await redisConnection.keys('bull:*');
        const allKeys = [...rlKeys, ...bullKeys];
        if (allKeys.length > 0) {
            await redisConnection.del(...allKeys);
        }

        await redisConnection.quit();
        await pool.end();
    });

    describe('Global Rate Limiter (100 req / 15 min)', () => {
        it('should allow requests under the limit', async () => {
            // Send 3 requests to the health endpoint (no auth needed)
            for (let i = 0; i < 3; i++) {
                const res = await request(app).get('/api/v1/health');
                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
            }
        });

        it('should block requests over the global limit', async () => {
            // Send 100 requests (the limit)
            for (let i = 0; i < 100; i++) {
                await request(app).get('/api/v1/health');
            }

            // The 101st should be blocked
            const res = await request(app).get('/api/v1/health');
            expect(res.status).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.error.message).toBe('Too many requests');
        });
    });

    describe('Payment Rate Limiter (10 req / 1 min)', () => {
        it('should allow 10 payment requests', async () => {
            for (let i = 0; i < 10; i++) {
                const res = await request(app)
                    .post('/api/v1/payments')
                    .set('Authorization', `Bearer ${API_KEY}`)
                    .set('Idempotency-Key', uuidv4())
                    .set('Content-Type', 'application/json')
                    .send({
                        merchantId: MERCHANT_ID,
                        amount: 100,
                        currency: 'USD',
                        source: 'tok_visa',
                    });

                expect(res.status).toBe(202);
            }
        });

        it('should block the 11th payment request', async () => {
            // Exhaust the 10-request limit
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .post('/api/v1/payments')
                    .set('Authorization', `Bearer ${API_KEY}`)
                    .set('Idempotency-Key', uuidv4())
                    .set('Content-Type', 'application/json')
                    .send({
                        merchantId: MERCHANT_ID,
                        amount: 100,
                        currency: 'USD',
                        source: 'tok_visa',
                    });
            }

            // The 11th should be blocked
            const res = await request(app)
                .post('/api/v1/payments')
                .set('Authorization', `Bearer ${API_KEY}`)
                .set('Idempotency-Key', uuidv4())
                .set('Content-Type', 'application/json')
                .send({
                    merchantId: MERCHANT_ID,
                    amount: 100,
                    currency: 'USD',
                    source: 'tok_visa',
                });

            expect(res.status).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.error.message).toBe('Too many requests');
        });
    });

    describe('Error Response Format', () => {
        it('should return a properly formatted 429 response', async () => {
            // Exhaust global limit on health endpoint
            for (let i = 0; i < 100; i++) {
                await request(app).get('/api/v1/health');
            }

            const res = await request(app).get('/api/v1/health');

            expect(res.status).toBe(429);
            expect(res.body).toEqual({
                success: false,
                error: { message: 'Too many requests' },
                meta: { timestamp: expect.any(String) },
            });
        });
    });
});
