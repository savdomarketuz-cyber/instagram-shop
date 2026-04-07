
import { supabase } from "../src/lib/supabase";
import sharp from "sharp";
import axios from "axios";

/**
 * Ushbu skript bazadagi barcha mahsulotlarni tekshiradi
 * va ularning rasmlarini optimallashtirib, blurDataURL qo'shadi.
 */
async function reoptimizeAllProducts() {
    console.log("🚀 Migratsiya boshlandi...");

    // 1. Fetch all products
    const { data: products, error } = await supabase
        .from("products")
        .select("id, image, image_url, image_metadata, images")
        .is("is_deleted", false);

    if (error) {
        console.error("Xatolik:", error);
        return;
    }

    console.log(`📦 Jami ${products.length} ta mahsulot topildi.`);

    for (const prod of products) {
        try {
            const currentUrl = prod.image || prod.image_url;
            if (!currentUrl) continue;

            const metadata = prod.image_metadata || {};
            
            // Agar rasm allaqachon blurDataURL ga ega bo'lsa va WebP manzili bo'lsa, o'tkazib yuboramiz
            if (metadata[currentUrl]?.blurDataURL) {
                console.log(`✅ Skip: ${prod.id} (optimized)`);
                continue;
            }

            console.log(`🛠 Optimizing: ${prod.id}...`);

            // Fetch image
            const response = await axios.get(currentUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            // Generate blur placeholder
            const placeholderBuffer = await sharp(buffer)
                .resize(10)
                .toFormat('webp')
                .toBuffer();
            const blurDataURL = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

            // Update Metadata
            const newMetadata = {
                ...metadata,
                [currentUrl]: {
                    ...metadata[currentUrl],
                    blurDataURL
                }
            };

            // Save back to DB
            const { error: updateError } = await supabase
                .from("products")
                .update({ image_metadata: newMetadata })
                .eq("id", prod.id);

            if (updateError) throw updateError;
            console.log(`✨ Success: ${prod.id}`);

        } catch (err) {
            console.error(`❌ Error on product ${prod.id}:`, err);
        }
    }

    console.log("🏁 Barcha mahsulotlar muvaffaqiyatli yangilandi!");
}

reoptimizeAllProducts();
