const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const YANDEX_CONFIG = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET: process.env.YANDEX_S3_BUCKET || "savdomarketimag",
    REGION: process.env.YANDEX_S3_REGION || "ru-central1",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const dir = 'D:\\Desktop\\yangi mahsulotlar';

// --- Crypto Utils for S3 Signature ---
async function hmacSha256(key, data) {
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        typeof key === "string" ? encoder.encode(key) : key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function hashSha256(data) {
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToS3(buffer, key, contentType = "image/webp") {
    const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX_CONFIG;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const host = "storage.yandexcloud.net";
    const method = "PUT";
    
    // We must encode the key in the URI
    const encodedKey = encodeURI(key).replace(/\+/g, "%2B");
    const canonicalUri = `/${BUCKET}/${encodedKey}`;
    const canonicalQueryString = "";
    
    const headersConfig = {
        "host": host,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate
    };
    const canonicalHeaders = Object.keys(headersConfig).sort().map(k => `${k}:${headersConfig[k]}\n`).join("");
    const signedHeaders = Object.keys(headersConfig).sort().join(";");
    const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const hashedCanonicalRequest = await hashSha256(canonicalRequest);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`;
    const kDate = await hmacSha256(`AWS4${SECRET_KEY}`, dateStamp);
    const kRegion = await hmacSha256(kDate, REGION);
    const kService = await hmacSha256(kRegion, "s3");
    const kSigning = await hmacSha256(kService, "aws4_request");
    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const authHeader = `${algorithm} Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}${canonicalUri}`, {
        method,
        headers: {
            "x-amz-date": amzDate,
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            "Authorization": authHeader,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable"
        },
        body: buffer
    });
    
    if (!res.ok) throw new Error(await res.text());
    return `https://${host}${canonicalUri}`;
}

async function processAndUploadImage(url) {
    console.log("  Downloading:", url);
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const sourceBuffer = Buffer.from(new Uint8Array(arrayBuffer));
        
        const fileName = url.split('/').pop().split('?')[0] || `img_${Date.now()}`;
        const safeBaseName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const baseNoExt = safeBaseName.replace(/\.(avif|webp|jpg|jpeg|png)$/i, "");
        const timestamp = Date.now();

        const image = sharp(sourceBuffer);
        
        const blurBuffer = await image.clone().resize(20, 20, { fit: "cover" }).blur(5).toFormat("webp", { quality: 20 }).toBuffer();
        const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

        const originalBuffer = await image.clone().resize(1080, 1440, { fit: "cover" }).toFormat("avif", { quality: 75, effort: 3 }).toBuffer();
        const lowResBuffer = await image.clone().resize(360, 480, { fit: "cover" }).toFormat("webp", { quality: 40, effort: 6 }).toBuffer();
        const xsBuffer = await image.clone().resize({ width: 640, withoutEnlargement: true }).toFormat("webp", { quality: 78 }).toBuffer();
        const mdBuffer = await image.clone().resize({ width: 828, withoutEnlargement: true }).toFormat("webp", { quality: 80 }).toBuffer();
        const lgBuffer = await image.clone().resize({ width: 1080, withoutEnlargement: true }).toFormat("webp", { quality: 82 }).toBuffer();

        const [originalUrl, thumbUrl, xsUrl, mdUrl, lgUrl] = await Promise.all([
            uploadToS3(originalBuffer, `products/${timestamp}_original_${baseNoExt}.avif`, "image/avif"),
            uploadToS3(lowResBuffer, `products/${timestamp}_thumb_${baseNoExt}.webp`, "image/webp"),
            uploadToS3(xsBuffer, `products/${timestamp}_${baseNoExt}_xs.webp`, "image/webp"),
            uploadToS3(mdBuffer, `products/${timestamp}_${baseNoExt}_md.webp`, "image/webp"),
            uploadToS3(lgBuffer, `products/${timestamp}_${baseNoExt}_lg.webp`, "image/webp")
        ]);

        return { url: originalUrl, blurDataURL, lowResUrl: thumbUrl, xs: xsUrl, md: mdUrl, lg: lgUrl };
    } catch (e) {
        console.error("  Failed to process image:", url, e.message);
        return null;
    }
}

// Generate article code
const generateArticle = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(Math.random() * 1000);
};

