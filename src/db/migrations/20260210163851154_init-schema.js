/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    -- 1. Enable UUID extension (Critical for generating IDs)
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 2. Accounts Table
    CREATE TABLE accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        balance BIGINT NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        allow_negative BOOLEAN DEFAULT FALSE, -- Only true for the "World" account
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 3. Payment Intents
    CREATE TABLE payment_intents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount BIGINT NOT NULL,
        currency VARCHAR(3) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('REQUIRES_PAYMENT_METHOD', 'PROCESSING', 'SUCCEEDED', 'FAILED')),
        idempotency_key VARCHAR(255) UNIQUE, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 4. Ledger Entries (Double Entry)
    CREATE TABLE ledger_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transaction_id UUID NOT NULL, 
        account_id UUID REFERENCES accounts(id) NOT NULL,
        amount BIGINT NOT NULL,
        type VARCHAR(10) CHECK (type IN ('DEBIT', 'CREDIT')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        
    );

  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE ledger_entries;
    DROP TABLE payment_intents;
    DROP TABLE accounts;
  `);
};
