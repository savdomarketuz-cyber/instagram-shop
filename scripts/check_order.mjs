import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkOrder() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // The order ID in the user's screenshot is 1000000000000030
    const query = `SELECT * FROM orders WHERE id = '1000000000000030' LIMIT 1;`;

    const res = await client.query(query);
    console.log("Order result:", res.rows);
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

checkOrder();
