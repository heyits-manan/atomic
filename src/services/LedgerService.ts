import { AccountRepository } from '../db/repositories/AccountRepository';
import { LedgerRepository } from '../db/repositories/LedgerRepository';
import { TransactionManager } from '../db/TransactionManager';
import { InsufficientBalanceError, CurrencyMismatchError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface TransferResult {
    transactionId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: bigint;
    currency: string;
}

export class LedgerService {
    /**
     * Transfers funds between two accounts using double-entry bookkeeping.
     *
     * This method is fully ACID:
     * 1. Locks both rows with SELECT ... FOR UPDATE (prevents double-spending)
     * 2. Validates currencies match
     * 3. Checks the source has sufficient balance (unless allow_negative is true)
     * 4. Updates both account balances atomically
     * 5. Records a matched DEBIT/CREDIT ledger pair
     *
     * If anything fails, the entire transaction is rolled back.
     */
    static async transferFunds(
        fromAccountId: string,
        toAccountId: string,
        amount: bigint,
        currency: string
    ): Promise<TransferResult> {
        if (amount <= 0n) {
            throw new Error('Transfer amount must be positive');
        }

        return TransactionManager.run(async (client) => {
            // --- Step 1: Lock both accounts (SELECT ... FOR UPDATE) ---
            // Always lock in a consistent order (by ID) to prevent deadlocks
            const [firstId, secondId] =
                fromAccountId < toAccountId
                    ? [fromAccountId, toAccountId]
                    : [toAccountId, fromAccountId];

            await AccountRepository.findById(client, firstId, true);
            await AccountRepository.findById(client, secondId, true);

            // Re-fetch in logical order after locking
            const fromAccount = await AccountRepository.findById(client, fromAccountId);
            const toAccount = await AccountRepository.findById(client, toAccountId);

            // --- Step 2: Validate both accounts exist ---
            if (!fromAccount) {
                throw new Error(`Source account not found: ${fromAccountId}`);
            }
            if (!toAccount) {
                throw new Error(`Destination account not found: ${toAccountId}`);
            }

            // --- Step 3: Validate currencies ---
            if (fromAccount.currency !== currency) {
                throw new CurrencyMismatchError(
                    `Source account currency (${fromAccount.currency}) does not match requested currency (${currency})`
                );
            }
            if (toAccount.currency !== currency) {
                throw new CurrencyMismatchError(
                    `Destination account currency (${toAccount.currency}) does not match requested currency (${currency})`
                );
            }

            // --- Step 4: Check balance (business rule) ---
            if (!fromAccount.allow_negative && fromAccount.balance < amount) {
                throw new InsufficientBalanceError(
                    `Insufficient balance: account ${fromAccountId} has ${fromAccount.balance}, needs ${amount}`
                );
            }

            // --- Step 5: Update balances ---
            await AccountRepository.updateBalance(client, fromAccountId, -amount);
            await AccountRepository.updateBalance(client, toAccountId, amount);

            // --- Step 6: Record the double-entry ledger pair ---
            const { transactionId } = await LedgerRepository.createPair(client, {
                debitAccountId: fromAccountId,
                creditAccountId: toAccountId,
                amount,
            });

            logger.info('Transfer completed', {
                transactionId,
                from: fromAccountId,
                to: toAccountId,
                amount: amount.toString(),
                currency,
            });

            return {
                transactionId,
                fromAccountId,
                toAccountId,
                amount,
                currency,
            };
        });
    }
}
