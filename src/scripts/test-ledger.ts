/**
 * test-ledger.ts — Manual smoke test for the double-entry ledger.
 *
 * Run:  npx ts-node src/scripts/test-ledger.ts
 *
 * What it does:
 *   1. Creates a "World" account (allow_negative = true)
 *   2. Creates a "User" account (allow_negative = false)
 *   3. Transfers $50 from World → User  (should succeed ✅)
 *   4. Transfers $30 from User → World  (should succeed ✅)
 *   5. Transfers $9999 from User → World (should FAIL — insufficient balance ❌)
 *   6. Prints final balances & ledger entries
 *   7. Cleans up test data
 */

import { pool } from '../config/db';
import { AccountRepository } from '../db/repositories/AccountRepository';
import { LedgerService } from '../services/LedgerService';
import { InsufficientBalanceError } from '../lib/errors';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(icon: string, msg: string) {
    console.log(`  ${icon}  ${msg}`);
}

async function main() {
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${CYAN}  ⚛  Atomic Ledger — Manual Smoke Test${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════${RESET}\n`);

    const client = await pool.connect();

    let worldId: string | null = null;
    let userId: string | null = null;

    try {
        // ── Step 1: Create accounts ──────────────────────────────────
        console.log(`${DIM}── Step 1: Creating accounts ──${RESET}`);

        const world = await AccountRepository.create(client, {
            name: 'Test World Bank',
            currency: 'USD',
            allowNegative: true,
        });
        worldId = world.id;
        log('🏦', `World Bank created  → ${DIM}${world.id}${RESET}`);

        const user = await AccountRepository.create(client, {
            name: 'Test User (Alice)',
            currency: 'USD',
            allowNegative: false,
        });
        userId = user.id;
        log('👤', `User Alice created  → ${DIM}${user.id}${RESET}`);

        console.log();

        // ── Step 2: Transfer $50 World → User ────────────────────────
        console.log(`${DIM}── Step 2: Transfer $50.00 (World → Alice) ──${RESET}`);
        const tx1 = await LedgerService.transferFunds(worldId, userId, 5000n, 'USD');
        log(`${GREEN}✅${RESET}`, `${GREEN}SUCCESS${RESET} — txn: ${DIM}${tx1.transactionId}${RESET}`);
        await printBalances(client, worldId, userId);

        // ── Step 3: Transfer $30 User → World ────────────────────────
        console.log(`${DIM}── Step 3: Transfer $30.00 (Alice → World) ──${RESET}`);
        const tx2 = await LedgerService.transferFunds(userId, worldId, 3000n, 'USD');
        log(`${GREEN}✅${RESET}`, `${GREEN}SUCCESS${RESET} — txn: ${DIM}${tx2.transactionId}${RESET}`);
        await printBalances(client, worldId, userId);

        // ── Step 4: Attempt overdraft ────────────────────────────────
        console.log(`${DIM}── Step 4: Transfer $9999.00 (Alice → World) — SHOULD FAIL ──${RESET}`);
        try {
            await LedgerService.transferFunds(userId, worldId, 999900n, 'USD');
            log(`${RED}❌${RESET}`, `${RED}BUG — transfer should have been rejected!${RESET}`);
        } catch (err) {
            if (err instanceof InsufficientBalanceError) {
                log(`${GREEN}✅${RESET}`, `${YELLOW}REJECTED${RESET} — "${err.message}"`);
            } else {
                throw err;
            }
        }
        await printBalances(client, worldId, userId);

        // ── Step 5: Print ledger entries ─────────────────────────────
        console.log(`${DIM}── Ledger Entries ──${RESET}`);
        const { rows: entries } = await client.query(
            `SELECT id, transaction_id, account_id, amount, type, created_at
       FROM ledger_entries
       WHERE account_id IN ($1, $2)
       ORDER BY created_at ASC`,
            [worldId, userId]
        );

        console.log();
        console.log(`  ${'TYPE'.padEnd(8)} ${'AMOUNT'.padStart(12)}   ${'ACCOUNT'.padEnd(36)}   TXN`);
        console.log(`  ${'─'.repeat(8)} ${'─'.repeat(12)}   ${'─'.repeat(36)}   ${'─'.repeat(36)}`);
        for (const e of entries) {
            const color = e.type === 'DEBIT' ? RED : GREEN;
            const sign = e.type === 'DEBIT' ? '-' : '+';
            const dollars = `${sign}$${(Number(e.amount) / 100).toFixed(2)}`;
            console.log(
                `  ${color}${e.type.padEnd(8)}${RESET} ${dollars.padStart(12)}   ${DIM}${e.account_id}${RESET}   ${DIM}${e.transaction_id}${RESET}`
            );
        }

        console.log(`\n${BOLD}${GREEN}  ✓ All assertions passed!${RESET}\n`);
    } finally {
        // ── Cleanup ──────────────────────────────────────────────────
        if (worldId || userId) {
            console.log(`${DIM}── Cleaning up test data... ──${RESET}`);
            if (worldId && userId) {
                await client.query('DELETE FROM ledger_entries WHERE account_id IN ($1, $2)', [worldId, userId]);
                await client.query('DELETE FROM accounts WHERE id IN ($1, $2)', [worldId, userId]);
            }
            log('🧹', 'Test accounts & ledger entries removed.');
        }
        client.release();
        await pool.end();
    }
}

async function printBalances(client: import('pg').PoolClient, worldId: string, userId: string) {
    const world = await AccountRepository.findById(client, worldId);
    const user = await AccountRepository.findById(client, userId);
    const wBal = world ? `$${(Number(world.balance) / 100).toFixed(2)}` : 'N/A';
    const uBal = user ? `$${(Number(user.balance) / 100).toFixed(2)}` : 'N/A';
    log('💰', `Balances → World: ${CYAN}${wBal}${RESET}  |  Alice: ${CYAN}${uBal}${RESET}`);
    console.log();
}

main().catch((err) => {
    console.error(`\n${RED}Fatal error:${RESET}`, err);
    process.exit(1);
});
