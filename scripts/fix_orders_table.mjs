import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixOrdersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database successfully.");

    // Add missing columns to the orders table
    const query = `
      ALTER TABLE public.orders 
      ADD COLUMN IF NOT EXISTS payment_method text,
      ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
      
      -- Optional: Notify PostgREST to reload schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(query);
    console.log("Successfully added 'payment_method' and 'updated_at' columns to 'orders' table.");
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

fixOrdersTable();
