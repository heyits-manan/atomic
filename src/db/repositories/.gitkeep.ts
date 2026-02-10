/**
 * Repositories — Data Access Layer using raw SQL via the `pg` pool.
 *
 * Example:
 *   import { query } from "../../config/db";
 *   export async function findPaymentById(id: string) {
 *     const result = await query("SELECT * FROM payments WHERE id = $1", [id]);
 *     return result.rows[0];
 *   }
 */
