const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres.slmbethqqqugnktxwzdz:!f3$DRcmZT!aU@@@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('Connected to database');
  
  // Create category_params table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.category_params (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_uz TEXT,
      name_ru TEXT,
      type TEXT NOT NULL DEFAULT 'select',
      predefined_values JSONB DEFAULT '[]'::jsonb,
      is_required BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('category_params table created');
  
  // Create product_param_values table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.product_param_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      param_id UUID NOT NULL REFERENCES public.category_params(id) ON DELETE CASCADE,
      value TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(product_id, param_id)
    );
  `);
  console.log('product_param_values table created');
  
  // Create indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_cp_cat ON public.category_params(category_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ppv_prod ON public.product_param_values(product_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ppv_param ON public.product_param_values(param_id);`);
  console.log('Indexes created');
  
  // Enable RLS
  await client.query(`ALTER TABLE public.category_params ENABLE ROW LEVEL SECURITY;`);
  await client.query(`ALTER TABLE public.product_param_values ENABLE ROW LEVEL SECURITY;`);
  
  // Create policies (drop first if exist)
  const policies = [
    { table: 'category_params', name: 'allow_all_category_params', sql: `CREATE POLICY "allow_all_category_params" ON public.category_params FOR ALL USING (true) WITH CHECK (true);` },
    { table: 'product_param_values', name: 'allow_all_product_param_values', sql: `CREATE POLICY "allow_all_product_param_values" ON public.product_param_values FOR ALL USING (true) WITH CHECK (true);` }
  ];
  
  for (const p of policies) {
    try {
      await client.query(p.sql);
      console.log(`Policy ${p.name} created`);
    } catch (e) {
      if (e.code === '42710') {
        console.log(`Policy ${p.name} already exists, skipping`);
      } else {
        console.log(`Policy error: ${e.message}`);
      }
    }
  }
  
  console.log('All done!');
  await client.end();
}

createTables().catch(e => { console.error('Error:', e.message); process.exit(1); });
