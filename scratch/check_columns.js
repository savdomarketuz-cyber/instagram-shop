const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() =>
    c.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position")
).then(r => {
    console.log("products jadvali ustunlari:");
    r.rows.forEach(x => console.log("  -", x.column_name));
    c.end();
}).catch(e => { console.error(e.message); c.end(); });
