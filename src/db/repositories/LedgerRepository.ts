import { PoolClient, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type EntryType = 'DEBIT' | 'CREDIT';

/**
 * Shape of a ledger_entries row.
 */
export interface LedgerEntry {
    id: string;
    transaction_id: string;
    account_id: string;
    amount: bigint;
    type: EntryType;
    created_at: Date;
}

interface LedgerEntryRow {
    id: string;
    transaction_id: string;
    account_id: string;
    amount: string;
    type: EntryType;
    created_at: Date;
}

function toLedgerEntry(row: LedgerEntryRow): LedgerEntry {
    return {
        ...row,
        amount: BigInt(row.amount),
    };
}

export class LedgerRepository {
    /**
     * Inserts a single ledger entry (either DEBIT or CREDIT).
     */
    static async createEntry(
        client: PoolClient,
        {
            transactionId,
            accountId,
            amount,
            type,
        }: {
            transactionId: string;
            accountId: string;
            amount: bigint;
            type: EntryType;
        }
    ): Promise<LedgerEntry> {
        const query = `
      INSERT INTO ledger_entries (transaction_id, account_id, amount, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
        const values = [transactionId, accountId, amount.toString(), type];

        const result: QueryResult<LedgerEntryRow> = await client.query(query, values);
        const row = result.rows[0];
        if (!row) {
            throw new Error('Failed to create ledger entry — no row returned');
        }
        return toLedgerEntry(row);
    }

    /**
     * Inserts a matched DEBIT + CREDIT pair atomically.
     * Returns the generated transactionId so the caller can reference it.
     *
     * Double-Entry Rule:
     *   DEBIT  = money leaves the source account
     *   CREDIT = money enters the destination account
     */
    static async createPair(
        client: PoolClient,
        {
            debitAccountId,
            creditAccountId,
            amount,
        }: {
            debitAccountId: string;
            creditAccountId: string;
            amount: bigint;
        }
    ): Promise<{ transactionId: string; debit: LedgerEntry; credit: LedgerEntry }> {
        const transactionId = uuidv4();

        const debit = await LedgerRepository.createEntry(client, {
            transactionId,
            accountId: debitAccountId,
            amount,
            type: 'DEBIT',
        });

        const credit = await LedgerRepository.createEntry(client, {
            transactionId,
            accountId: creditAccountId,
            amount,
            type: 'CREDIT',
        });

        return { transactionId, debit, credit };
    }
}
