-- 🛡 GRAND SECURITY LOCKDOWN: Enabling RLS on all critical tables
-- This prevents any direct browser-side access to sensitive data.
-- Our server-side APIs use supabaseAdmin (service_role) so they will continue to work.

DO $$ 
DECLARE 
    tbl RECORD;
BEGIN 
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'orders', 'products', 'promo_codes', 'user_wallets', 
            'p2p_otps', 'wallet_otps', 'user_interests', 'site_settings', 
            'admin_audit_logs', 'security_traps', 'comments', 'wallet_transfers',
            'cashback_transactions', 'warehouses', 'click_transactions'
        )
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON %I;', tbl.tablename);
        -- By default, with RLS enabled and no policies, all access is denied to anon/authenticated roles.
        -- This is exactly what we want since we use Server-Side APIs for everything.
    END LOOP; 
END $$;

-- Specifically for PRODUCTS and CATEGORIES: Keep them readable for SEO but prevent writing
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON brands FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON banners FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON reels FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON blogs FOR SELECT USING (true);

-- COMMENTS: Allow public reading, but writing is handled by our API or triggers
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON comments FOR SELECT USING (true);
