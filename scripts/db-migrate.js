const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.slmbethqqqugnktxwzdz:!f3$DRcmZT!aU@@@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // Add cost_price
    try {
      await client.query('ALTER TABLE products ADD COLUMN cost_price numeric DEFAULT 0');
      console.log('Added cost_price column to products table.');
    } catch (e) {
      if (e.code === '42701') {
        console.log('Column cost_price already exists.');
      } else {
        throw e;
      }
    }

    // Add additional_expenses
    try {
      await client.query('ALTER TABLE products ADD COLUMN additional_expenses numeric DEFAULT 0');
      console.log('Added additional_expenses column to products table.');
    } catch (e) {
      if (e.code === '42701') {
        console.log('Column additional_expenses already exists.');
      } else {
        throw e;
      }
    }

    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
