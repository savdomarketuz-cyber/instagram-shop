import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixRPC() {
  // Use connectionString from environment variable
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database successfully.");

    // Drop the specific old function that uses numeric[] for p_coords
    // The new one uses jsonb
    const query = `
      DROP FUNCTION IF EXISTS public.place_order(
        text, 
        jsonb, 
        text, 
        numeric[], 
        text, 
        text, 
        numeric
      );
    `;

    await client.query(query);
    console.log("Successfully dropped the overloaded place_order function with numeric[].");
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

fixRPC();
