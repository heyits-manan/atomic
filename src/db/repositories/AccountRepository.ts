import { PoolClient, QueryResult } from 'pg';

export interface Account {
    id: string;
    name: string;
    balance: bigint;
    currency: string;
    allow_negative: boolean;
    created_at: Date;
}

interface AccountRow {
    id: string;
    name: string;
    balance: string; // BIGINT comes as string from PG
    currency: string;
    allow_negative: boolean;
    created_at: Date;
}

function toAccount(row: AccountRow): Account {
    return {
        ...row,
        balance: BigInt(row.balance),
    };
}

export class AccountRepository {
    static async create(
        client: PoolClient,
        { name, currency, allowNegative }: { name: string; currency: string; allowNegative: boolean }
    ): Promise<Account> {
        const query = `
      INSERT INTO accounts (name, currency, allow_negative, balance)
      VALUES ($1, $2, $3, 0)
      RETURNING *;
    `;
        const values = [name, currency, allowNegative];

        const result: QueryResult<AccountRow> = await client.query(query, values);
        const row = result.rows[0];
        if (!row) {
            throw new Error('Failed to create account — no row returned');
        }
        return toAccount(row);
    }

    static async findById(
        client: PoolClient,
        id: string,
        lock: boolean = false
    ): Promise<Account | null> {
        const query = `
      SELECT * FROM accounts
      WHERE id = $1
      ${lock ? 'FOR UPDATE' : ''};
    `;

        const result: QueryResult<AccountRow> = await client.query(query, [id]);
        return result.rows[0] ? toAccount(result.rows[0]) : null;
    }

    static async updateBalance(
        client: PoolClient,
        id: string,
        amount: bigint
    ): Promise<void> {
        const query = `
      UPDATE accounts
      SET balance = balance + $2
      WHERE id = $1;
    `;
        await client.query(query, [id, amount.toString()]);
    }
}
