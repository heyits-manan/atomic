
import { PoolClient } from "pg";


export interface IdempotencyRecord {
    key: string;
    method: string;
    path: string;
    requestBodyHash: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    statusCode: number | null;
    responseBody: string | null;
    createdAt: Date;
    expiresAt: Date;
}

export class IdempotencyRepository {
    static async findByKey(client: PoolClient, key: string): Promise<IdempotencyRecord | null> {
        const query = `SELECT * FROM idempotency_keys WHERE key = $1`;
        const result = await client.query(query, [key]);
        return result.rows[0] || null;
    }

    static async create(client: PoolClient, body: { key: string, method: string, path: string, requestBodyHash: string }): Promise<IdempotencyRecord> {

        const query = `INSERT INTO idempotency_keys (key, method, path, request_body_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING RETURNING *`;
        const values = [body.key, body.method, body.path, body.requestBodyHash];
        const result = await client.query(query, values);

        return result.rows[0] || null;
    }

    static async deleteExpired(client: PoolClient): Promise<number | null> {
        const query = `DELETE FROM idempotency_keys WHERE expires_at < NOW()`;
        const result = await client.query(query);
        return result.rowCount;
    }

    static async update(client: PoolClient, body: { key: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED', statusCode: number | null, responseBody: string | null }): Promise<IdempotencyRecord> {
        const query = `UPDATE idempotency_keys SET status = $2, status_code = $3, response_body = $4 WHERE key = $1 RETURNING *`;
        const values = [body.key, body.status, body.statusCode, body.responseBody];
        const result = await client.query(query, values);
        return result.rows[0];
    }
}
