require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const sql = `
CREATE OR REPLACE FUNCTION restore_expired_orders()
RETURNS void AS $$
DECLARE
    v_order record;
    v_item jsonb;
    v_product_id text;
    v_quantity int;
    v_stock_details jsonb;
    v_wh_id text;
    v_wh_val text;
BEGIN
    FOR v_order IN 
        SELECT id, items FROM orders 
        WHERE (status = 'To''lov kutilmoqda' OR status = 'Ожидание оплаты')
        AND created_at < NOW() - INTERVAL '1 hour'
    LOOP
        -- Restore stock
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
        LOOP
            v_product_id := v_item->>'id';
            v_quantity := (v_item->>'quantity')::int;
            
            SELECT stock_details INTO v_stock_details FROM products WHERE id = v_product_id;
            
            IF v_stock_details IS NOT NULL THEN
                -- Find the first warehouse key (or main one) and add stock back
                SELECT key INTO v_wh_id FROM jsonb_each_text(v_stock_details) LIMIT 1;
                
                IF v_wh_id IS NOT NULL THEN
                    v_wh_val := (COALESCE((v_stock_details->>v_wh_id)::int, 0) + v_quantity)::text;
                    v_stock_details := jsonb_set(v_stock_details, ARRAY[v_wh_id], to_jsonb(v_wh_val));
                    
                    UPDATE products 
                    SET stock_details = v_stock_details,
                        sales = GREATEST(sales - v_quantity, 0)
                    WHERE id = v_product_id;
                END IF;
            END IF;
        END LOOP;
        
        -- Mark as cancelled
        UPDATE orders SET status = 'bekor_qilingan' WHERE id = v_order.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  console.log('Cron RPC updated!');
  await client.end();
}
main();
