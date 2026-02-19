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
        -- Merchants table (dashboard users)
        CREATE TABLE merchants (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            account_id    UUID NOT NULL REFERENCES accounts(id),
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- API keys table (sk_test_... keys stored as hashes)
        CREATE TABLE api_keys (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id   UUID NOT NULL REFERENCES merchants(id),
            key_hash      VARCHAR(64) NOT NULL,
            prefix        VARCHAR(20) NOT NULL,
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            revoked_at    TIMESTAMP WITH TIME ZONE
        );

        -- Fast lookup by hash for auth (only active keys)
        CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

        -- Fast lookup by merchant for listing keys
        CREATE INDEX idx_api_keys_merchant ON api_keys(merchant_id);
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS api_keys;
        DROP TABLE IF EXISTS merchants;
    `);
};
