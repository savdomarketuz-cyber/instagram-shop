
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key kerak modifikatsiya qilish uchun
);

async function reoptimizeAllProducts() {
    console.log("🚀 Migratsiya boshlandi...");

    const { data: products, error } = await supabase
        .from("products")
        .select("id, image, image_metadata, images")
        .is("is_deleted", false);


    if (error) {
        console.error("Xatolik:", error);
        return;
    }

    console.log(`📦 Jami ${products.length} ta mahsulot topildi.`);

    for (const prod of products) {
        try {
            const currentUrl = prod.image;
            if (!currentUrl) continue;


            const metadata = prod.image_metadata || {};
            if (metadata[currentUrl]?.blurDataURL) {
                console.log(`✅ Skip: ${prod.id}`);
                continue;
            }

            console.log(`🛠 Optimizing: ${prod.id}...`);
            const response = await fetch(currentUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);


            const placeholderBuffer = await sharp(buffer)
                .resize(10)
                .toFormat('webp')
                .toBuffer();
            const blurDataURL = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

            const newMetadata = {
                ...metadata,
                [currentUrl]: {
                    ...metadata[currentUrl],
                    blurDataURL
                }
            };

            const { error: updateError } = await supabase
                .from("products")
                .update({ image_metadata: newMetadata })
                .eq("id", prod.id);

            if (updateError) throw updateError;
            console.log(`✨ Success: ${prod.id}`);

        } catch (err) {
            console.log(`❌ Error ${prod.id}: ${err.message}`);
        }
    }
    console.log("🏁 Done!");
}

reoptimizeAllProducts();
