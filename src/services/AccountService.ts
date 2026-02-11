import { pool } from '../config/db';
import { AccountRepository } from '../db/repositories/AccountRepository';
import { NotFoundError } from '../lib/errors';

export class AccountService {
    /**
     * Create a new user account.
     * Default: allowNegative = false (standard users can't overdraft).
     */
    static async createAccount(data: { name: string; currency: string }) {
        const client = await pool.connect();
        try {
            const account = await AccountRepository.create(client, {
                name: data.name,
                currency: data.currency,
                allowNegative: false,
            });
            return account;
        } finally {
            client.release();
        }
    }

    /**
     * Get an account by ID.
     * Throws NotFoundError if the account doesn't exist.
     */
    static async getAccount(id: string) {
        const client = await pool.connect();
        try {
            const account = await AccountRepository.findById(client, id);
            if (!account) {
                throw new NotFoundError(`Account not found: ${id}`);
            }
            return account;
        } finally {
            client.release();
        }
    }
}
