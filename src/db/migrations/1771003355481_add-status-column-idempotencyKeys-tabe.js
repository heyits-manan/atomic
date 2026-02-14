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
            ALTER TABLE idempotency_keys
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS';
        
    ALTER TABLE idempotency_keys
        ALTER COLUMN response_body DROP NOT NULL,
        ALTER COLUMN status_code DROP NOT NULL;
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE idempotency_keys
        DROP COLUMN status;
        
        ALTER TABLE idempotency_keys
        ALTER COLUMN response_body SET NOT NULL,
        ALTER COLUMN status_code SET NOT NULL;
    `)
};
