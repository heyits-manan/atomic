import { pool } from '../config/db';
import { AccountRepository } from '../db/repositories/AccountRepository';
import { LedgerService } from '../services/LedgerService';
import { InsufficientBalanceError } from '../lib/errors';

/**
 * Integration tests for the LedgerService.
 *
 * These tests run against a REAL Postgres database.
 * Prerequisite: `docker compose up -d` && `npm run migrate:up`
 */
describe('LedgerService', () => {
    let userAccountId: string;
    let worldAccountId: string;

    beforeAll(async () => {
        const client = await pool.connect();
        try {
            // Create a "World" account that can go negative (like a central bank)
            const world = await AccountRepository.create(client, {
                name: 'Test World Bank',
                currency: 'USD',
                allowNegative: true,
            });
            worldAccountId = world.id;

            // Create a regular user account
            const user = await AccountRepository.create(client, {
                name: 'Test User Alice',
                currency: 'USD',
                allowNegative: false,
            });
            userAccountId = user.id;

            // Fund the user: World → User (World goes negative, User gains 1000 cents = $10)
            await AccountRepository.updateBalance(client, worldAccountId, -1000n);
            await AccountRepository.updateBalance(client, userAccountId, 1000n);
        } finally {
            client.release();
        }
    });

    afterAll(async () => {
        // Clean up test data
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM ledger_entries WHERE account_id IN ($1, $2)', [
                userAccountId,
                worldAccountId,
            ]);
            await client.query('DELETE FROM accounts WHERE id IN ($1, $2)', [
                userAccountId,
                worldAccountId,
            ]);
        } finally {
            client.release();
            await pool.end();
        }
    });

    it('should successfully transfer funds between two accounts', async () => {
        const result = await LedgerService.transferFunds(
            userAccountId,
            worldAccountId,
            500n, // $5.00
            'USD'
        );

        expect(result.transactionId).toBeDefined();
        expect(result.fromAccountId).toBe(userAccountId);
        expect(result.toAccountId).toBe(worldAccountId);
        expect(result.amount).toBe(500n);

        // Verify balances were updated
        const client = await pool.connect();
        try {
            const user = await AccountRepository.findById(client, userAccountId);
            const world = await AccountRepository.findById(client, worldAccountId);

            expect(user!.balance).toBe(500n);   // 1000 - 500
            expect(world!.balance).toBe(-500n); // -1000 + 500
        } finally {
            client.release();
        }
    });

    it('should REJECT a transfer when user has insufficient balance', async () => {
        // User currently has 500 cents from the previous test.
        // Attempting to transfer 2000 cents ($20) should fail.
        await expect(
            LedgerService.transferFunds(
                userAccountId,
                worldAccountId,
                2000n,
                'USD'
            )
        ).rejects.toThrow(InsufficientBalanceError);

        // Verify balances did NOT change (ROLLBACK worked)
        const client = await pool.connect();
        try {
            const user = await AccountRepository.findById(client, userAccountId);
            expect(user!.balance).toBe(500n); // Still 500, nothing changed
        } finally {
            client.release();
        }
    });

    it('should reject a transfer with 0 or negative amount', async () => {
        await expect(
            LedgerService.transferFunds(userAccountId, worldAccountId, 0n, 'USD')
        ).rejects.toThrow('Transfer amount must be positive');

        await expect(
            LedgerService.transferFunds(userAccountId, worldAccountId, -100n, 'USD')
        ).rejects.toThrow('Transfer amount must be positive');
    });
});
