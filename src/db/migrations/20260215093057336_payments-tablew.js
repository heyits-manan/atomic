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
        CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who and how much
    merchant_id    UUID NOT NULL REFERENCES accounts(id),
    amount         INTEGER NOT NULL,
    currency       VARCHAR(3) NOT NULL,
    source         VARCHAR(50) NOT NULL,        -- tok_visa, tok_mastercard
    description    TEXT DEFAULT 'API Payment',
    
    -- State machine: PENDING → PROCESSING → SUCCESS / FAILED
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Link to idempotency (prevents duplicate jobs)
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    
    -- Where to notify the merchant when done
    webhook_url    TEXT,
    
    -- Error tracking (why did it fail?)
    failure_reason TEXT,
    
    -- Timestamps
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);`)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`DROP TABLE payments;`);
};
