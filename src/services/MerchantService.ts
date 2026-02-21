import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { MerchantRepository } from '../db/repositories/MerchantRepository';
import { ApiKeyRepository } from '../db/repositories/ApiKeyRepository';
import { AccountRepository } from '../db/repositories/AccountRepository';
import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

export class MerchantService {
    static async register(email: string, password: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await MerchantRepository.findByEmail(client, email);
            if (existing) {
                throw new ConflictError('Email already registered');
            }

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            const account = await AccountRepository.create(client, {
                name: email,
                currency: 'USD',
                allowNegative: false,
            });

            const merchant = await MerchantRepository.create(client, {
                email,
                passwordHash,
                accountId: account.id,
            });

            await client.query('COMMIT');

            return {
                id: merchant.id,
                email: merchant.email,
                accountId: merchant.account_id,
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async login(email: string, password: string) {
        const client = await pool.connect();
        try {
            const merchant = await MerchantRepository.findByEmail(client, email);
            if (!merchant) {
                throw new UnauthorizedError('Invalid email or password');
            }

            const valid = await bcrypt.compare(password, merchant.password_hash);
            if (!valid) {
                throw new UnauthorizedError('Invalid email or password');
            }

            const token = jwt.sign(
                { merchantId: merchant.id, email: merchant.email },
                env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                token,
                merchant: {
                    id: merchant.id,
                    email: merchant.email,
                    accountId: merchant.account_id,
                },
            };
        } finally {
            client.release();
        }
    }

    static async generateApiKey(merchantId: string) {
        const client = await pool.connect();
        try {
            const merchant = await MerchantRepository.findById(client, merchantId);
            if (!merchant) {
                throw new NotFoundError('Merchant not found');
            }

            const rawBytes = randomBytes(24);
            const rawKey = `sk_test_${rawBytes.toString('hex')}`;
            const keyHash = createHash('sha256').update(rawKey).digest('hex');
            const prefix = rawKey.slice(0, 14);

            await ApiKeyRepository.create(client, {
                merchantId,
                keyHash,
                prefix,
            });

            return { rawKey, prefix };
        } finally {
            client.release();
        }
    }

    static async revokeApiKey(merchantId: string, keyId: string) {
        const client = await pool.connect();
        try {
            const revoked = await ApiKeyRepository.revoke(client, keyId, merchantId);
            if (!revoked) {
                throw new NotFoundError('API key not found or already revoked');
            }
        } finally {
            client.release();
        }
    }

    static async listApiKeys(merchantId: string) {
        const client = await pool.connect();
        try {
            const keys = await ApiKeyRepository.findByMerchantId(client, merchantId);
            return keys.map((k) => ({
                id: k.id,
                prefix: k.prefix,
                createdAt: k.created_at,
                revokedAt: k.revoked_at,
                active: k.revoked_at === null,
            }));
        } finally {
            client.release();
        }
    }

    static async getDashboard(merchantId: string) {
        const client = await pool.connect();
        try {
            const merchant = await MerchantRepository.findById(client, merchantId);
            if (!merchant) {
                throw new NotFoundError('Merchant not found');
            }

            const account = await AccountRepository.findById(client, merchant.account_id);

            const paymentsResult = await client.query(
                `SELECT id, amount, currency, status, source, created_at
                 FROM payments
                 WHERE merchant_id = $1
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [merchant.account_id]
            );

            return {
                merchant: {
                    id: merchant.id,
                    email: merchant.email,
                    accountId: merchant.account_id,
                    createdAt: merchant.created_at,
                },
                account: account ? {
                    id: account.id,
                    balance: account.balance.toString(),
                    currency: account.currency,
                } : null,
                recentPayments: paymentsResult.rows,
            };
        } finally {
            client.release();
        }
    }
}
