// Migration script using individual config to add updated_at column and trigger
import pg from 'pg';
const { Client } = pg;

async function main() {
    // Individual connection details to avoid connection string parsing issues
    const client = new Client({
        user: 'postgres.slmbethqqqugnktxwzdz',
        host: 'aws-1-ap-south-1.pooler.supabase.com',
        database: 'postgres',
        password: '!f3$DRcmZT!aU@@',
        port: 6543,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔗 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');
        
        // Step 1: Add updated_at column to products
        console.log('\n📝 Step 1: Adding updated_at column to products...');
        await client.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
        `);
        console.log('✅ Column added to products!');

        // Step 1b: Add updated_at column to categories
        console.log('\n📝 Step 1b: Adding updated_at column to categories...');
        await client.query(`
            ALTER TABLE categories 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
        `);
        console.log('✅ Column added to categories!');
        
        // Step 2: Set existing rows
        console.log('\n📝 Step 2: Setting existing values...');
        await client.query(`
            UPDATE products 
            SET updated_at = created_at 
            WHERE updated_at IS NULL AND created_at IS NOT NULL
        `);
        await client.query(`
            UPDATE categories 
            SET updated_at = created_at 
            WHERE updated_at IS NULL AND created_at IS NOT NULL
        `);
        console.log('✅ Updated existing rows!');
        
        // Step 3: Create auto-update trigger function
        console.log('\n📝 Step 3: Creating trigger function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
        console.log('✅ Function created!');
        
        // Step 4: Create triggers for products
        console.log('\n📝 Step 4: Creating trigger for products...');
        await client.query(`DROP TRIGGER IF EXISTS set_updated_at ON products`);
        await client.query(`
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp()
        `);
        console.log('✅ Trigger created for products!');

        // Step 4b: Create triggers for categories
        console.log('\n📝 Step 4b: Creating trigger for categories...');
        await client.query(`DROP TRIGGER IF EXISTS set_updated_at ON categories`);
        await client.query(`
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON categories
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp()
        `);
        console.log('✅ Trigger created for categories!');
        
        console.log('\n🎉 All done! Database schema updated.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
