const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MODE = process.argv[2] === 'execute' ? 'execute' : 'dry-run';

const YANDEX_CONFIG = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET: process.env.YANDEX_S3_BUCKET || "savdomarketimag",
    REGION: process.env.YANDEX_S3_REGION || "ru-central1",
};

const baseDir = 'D:/Desktop/uzum yangi mahsulotlar';
const stationaryFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_stationary.json';
const handFile = 'D:/Desktop/uzum yangi mahsulotlar/categories/blenders_hand.json';

const STATIONARY_CAT_ID = '501';      // "Blenderlar"
const HAND_CAT_ID = '17809901663251'; // "Qo'l blenderlari"

// --- S3 AWSv4 Signature and Upload Helpers ---
async function hmacSha256(key, data) {
    const encoder = new TextEncoder();
    const cryptoKey = await globalThis.crypto.subtle.importKey(
        "raw",
        typeof key === "string" ? encoder.encode(key) : key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return await globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function hashSha256(data) {
    const encoder = new TextEncoder();
    const hash = await globalThis.crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToS3(buffer, key, contentType = "image/webp") {
    const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX_CONFIG;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const host = "storage.yandexcloud.net";
    const method = "PUT";
    
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

async function processAndUploadLocalImage(filePath) {
    try {
        const sourceBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const safeBaseName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const baseNoExt = safeBaseName.replace(/\.(avif|webp|jpg|jpeg|png)$/i, "");
        const timestamp = Date.now();

        const image = sharp(sourceBuffer);
        
        const blurBuffer = await image.clone().resize(20, 20, { fit: "cover" }).blur(5).toFormat("webp", { quality: 20 }).toBuffer();
        const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

        const originalBuffer = await image.clone().resize(1080, 1440, { fit: "inside", withoutEnlargement: true }).toFormat("avif", { quality: 75, effort: 3 }).toBuffer();
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
        console.error("  Failed to process local image:", filePath, e.message);
        return null;
    }
}

// --- Parameter Cleaners and Translators ---
function translateMaterial(mat) {
    if (!mat) return null;
    let m = String(mat).toLowerCase().trim();
    if (m.includes('glass') && m.includes('plastic')) return 'Shisha va plastik';
    if (m.includes('стекло') && m.includes('пластик')) return 'Shisha va plastik';
    if (m.includes('glass') || m.includes('стекло')) return 'Shisha';
    if (m.includes('plastic') || m.includes('пластик')) return 'Plastik';
    if (m.includes('stainless steel') || m.includes('нержавеющая сталь')) return 'Zanglamaydigan po\'lat';
    if (m.includes('metal') || m.includes('металл')) return 'Metall';
    if (m.includes('steel') || m.includes('сталь')) return 'Po\'lat';
    return mat;
}

function cleanTezlik(val) {
    if (!val) return null;
    const s = String(val).toLowerCase().trim();
    if (s === 'есть' || s === 'yes' || s === 'true' || s === 'not specified' || s === 'speed control' || s === 'speed' || s === 'no' || s === 'false' || s === 'есть скорость') {
        return null;
    }
    
    const numMatch = s.match(/^(\d+)/);
    if (numMatch) return numMatch[1];
    
    if (s.includes('multi-speed') || s.includes('multi') || s.includes('ko\'p') || s.includes('много')) {
        return "Ko'p tezlikli";
    }
    return null;
}

function translateToUzbek(val) {
    if (!val) return null;
    if (typeof val !== 'string') return val;
    
    let str = val;
    const replacements = [
        { rx: /3в1/g, rep: "3 tasi 1 da" },
        { rx: /4в1/g, rep: "4 tasi 1 da" },
        { rx: /5в1/g, rep: "5 tasi 1 da" },
        { rx: /3 in 1/ig, rep: "3 tasi 1 da" },
        { rx: /4 in 1/ig, rep: "4 tasi 1 da" },
        { rx: /5 in 1/ig, rep: "5 tasi 1 da" },
        { rx: /Смузи/g, rep: "Smuzi" },
        { rx: /Кофе/g, rep: "Kofe" },
        { rx: /Измельчение/g, rep: "Maydalash" },
        { rx: /измельчитель/g, rep: "maydalagich" },
        { rx: /кофемолка/g, rep: "kofe maydalagich" },
        { rx: /блендер/g, rep: "blender" },
        { rx: /Смузи, cocktail/ig, rep: "Smuzi va kokteyllar" },
        { rx: /Замешивание теста/g, rep: "Xamir qorishtirish" },
        { rx: /Дробление льда/g, rep: "Muz maydalash" },
        { rx: /Измельчение овощей/g, rep: "Sabzavotlarni maydalash" },
        { rx: /стационарный блендер/ig, rep: "statsionar blender" },
        { rx: /погружной блендер/ig, rep: "qo'l blenderi" },
        { rx: /ручной/ig, rep: "qo'l" },
        { rx: /титановые/ig, rep: "titanli" },
        { rx: /титан/ig, rep: "titan" },
        { rx: /нержавеющая сталь/ig, rep: "zanglamaydigan po'lat" },
        { rx: /закаленное стекло/ig, rep: "bardoshli shisha" },
        { rx: /стекло/ig, rep: "shisha" },
        { rx: /пластик/ig, rep: "plastik" },
        { rx: /металл/ig, rep: "metall" },
        { rx: /есть/ig, rep: "bor" },
        { rx: /нет/ig, rep: "yo'q" },
        { rx: /гарантия/ig, rep: "kafolat" },
        { rx: /год/ig, rep: "yil" },
        { rx: /лет/ig, rep: "yil" },
        { rx: /литра|литр|л/g, rep: "l" },
        { rx: /liters|liter|l/g, rep: "l" },
        { rx: /мл|мl/ig, rep: "ml" },
        { rx: /MAX/g, rep: "maks" }
    ];
    
    replacements.forEach(r => {
        str = str.replace(r.rx, r.rep);
    });
    
    return str.replace(/\s+/g, ' ').trim();
}

const generateArticle = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(Math.random() * 1000);
};

async function getOrCreateBrand(brandName) {
    const bName = brandName ? brandName.trim() : 'Nomsiz';
    const { data: exist } = await supabase.from('brands').select('id').ilike('name', bName).limit(1);
    if(exist && exist.length > 0) return exist[0].id;
    
    if (MODE === 'dry-run') {
        return 'mock-brand-id';
    }
    
    console.log(`  Creating brand: ${bName}`);
    const { data, error } = await supabase.from('brands').insert({
        id: crypto.randomUUID(),
        name: bName
    }).select('id').single();
    if(error) throw error;
    return data.id;
}

async function getOrCreateParam(catId, paramName) {
    const { data: exist, error } = await supabase
        .from('category_params')
        .select('*')
        .eq('category_id', catId)
        .eq('name', paramName);
        
    if (exist && exist.length > 0) return exist[0];
    
    if (MODE === 'dry-run') {
        return { id: 'mock-param-id', name: paramName, predefined_values: [] };
    }
    
    console.log(`  Creating category parameter: "${paramName}" for Category ID: ${catId}`);
    const { data: newParam, error: insErr } = await supabase
        .from('category_params')
        .insert({
            category_id: catId,
            name: paramName,
            name_uz: paramName,
            name_ru: paramName,
            type: 'select',
            predefined_values: []
        })
        .select()
        .single();
        
    if (insErr) {
        console.error(`  Error creating param "${paramName}":`, insErr.message);
        return null;
    }
    return newParam;
}

async function run() {
    console.log(`=== Blender Database Import Script (${MODE.toUpperCase()} Mode) ===\n`);
    
    const stationary = JSON.parse(fs.readFileSync(stationaryFile, 'utf-8'));
    const hand = JSON.parse(fs.readFileSync(handFile, 'utf-8'));
    
    const localProducts = [];
    for (const [id, prod] of Object.entries(stationary)) {
        localProducts.push({ id, ...prod, categoryId: STATIONARY_CAT_ID });
    }
    for (const [id, prod] of Object.entries(hand)) {
        localProducts.push({ id, ...prod, categoryId: HAND_CAT_ID });
    }
    
    console.log(`Loaded ${localProducts.length} products to import.`);
    
    // Fetch active products in DB to prevent duplicates
    const { data: dbProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, sku, barcode');
    if (prodErr) {
        console.error("DB error fetching products:", prodErr);
        return;
    }
    console.log(`Loaded ${dbProducts.length} products from DB to check for duplicates.\n`);
    
    // Get all directories in baseDir
    const allDirs = fs.readdirSync(baseDir).filter(f => {
        return fs.statSync(path.join(baseDir, f)).isDirectory() && f !== 'categories' && f !== 'uzum_data' && f !== 'uzum_grouped_colors';
    });
    
    // Cache category parameters to avoid redundant DB queries
    const paramsCache = {};
    
    let count = 0;
    
    for (const lp of localProducts) {
        const brandName = lp.brand || 'Nomsiz';
        const modelName = lp.model || `BL-${lp.id}`;
        const colorName = lp.color || '';
        
        // Generate a clean unique SKU
        const sku = (brandName + "_" + modelName + "_" + colorName).toUpperCase().replace(/[^A-Z0-9-]/g, "_").substring(0, 40);
        
        // Check if duplicate SKU exists in DB
        const isDuplicate = dbProducts.some(dp => dp.sku && dp.sku.toUpperCase() === sku);
        if (isDuplicate) {
            console.log(`Skipping SKU "${sku}" - already exists in database.`);
            continue;
        }
        
        // Match directory
        const matchDir = allDirs.find(d => d.endsWith(`- ${lp.id}`) || d.includes(`-${lp.id}`) || d.endsWith(`-${lp.id}`));
        if (!matchDir) {
            console.log(`Skipping product ID ${lp.id} - local image directory not found.`);
            continue;
        }
        
        const localImages = fs.readdirSync(path.join(baseDir, matchDir))
            .filter(f => f.startsWith('img_'))
            .map(f => path.join(baseDir, matchDir, f));
            
        if (localImages.length === 0) {
            console.log(`Skipping product ID ${lp.id} - no images found in directory.`);
            continue;
        }
        
        console.log(`Importing product [${count + 1}] | ID: ${lp.id} | SKU: ${sku}`);
        
        if (MODE === 'dry-run') {
            console.log(`  [DRY RUN] Would process ${localImages.length} images.`);
            console.log(`  [DRY RUN] Would insert product: "${lp.title_uz}"`);
            console.log(`  [DRY RUN] Parameters:`, lp.parameters);
            count++;
            continue;
        }
        
        // --- Process and Upload Images ---
        const finalImages = [];
        const finalMetadata = {};
        
        console.log(`  Processing and uploading ${localImages.length} images...`);
        for (const imgPath of localImages) {
            const result = await processAndUploadLocalImage(imgPath);
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
            console.log(`  Skipping product - image processing failed completely.`);
            continue;
        }
        
        // --- Resolve Brand ---
        const brandId = await getOrCreateBrand(brandName);
        
        // --- Prepare Product Record ---
        const price = lp.prices && lp.prices.length > 0 ? lp.prices[0].sellPrice : 0;
        const oldPrice = lp.prices && lp.prices.length > 0 ? lp.prices[0].fullPrice : 0;
        
        const productId = crypto.randomUUID();
        const productPayload = {
            id: productId,
            name: lp.title_uz,
            name_uz: lp.title_uz,
            name_ru: lp.title_ru,
            price: price,
            old_price: oldPrice,
            category_id: lp.categoryId,
            description: lp.description_uz,
            description_uz: lp.description_uz,
            description_ru: lp.description_ru,
            sku: sku,
            brand_id: brandId,
            barcode: `${brandName}-${modelName}`.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0,40),
            weight: lp.parameters["Og'irligi, kg"] || "",
            length: lp.parameters["Chuqurlik, sm"] || "",
            width: lp.parameters["Kengligi, sm"] || "",
            height: lp.parameters["Balandligi, sm"] || "",
            image: finalImages[0],
            images: finalImages,
            image_metadata: finalMetadata,
            is_deleted: false,
            is_original: false,
            stock: 10, // Default stock to 10 so they are immediately available
            article: generateArticle(),
            group_id: `custom-${brandName}-${modelName}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0,40),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Insert product
        const { error: insErr } = await supabase.from('products').insert(productPayload);
        if (insErr) {
            console.error(`  Error inserting product:`, insErr.message);
            continue;
        }
        
        // --- Process and Link Parameters ---
        console.log(`  Linking parameters...`);
        for (const [pName, pValue] of Object.entries(lp.parameters)) {
            if (pValue !== null && pValue !== undefined && pValue !== '') {
                let cleanValue = String(pValue).trim();
                
                // Clean Tezlik soni
                if (pName === 'Tezlik soni') {
                    const cleaned = cleanTezlik(cleanValue);
                    if (cleaned === null) continue;
                    cleanValue = cleaned;
                }
                
                // Clean Power
                if (pName === 'Quvvat, Vt') {
                    cleanValue = cleanValue.replace(/\b(\d+)\s*(w|watt|watts|vt|вт|в)\b/ig, '$1 Vt').trim();
                }
                
                // Clean Materials
                if (pName === 'Piyola materiali' || pName === 'Material immersion qism' || pName === 'Korpus materiali') {
                    cleanValue = translateMaterial(cleanValue);
                }
                
                // Clean Warranty
                if (pName === 'Qo\'shimcha ma\'lumot') {
                    cleanValue = cleanValue
                        .replace(/\b(\d+)\s*(year|years|года|лет|год)\b/ig, '$1 yil kafolat')
                        .replace(/\b(\d+)\s*(months|месяцев|месяца|месяц)\b/ig, '$1 oy kafolat')
                        .trim();
                }
                
                // General translation
                cleanValue = translateToUzbek(cleanValue);
                
                // Get parameter ID from cache or DB
                const cacheKey = `${lp.categoryId}_${pName}`;
                let dbParam = paramsCache[cacheKey];
                if (!dbParam) {
                    dbParam = await getOrCreateParam(lp.categoryId, pName);
                    if (dbParam) paramsCache[cacheKey] = dbParam;
                }
                
                if (!dbParam) continue;
                
                // Update predefined values in parameter if new
                if (!dbParam.predefined_values.includes(cleanValue)) {
                    dbParam.predefined_values.push(cleanValue);
                    await supabase
                        .from('category_params')
                        .update({ predefined_values: dbParam.predefined_values })
                        .eq('id', dbParam.id);
                }
                
                // Upsert product param value
                await supabase.from('product_param_values').upsert({
                    product_id: productId,
                    param_id: dbParam.id,
                    value: cleanValue
                }, { onConflict: 'product_id,param_id' });
            }
        }
        
        console.log(`  Successfully imported product!`);
        count++;
    }
    
    console.log(`\nImport Process Completed. Total products processed: ${count}`);
}

run().catch(console.error);
