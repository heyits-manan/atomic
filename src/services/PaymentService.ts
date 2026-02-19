import { pool } from '../config/db';
import { PaymentRepository, Payment } from '../db/repositories/PaymentRepository';
import { LedgerService } from './LedgerService';
import { paymentQueue } from '../queues/paymentQueue';
import { logger } from '../lib/logger';
import { NotFoundError } from '@lib/errors';

export class PaymentService {
    /**
     * Called by the Controller (API side).
     * Creates a PENDING payment record and enqueues it for background processing.
     */
    static async createAndQueue(data: {
        merchantId: string;
        amount: number;
        currency: string;
        source: string;
        description?: string;
        idempotencyKey?: string;
    }): Promise<Payment> {
        const client = await pool.connect();
        try {
            // 1. Persist the payment as PENDING
            const payment = await PaymentRepository.create(client, {
                merchantId: data.merchantId,
                amount: data.amount,
                currency: data.currency,
                source: data.source,
                description: data.description,
                idempotencyKey: data.idempotencyKey,
            });

            // 2. Add a job to the queue for async processing
            await paymentQueue.add('process-payment', { paymentId: payment.id }, {
                jobId: payment.id, // prevents duplicate jobs for the same payment
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
            });

            logger.info('Payment queued', { paymentId: payment.id, status: payment.status });

            return payment;
        } finally {
            client.release();
        }
    }

    static async getById(paymentId: string): Promise<Payment> {
        const client = await pool.connect();
        try {
            const payment = await PaymentRepository.findById(client, paymentId);
            if (!payment) {
                throw new NotFoundError(`Payment not found: ${paymentId}`);
            }
            return payment;
        } finally {
            client.release();
        }
    }


    /**
     * Called by the Worker (background side).
     * Marks payment as PROCESSING, performs the ledger transfer, then marks SUCCESS or FAILED.
     */
    static async fulfill(paymentId: string): Promise<Payment> {
        const client = await pool.connect();
        try {
            // 1. Mark as PROCESSING
            await PaymentRepository.updateStatus(client, paymentId, 'PROCESSING');

            // 2. Load the full payment record
            const payment = await PaymentRepository.findById(client, paymentId);
            if (!payment) throw new Error(`Payment ${paymentId} not found`);

            // 3. Find the World Account
            const worldAccountQuery = await client.query(
                'SELECT id FROM accounts WHERE allow_negative = true LIMIT 1'
            );
            if (worldAccountQuery.rows.length === 0) {
                throw new Error('System Error: World Account not found. Run seed script.');
            }
            const worldAccountId = worldAccountQuery.rows[0].id;

            // 4. Move money: World → Merchant (double-entry ledger)
            await LedgerService.transferFunds(
                worldAccountId,
                payment.merchantId,
                BigInt(payment.amount),
                payment.currency
            );

            // 5. Mark as SUCCESS
            const updated = await PaymentRepository.updateStatus(client, paymentId, 'SUCCESS');
            logger.info('Payment fulfilled', { paymentId, status: 'SUCCESS' });
            return updated;
        } catch (err) {
            // Mark as FAILED with the error reason
            const reason = err instanceof Error ? err.message : 'Unknown error';
            const failed = await PaymentRepository.updateStatus(client, paymentId, 'FAILED', reason);
            logger.error('Payment failed', { paymentId, reason });
            return failed;
        } finally {
            client.release();
        }
    }
}
