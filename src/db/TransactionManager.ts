import { PoolClient } from 'pg';
import { pool } from '../config/db';
import { logger } from '../lib/logger';

/**
 * ACID Transaction Manager
 *
 * Wraps a callback in BEGIN / COMMIT / ROLLBACK.
 * The callback receives a single PoolClient that is already inside a transaction.
 *
 * Usage:
 *   const result = await TransactionManager.run(async (client) => {
 *     // all queries here share the same transaction
 *     await AccountRepository.updateBalance(client, id, amount);
 *     return something;
 *   });
 */
export class TransactionManager {
    static async run<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            logger.debug('Transaction BEGIN');

            const result = await callback(client);

            await client.query('COMMIT');
            logger.debug('Transaction COMMIT');

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.warn('Transaction ROLLBACK', {
                error: error instanceof Error ? error.message : String(error),
            });

            throw error;
        } finally {
            client.release();
        }
    }
}
