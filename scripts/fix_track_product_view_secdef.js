require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// track_product_view RPC user_interests'ga yozadi. user_interests RLS yoqilgan,
// lekin policy yo'q -> anon (client) yozuvi 42501 bilan bloklanardi
// ("Interest tracking failed: new row violates row-level security policy").
// Yechim: RPC'ni SECURITY DEFINER qilish -> funksiya egasi (jadval egasi) huquqi
// bilan ishlaydi, RLS xavfsiz chetlab o'tiladi. search_path qat'iy belgilanadi.
const sql = `
ALTER FUNCTION public.track_product_view(text, text, text) SECURITY DEFINER;
ALTER FUNCTION public.track_product_view(text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.track_product_view(text, text, text, integer) SECURITY DEFINER;
ALTER FUNCTION public.track_product_view(text, text, text, integer) SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.track_product_view(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_product_view(text, text, text, integer) TO anon, authenticated;
`;

(async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    await c.query(sql);
    const chk = await c.query(`SELECT pg_get_function_identity_arguments(oid) args, prosecdef FROM pg_proc WHERE proname='track_product_view'`);
    console.log('✅ track_product_view SECURITY DEFINER:', JSON.stringify(chk.rows));
    await c.end();
})().catch(e => { console.error(e); process.exit(1); });
