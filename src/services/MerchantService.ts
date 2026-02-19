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
    /**
     * Register a new merchant.
     * Creates an account row, then a merchant row linked to it.
     */
    static async register(email: string, password: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if email already exists
            const existing = await MerchantRepository.findByEmail(client, email);
            if (existing) {
                throw new ConflictError('Email already registered');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            // Create an account for the merchant (used for balances)
            const account = await AccountRepository.create(client, {
                name: email,
                currency: 'USD',
                allowNegative: false,
            });

            // Create the merchant
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

    /**
     * Login a merchant. Returns a JWT token.
     */
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

    /**
     * Generate a new API key for a merchant.
     * Returns the raw key ONCE — only the hash is stored.
     */
    static async generateApiKey(merchantId: string) {
        const client = await pool.connect();
        try {
            // Verify merchant exists
            const merchant = await MerchantRepository.findById(client, merchantId);
            if (!merchant) {
                throw new NotFoundError('Merchant not found');
            }

            // Generate raw key: sk_test_ + 48 hex chars
            const rawBytes = randomBytes(24);
            const rawKey = `sk_test_${rawBytes.toString('hex')}`;

            // SHA-256 hash for storage
            const keyHash = createHash('sha256').update(rawKey).digest('hex');

            // Prefix for display (first 14 chars)
            const prefix = rawKey.slice(0, 14);

            await ApiKeyRepository.create(client, {
                merchantId,
                keyHash,
                prefix,
            });

            return {
                rawKey,  // Show this once to the merchant
                prefix,
            };
        } finally {
            client.release();
        }
    }

    /**
     * Revoke an API key.
     */
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

    /**
     * List all API keys for a merchant.
     */
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

    /**
     * Get dashboard data: merchant info, account balance, recent payments.
     */
    static async getDashboard(merchantId: string) {
        const client = await pool.connect();
        try {
            const merchant = await MerchantRepository.findById(client, merchantId);
            if (!merchant) {
                throw new NotFoundError('Merchant not found');
            }

            const account = await AccountRepository.findById(client, merchant.account_id);

            // Get recent payments for this merchant
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
