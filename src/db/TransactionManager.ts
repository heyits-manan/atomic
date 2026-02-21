import { PoolClient } from 'pg';
import { pool } from '../config/db';
import { logger } from '../lib/logger';

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
