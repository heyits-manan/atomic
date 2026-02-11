import { PoolClient, QueryResult } from 'pg';

/**
 * Shape of an Account row from the database.
 * `balance` is stored as BIGINT in PG (comes back as string), parsed to bigint here.
 */
export interface Account {
    id: string;
    name: string;
    balance: bigint;
    currency: string;
    allow_negative: boolean;
    created_at: Date;
}

/**
 * Raw row from PG — balance comes as a string because BIGINT > Number.MAX_SAFE_INTEGER.
 */
interface AccountRow {
    id: string;
    name: string;
    balance: string;
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
    /**
     * Creates a new account (e.g., for a new user).
     */
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

    /**
     * Finds an account by ID.
     * Pass `lock: true` to run SELECT ... FOR UPDATE — this locks the row
     * so no other transaction can touch it until we COMMIT or ROLLBACK.
     */
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

    /**
     * Atomically adjusts the balance by the given amount.
     * Positive amount = add funds, negative amount = subtract funds.
     *
     * NOTE: This is "dumb" storage — the Service layer decides whether the
     * transfer is allowed. This method just executes it.
     */
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
