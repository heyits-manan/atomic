
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM accounts WHERE name = 'World Bank'");

        if (res.rows.length === 0) {
            console.log("Creating World Bank Account...");
            await client.query(`
        INSERT INTO accounts (name, balance, currency, allow_negative)
        VALUES ('World Bank', 0, 'USD', true)
      `);
            console.log("✅ World Bank created!");
        } else {
            console.log("ℹ️ World Bank already exists.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end(); // Close connection
    }
}

seed();