// Start logic
async function run() {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.includes('tayyor'));

    const { data: dbCategories } = await supabase.from('categories').select('id, name, name_uz');
    const { data: dbBrands } = await supabase.from('brands').select('id, name');
    const { data: categoryParams } = await supabase.from('category_params').select('*');
    
    // Map existing products by SKU to prevent full duplicates, or we can upsert
    // But since the new table requires product creation, let's just create new products or update if SKU exists.
    
    for (const f of files) {
        // Just run 1 file for testing initially. Uncomment next line to run all.
        // if (f !== files[0]) continue; 
        
        console.log(`\nProcessing file: ${f}`);
        const wb = xlsx.readFile(path.join(dir, f));
        const sheetName = wb.SheetNames[2];
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], {header: 1});
        
        let excelCategoryName = (data[0] && data[0][0]) ? data[0][0].replace(/^Kategoriya:\s*/i, '').trim() : null;
        if (!excelCategoryName) continue;

        const categoryMap = {
            'Hair dryers': 'Fenlar',
            'Epilatorlar': 'Epilyatorlar',
            'Fotoepilatorlar': 'Epilyatorlar',
            'Soch quritgichlari-soch cho\'tkalari': 'Fen-shotkalar',
            'Hair Straighteners': 'Soch dazmollari'
        };
        excelCategoryName = categoryMap[excelCategoryName] || excelCategoryName;

        let matchedCat = dbCategories.find(c => (c.name && c.name.toLowerCase() === excelCategoryName.toLowerCase()) || (c.name_uz && c.name_uz.toLowerCase() === excelCategoryName.toLowerCase()));
        if (!matchedCat) continue;
        console.log(`Matched category: ${matchedCat.name_uz || matchedCat.name}`);

        let headerRowIndex = -1;
        for(let i=0; i<10; i++) {
            if(data[i] && data[i].includes('Mahsulot nomi *')) { headerRowIndex = i; break; }
        }
        if (headerRowIndex === -1) continue;

        const headers = data[headerRowIndex];
        const hIdx = (name) => headers.indexOf(name);
        
        for(let i = headerRowIndex + 2; i < data.length; i++) {
            const row = data[i];
            if(!row || row.length === 0 || !row[hIdx('Mahsulot nomi *')]) continue;
            const name = row[hIdx('Mahsulot nomi *')];
            if(name.includes('Agar bir nechta') || name.includes('Sxemaga e\'tibor') || name.includes('qoidalarga')) continue;
            let sku = row[hIdx('Sizning SKU *')] || generateArticle();
            let priceRaw = row[hIdx('Narxi *')] || row[hIdx('Narxi')] || 0;
            let price = Number(String(priceRaw).replace(/[^0-9]/g, '')) || 0;
            let oldPriceRaw = row[hIdx('Chizilgan narx')] || 0;
            let oldPrice = Number(String(oldPriceRaw).replace(/[^0-9]/g, '')) || 0;
            let description = row[hIdx('Mahsulot tavsifi *')] || "";
            let brandName = row[hIdx('Brend *')];
            let barcode = row[hIdx('Shtrixkod *')] || "";
            let weight = row[hIdx('Paket bilan vazn, kg')] || row[hIdx('Og\'irligi, g')] || "";
            let length = row[hIdx('Uzunlik, mm')] || "";
            let width = row[hIdx('Kengligi, mm')] || "";
            let height = row[hIdx('Balandligi, mm')] || "";
            let imagesStr = row[hIdx('Rasmga havola *')] || "";

            console.log(`\nImporting Product: ${name}`);

            // Find brand ID
            let brandId = null;
            if (brandName) {
                const b = dbBrands.find(b => b.name.toLowerCase() === brandName.trim().toLowerCase());
                if (b) brandId = b.id;
            }

            // Process Images
            let imageURLs = imagesStr.split(',').map(s => s.trim()).filter(s => s && (s.startsWith('http') || s.startsWith('//')));
            let finalImages = [];
            let finalMetadata = {};

            for (let imgUrl of imageURLs) {
                if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
                // If it's already uploaded to our S3, skip re-upload
                if (imgUrl.includes("yandexcloud.net")) {
                    finalImages.push(imgUrl);
                    continue;
                }
                const result = await processAndUploadImage(imgUrl);
                if (result) {
                    finalImages.push(result.url);
                    finalMetadata[result.url] = {
                        blurDataURL: result.blurDataURL,
                        lowResUrl: result.lowResUrl,
                        xs: result.xs,
                        md: result.md,
                        lg: result.lg
                    };
                }
            }

            if (finalImages.length === 0) {
                console.log("No valid images, but continuing...");
            }

            // Check if product exists by SKU
            let existingProduct = null;
            const { data: exProds } = await supabase.from('products').select('id, image_metadata').eq('sku', sku);
            if (exProds && exProds.length > 0) existingProduct = exProds[0];

            let productId = null;
            const productPayload = {
                id: globalThis.crypto.randomUUID(),
                name: name,
                name_uz: name,
                name_ru: name,
                price: price,
                old_price: oldPrice,
                category_id: matchedCat.id,
                description: description,
                description_uz: description,
                description_ru: description,
                sku: sku,
                brand_id: brandId,
                barcode: barcode,
                weight: weight,
                length: length,
                width: width,
                height: height,
                image: finalImages[0] || "",
                images: finalImages,
                image_metadata: existingProduct ? { ...existingProduct.image_metadata, ...finalMetadata } : finalMetadata,
                is_deleted: false,
                stock: 0 // default stock to 0
            };

            if (existingProduct) {
                console.log(`Updating existing product (SKU: ${sku})...`);
                // remove id from payload to avoid updating id
                const { id: _, ...updatePayload } = productPayload;
                const { data: updated, error } = await supabase.from('products').update(updatePayload).eq('id', existingProduct.id).select().single();
                if (error) console.error("Update error:", error);
                else productId = updated.id;
            } else {
                console.log(`Creating new product...`);
                // Ensure article is unique or use generateArticle
                productPayload.article = generateArticle();
                const { data: inserted, error } = await supabase.from('products').insert(productPayload).select().single();
                if (error) console.error("Insert error:", error);
                else productId = inserted.id;
            }

            if (productId) {
                // Re-link parameters just in case
                // We'll run logic similar to import_params_to_db but only for this product.
                // To keep it simple, we can skip parameters if we already imported them, but since we might create NEW products, we should link them.
                const standardCols = ['Sizning SKU *', 'Muhim xatolar', "Tanqidiy bo'lmagan xatolar", 'Kartaning sifati', "To'ldirish bo'yicha tavsiyalar", 'Variantlar guruhining nomi', 'Mahsulot nomi *', 'Rasmga havola *', 'Eskiz uchun rasm', 'Mahsulot tavsifi *', 'Brend *', 'Shtrixkod *', 'Teglar', 'Video havolasi', 'Narxi *', 'Chizilgan narx', 'Narxi', "Ko'rsatmalar", 'Ishlab chiqarilgan mamlakat', 'Ishlab chiqaruvchining maqolasi', 'Ishlab chiqaruvchi', 'Paket bilan vazn, kg', "Paket bilan o'lchamlari, sm", 'Mahsulot bir nechta joyni egallaydi', "Qo'shimcha xarajatlar", 'Yaroqlilik muddati', 'Yaroqlilik muddati haqida sharh', 'Xizmat muddati', 'Xizmat muddati haqida sharh', 'Kafolat muddati', 'Kafolat muddati haqida sharh', 'Mahsulot uchun hujjat raqami', 'Tn VED kodi', 'Belgilash turi', "Mahsulot ko'rinishi", 'Mahsulot holatining tavsifi', 'Bozordagi SKU', 'CSKU на Маркете', 'Arxivda', 'Turi', 'Дата дополнения карточки', 'Boshqa xususiyatlar', 'PARAM_NAMES', 'PARAM_IDS', 'Etkazib berish opsiyasi', 'Kiritilgan', 'Batafsil uskunalar', 'Mahsulotdagi paketlar soni, dona', 'Versiya', 'Uzunlik, mm', 'Kengligi, mm', 'Balandligi, mm', "Og'irligi, g"];
                
                for (let j = 0; j < headers.length; j++) {
                    const h = headers[j];
                    if (h && !standardCols.includes(h.trim())) {
                        let paramVal = row[j];
                        if (paramVal !== undefined && paramVal !== null && paramVal !== '') {
                            // find param_id
                            const param = categoryParams.find(p => p.category_id === matchedCat.id && p.name.toLowerCase() === h.trim().toLowerCase());
                            if (param) {
                                await supabase.from('product_param_values').upsert({
                                    product_id: productId,
                                    param_id: param.id,
                                    value: String(paramVal).trim()
                                }, { onConflict: 'product_id,param_id' });
                            }
                        }
                    }
                }
            }
        }
    }
    
    console.log("\nFinished processing.");
}

run();
