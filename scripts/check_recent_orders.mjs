import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRecentOrders() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check the last 3 orders
    const query = `SELECT id, user_phone, total, created_at FROM orders ORDER BY created_at DESC LIMIT 3;`;

    const res = await client.query(query);
    console.log("Recent Orders:", res.rows);
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

checkRecentOrders();
