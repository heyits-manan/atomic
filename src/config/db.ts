import { Pool, PoolConfig } from "pg";
import { env } from "./env";
import { logger } from "../lib/logger";

const poolConfig: PoolConfig = {
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

pool.on("connect", () => {
    logger.debug("New client connected to PostgreSQL pool");
});

pool.on("error", (err: Error) => {
    logger.error("Unexpected error on idle PostgreSQL client", { error: err.message });
    process.exit(-1);
});

/**
 * Execute a parameterized query against the pool.
 */
export async function query<T extends Record<string, unknown>>(
    text: string,
    params?: unknown[]
): Promise<import("pg").QueryResult<T>> {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", { text, duration: `${duration}ms`, rows: result.rowCount });
    return result;
}

/**
 * Get a client from the pool for transactions.
 */
export async function getClient() {
    const client = await pool.connect();
    return client;
}

/**
 * Gracefully close the database pool.
 */
export async function closePool(): Promise<void> {
    logger.info("Closing PostgreSQL connection pool...");
    await pool.end();
    logger.info("PostgreSQL pool closed.");
}
