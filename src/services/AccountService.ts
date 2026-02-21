import { pool } from '../config/db';
import { AccountRepository } from '../db/repositories/AccountRepository';
import { NotFoundError } from '../lib/errors';

export class AccountService {
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
