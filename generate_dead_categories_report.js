const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    console.log("Fetching database categories and products...");
    
    // Fetch all categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');
        
    if (catError) {
        console.error("Error fetching categories:", catError);
        return;
    }
    
    // Fetch all active products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_uz, sku, category_id, price, old_price, stock_details, is_deleted')
        .eq('is_deleted', false);
        
    if (prodError) {
        console.error("Error fetching products:", prodError);
        return;
    }
    
    const catMap = {};
    categories.forEach(c => {
        catMap[String(c.id)] = c;
    });
    
    const categoryProducts = {};
    products.forEach(p => {
        const cid = String(p.category_id);
        if (!categoryProducts[cid]) {
            categoryProducts[cid] = [];
        }
        categoryProducts[cid].push(p);
    });
    
    const deadCats = [];
    categories.forEach(c => {
        if (c.is_deleted) return;
        
        if (c.parent_id) {
            const parent = catMap[String(c.parent_id)];
            if (!parent) {
                deadCats.push({
                    category: c,
                    reason: `Parent ID '${c.parent_id}' does not exist.`
                });
            } else if (parent.is_deleted) {
                deadCats.push({
                    category: c,
                    reason: `Parent category '${parent.name_uz || parent.name}' (ID: ${parent.id}) is deleted (is_deleted: true).`
                });
            }
        }
    });
    
    console.log(`Found ${deadCats.length} dead categories.`);
    
    // Generate markdown
    let md = `# O'lik (Orphaned) Kategoriyalar va ularning Mahsulotlari Hisoboti\n\n`;
    md += `Ushbu hisobotda bazada **faol** (\`is_deleted: false\`) bo'lgan, lekin ularning ota (parent) kategoriyasi **o'chirilgan** (\`is_deleted: true\`) yoki umuman mavjud bo'lmagan barcha kategoriyalar va ularga bog'langan faol mahsulotlar ro'yxati keltirilgan.\n\n`;
    md += `## Umumiy Statistika\n`;
    md += `- **Umumiy kategoriyalar soni:** ${categories.length}\n`;
    md += `- **O'lik faol kategoriyalar soni:** ${deadCats.length}\n`;
    md += `- **O'lik kategoriyalardagi umumiy faol mahsulotlar soni:** ${deadCats.reduce((sum, item) => sum + (categoryProducts[String(item.category.id)] || []).length, 0)}\n\n`;
    
    md += `## O'lik Kategoriyalar Ro'yxati\n\n`;
    
    deadCats.forEach((item, idx) => {
        const c = item.category;
        const cid = String(c.id);
        const linkedProds = categoryProducts[cid] || [];
        
        md += `### ${idx + 1}. Kategoriya: "${c.name_uz || c.name}" (ID: \`${cid}\`)\n`;
        md += `- **Ota kategoriya ID:** \`${c.parent_id}\`\n`;
        md += `- **Muammo:** ${item.reason}\n`;
        md += `- **Bog'langan faol mahsulotlar soni:** ${linkedProds.length}\n\n`;
        
        if (linkedProds.length > 0) {
            md += `| T/r | SKU | Nomi | Narxi | Zaxira (Stock) |\n`;
            md += `| --- | --- | ---- | ----- | -------------- |\n`;
            linkedProds.forEach((p, pIdx) => {
                const stock = p.stock_details ? JSON.stringify(p.stock_details) : 'Noma\'lum';
                md += `| ${pIdx + 1} | \`${p.sku}\` | ${p.name_uz || p.name} | ${p.price ? p.price.toLocaleString() : 0} UZS | ${stock} |\n`;
            });
            md += `\n`;
        } else {
            md += `> [!NOTE]\n`;
            md += `> Ushbu kategoriyada hozirda hech qanday faol mahsulot mavjud emas.\n\n`;
        }
        md += `---\n\n`;
    });
    
    const outputPath = path.join('C:', 'Users', 'abduv', '.gemini', 'antigravity', 'brain', '7825ef4b-fa61-4420-8f31-354de1b31609', 'dead_categories_analysis.md');
    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`Markdown report written to: ${outputPath}`);
}

run();
