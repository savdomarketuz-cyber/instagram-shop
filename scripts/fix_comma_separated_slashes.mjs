import pg from 'pg';
import { getDatabaseUrl } from './get_db_url.mjs';

const client = new pg.Client({
  connectionString: getDatabaseUrl(),
  ssl: { rejectUnauthorized: false }
});

function parseMultiSlashValue(val) {
  if (val === "Professional pichoqlar (keramika / po'lat) / Профессиональные лезвия (керамика / сталь)") {
    return {
      uz: "Professional pichoqlar (keramika / po'lat)",
      ru: "Профессиональные лезвия (керамика / сталь)"
    };
  }

  // Comma-separated pairs: "A / B, C / D, E / F"
  const pairs = val.split(',').map(s => s.trim());
  const uzParts = [];
  const ruParts = [];

  for (const pair of pairs) {
    if (pair.includes(' / ')) {
      const [u, r] = pair.split(' / ');
      uzParts.push(u.trim());
      ruParts.push(r.trim());
    } else {
      return null;
    }
  }

  return {
    uz: uzParts.join(', '),
    ru: ruParts.join(', ')
  };
}

async function main() {
  await client.connect();

  const res = await client.query(`
    SELECT ppv.id, ppv.value
    FROM product_param_values ppv
    WHERE (LENGTH(ppv.value) - LENGTH(REPLACE(ppv.value, ' / ', ''))) > 3
  `);

  console.log(`Processing ${res.rows.length} records with multiple slashes...`);

  await client.query('BEGIN');
  try {
    let updated = 0;
    for (const r of res.rows) {
      const parsed = parseMultiSlashValue(r.value);
      if (parsed) {
        await client.query(`
          UPDATE product_param_values
          SET 
            value_uz = $1,
            value_ru = $2
          WHERE id = $3
        `, [parsed.uz, parsed.ru, r.id]);
        updated++;
      } else {
        console.warn('Could not parse:', r.value);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully fixed ${updated} records!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
