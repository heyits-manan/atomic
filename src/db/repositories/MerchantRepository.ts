import { PoolClient, QueryResult } from 'pg';

export interface Merchant {
    id: string;
    email: string;
    password_hash: string;
    account_id: string;
    created_at: Date;
}

export class MerchantRepository {
    static async create(
        client: PoolClient,
        { email, passwordHash, accountId }: { email: string; passwordHash: string; accountId: string }
    ): Promise<Merchant> {
        const query = `
            INSERT INTO merchants (email, password_hash, account_id)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result: QueryResult<Merchant> = await client.query(query, [email, passwordHash, accountId]);
        const row = result.rows[0];
        if (!row) {
            throw new Error('Failed to create merchant — no row returned');
        }
        return row;
    }

    static async findByEmail(client: PoolClient, email: string): Promise<Merchant | null> {
        const query = `SELECT * FROM merchants WHERE email = $1;`;
        const result: QueryResult<Merchant> = await client.query(query, [email]);
        return result.rows[0] ?? null;
    }

    static async findById(client: PoolClient, id: string): Promise<Merchant | null> {
        const query = `SELECT * FROM merchants WHERE id = $1;`;
        const result: QueryResult<Merchant> = await client.query(query, [id]);
        return result.rows[0] ?? null;
    }
}
