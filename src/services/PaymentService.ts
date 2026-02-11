import { pool } from '../config/db';
import { LedgerService } from './LedgerService';
import { logger } from '../lib/logger';

export class PaymentService {
    /**
     * Simulates a card payment.
     *
     * In a real system, this would first call a Bank/Card API (Visa, Mastercard)
     * to authorize the charge. Here, we simply move money from
     * the World Account → Merchant Account via the ledger.
     */
    static async processPayment(data: {
        merchantId: string;
        amount: number; // in smallest unit (cents/paise)
        currency: string;
        description: string;
        token: string; // Mock card token (e.g. tok_visa)
    }) {
        const client = await pool.connect();
        try {
            // 1. Find the World Account (the system account that can go negative)
            const worldAccountQuery = await client.query(
                'SELECT id FROM accounts WHERE allow_negative = true LIMIT 1'
            );

            if (worldAccountQuery.rows.length === 0) {
                throw new Error('System Error: World Account not found. Run seed script.');
            }

            const worldAccountId = worldAccountQuery.rows[0].id;

            logger.info('Processing payment', {
                token: data.token,
                amount: data.amount,
                currency: data.currency,
                merchantId: data.merchantId,
            });

            // 2. Move money: World → Merchant (via the double-entry ledger)
            const transaction = await LedgerService.transferFunds(
                worldAccountId,
                data.merchantId,
                BigInt(data.amount),
                data.currency
            );

            // 3. Return a Stripe-like response object
            return {
                id: `pay_${transaction.transactionId.replace(/-/g, '').slice(0, 24)}`,
                object: 'payment_intent',
                amount: data.amount,
                currency: data.currency,
                status: 'succeeded',
                description: data.description,
                source: data.token,
                merchant_id: data.merchantId,
                transaction_id: transaction.transactionId,
                created: new Date().toISOString(),
            };
        } finally {
            client.release();
        }
    }
}
