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
            // Lock in consistent order (by ID) to prevent deadlocks
            const [firstId, secondId] =
                fromAccountId < toAccountId
                    ? [fromAccountId, toAccountId]
                    : [toAccountId, fromAccountId];

            await AccountRepository.findById(client, firstId, true);
            await AccountRepository.findById(client, secondId, true);

            const fromAccount = await AccountRepository.findById(client, fromAccountId);
            const toAccount = await AccountRepository.findById(client, toAccountId);

            if (!fromAccount) {
                throw new Error(`Source account not found: ${fromAccountId}`);
            }
            if (!toAccount) {
                throw new Error(`Destination account not found: ${toAccountId}`);
            }

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

            if (!fromAccount.allow_negative && fromAccount.balance < amount) {
                throw new InsufficientBalanceError(
                    `Insufficient balance: account ${fromAccountId} has ${fromAccount.balance}, needs ${amount}`
                );
            }

            await AccountRepository.updateBalance(client, fromAccountId, -amount);
            await AccountRepository.updateBalance(client, toAccountId, amount);

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
