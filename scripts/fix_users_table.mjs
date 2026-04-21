import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixUsersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database successfully.");

    // Add missing columns if they don't exist
    const query = `
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS banned_until timestamp with time zone,
      ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    `;

    await client.query(query);
    console.log("Successfully added 'banned_until' and 'deleted_at' columns to 'users' table.");
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

fixUsersTable();
