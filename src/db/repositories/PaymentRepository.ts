import { PoolClient, QueryResult } from 'pg';

export interface Payment {
    id: string;
    merchantId: string;
    amount: number;
    currency: string;
    source: string;
    description: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    idempotencyKey: string;
    webhookUrl: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface PaymentRow {
    id: string;
    merchant_id: string;
    amount: number;
    currency: string;
    source: string;
    description: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    idempotency_key: string;
    webhook_url: string | null;
    failure_reason: string | null;
    created_at: Date;
    updated_at: Date;
}

function toPayment(row: PaymentRow): Payment {
    return {
        id: row.id,
        merchantId: row.merchant_id,
        amount: row.amount,
        currency: row.currency,
        source: row.source,
        description: row.description,
        status: row.status,
        idempotencyKey: row.idempotency_key,
        webhookUrl: row.webhook_url,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class PaymentRepository {
    static async create(
        client: PoolClient,
        body: {
            merchantId: string;
            amount: number;
            currency: string;
            source: string;
            description?: string;
            idempotencyKey?: string;
            webhookUrl?: string;
        }
    ): Promise<Payment> {
        const query = `
            INSERT INTO payments (merchant_id, amount, currency, source, description, idempotency_key, webhook_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [
            body.merchantId,
            body.amount,
            body.currency,
            body.source,
            body.description ?? 'API Payment',
            body.idempotencyKey ?? null,
            body.webhookUrl ?? null,
        ];

        const result: QueryResult<PaymentRow> = await client.query(query, values);
        const row = result.rows[0];
        if (!row) throw new Error('Failed to create payment — no row returned');
        return toPayment(row);
    }

    static async findById(client: PoolClient, id: string): Promise<Payment | null> {
        const query = `SELECT * FROM payments WHERE id = $1;`;
        const result: QueryResult<PaymentRow> = await client.query(query, [id]);
        return result.rows[0] ? toPayment(result.rows[0]) : null;
    }

    static async findByIdempotencyKey(client: PoolClient, key: string): Promise<Payment | null> {
        const query = `SELECT * FROM payments WHERE idempotency_key = $1;`;
        const result: QueryResult<PaymentRow> = await client.query(query, [key]);
        return result.rows[0] ? toPayment(result.rows[0]) : null;
    }

    static async updateStatus(
        client: PoolClient,
        id: string,
        status: 'PROCESSING' | 'SUCCESS' | 'FAILED',
        failureReason?: string
    ): Promise<Payment> {
        const query = `
            UPDATE payments
            SET status = $2, failure_reason = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING *;
        `;
        const result: QueryResult<PaymentRow> = await client.query(query, [id, status, failureReason ?? null]);
        const row = result.rows[0];
        if (!row) throw new Error(`Payment ${id} not found`);
        return toPayment(row);
    }
}
