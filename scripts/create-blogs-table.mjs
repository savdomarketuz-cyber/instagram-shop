// Migration script to create blogs table and add updated_at trigger
import pg from 'pg';
const { Client } = pg;

async function main() {
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
        
        // Step 1: Create blogs table
        console.log('\n📝 Step 1: Creating blogs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS blogs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                title_uz TEXT,
                title_ru TEXT,
                slug TEXT UNIQUE NOT NULL,
                content TEXT,
                content_uz TEXT,
                content_ru TEXT,
                image TEXT,
                is_published BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✅ Blogs table created!');
        
        // Step 2: Create trigger for blogs
        console.log('\n📝 Step 2: Creating trigger for blogs...');
        await client.query(`DROP TRIGGER IF EXISTS set_blogs_updated_at ON blogs`);
        await client.query(`
            CREATE TRIGGER set_blogs_updated_at
            BEFORE UPDATE ON blogs
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp()
        `);
        console.log('✅ Trigger created for blogs!');
        
        console.log('\n🎉 All done! Blogs table is ready for SEO.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
