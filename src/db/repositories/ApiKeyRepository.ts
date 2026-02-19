import { PoolClient, QueryResult } from 'pg';

export interface ApiKey {
    id: string;
    merchant_id: string;
    key_hash: string;
    prefix: string;
    created_at: Date;
    revoked_at: Date | null;
}

/**
 * Row returned when looking up an active key by hash (includes merchant info).
 */
export interface ApiKeyWithMerchant {
    id: string;
    merchant_id: string;
    account_id: string;
}

export class ApiKeyRepository {
    /**
     * Create a new API key record.
     */
    static async create(
        client: PoolClient,
        { merchantId, keyHash, prefix }: { merchantId: string; keyHash: string; prefix: string }
    ): Promise<ApiKey> {
        const query = `
            INSERT INTO api_keys (merchant_id, key_hash, prefix)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result: QueryResult<ApiKey> = await client.query(query, [merchantId, keyHash, prefix]);
        const row = result.rows[0];
        if (!row) {
            throw new Error('Failed to create API key — no row returned');
        }
        return row;
    }

    /**
     * Find an active (non-revoked) API key by its SHA-256 hash.
     * Joins with merchants to get the account_id for downstream use.
     */
    static async findActiveByHash(
        client: PoolClient,
        keyHash: string
    ): Promise<ApiKeyWithMerchant | null> {
        const query = `
            SELECT ak.id, ak.merchant_id, m.account_id
            FROM api_keys ak
            JOIN merchants m ON m.id = ak.merchant_id
            WHERE ak.key_hash = $1 AND ak.revoked_at IS NULL;
        `;
        const result: QueryResult<ApiKeyWithMerchant> = await client.query(query, [keyHash]);
        return result.rows[0] ?? null;
    }

    /**
     * List all API keys for a merchant (active and revoked).
     */
    static async findByMerchantId(client: PoolClient, merchantId: string): Promise<ApiKey[]> {
        const query = `
            SELECT id, merchant_id, prefix, created_at, revoked_at
            FROM api_keys
            WHERE merchant_id = $1
            ORDER BY created_at DESC;
        `;
        const result: QueryResult<ApiKey> = await client.query(query, [merchantId]);
        return result.rows;
    }

    /**
     * Revoke an API key (set revoked_at to now).
     * Returns true if the key was found and revoked.
     */
    static async revoke(client: PoolClient, keyId: string, merchantId: string): Promise<boolean> {
        const query = `
            UPDATE api_keys
            SET revoked_at = NOW()
            WHERE id = $1 AND merchant_id = $2 AND revoked_at IS NULL;
        `;
        const result = await client.query(query, [keyId, merchantId]);
        return (result.rowCount ?? 0) > 0;
    }
}
