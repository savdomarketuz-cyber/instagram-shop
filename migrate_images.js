const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const YANDEX = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET:     process.env.YANDEX_S3_BUCKET     || "savdomarketimag",
    REGION:     process.env.YANDEX_S3_REGION     || "ru-central1",
};

// AWS v4 Sig Helpers
function hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256hex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function uploadToS3(buffer, key, contentType) {
    const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX;
    const host = "storage.yandexcloud.net";
    const now = new Date();
    const amzDate  = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const headers = {
        "host": host,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate,
    };
    
    const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join("");
    const signedHeaders    = Object.keys(headers).sort().join(";");
    const canonicalRequest = ["PUT", `/${BUCKET}/${key}`, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");

    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const stringToSign    = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256hex(canonicalRequest)}`;

    const kDate    = hmacSha256(`AWS4${SECRET_KEY}`, dateStamp);
    const kRegion  = hmacSha256(kDate, REGION);
    const kService = hmacSha256(kRegion, "s3");
    const kSigning = hmacSha256(kService, "aws4_request");
    const signature = hmacSha256(kSigning, stringToSign).toString('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}/${BUCKET}/${key}`, {
        method: "PUT",
        headers: {
            "x-amz-date": amzDate,
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            "Authorization": authHeader,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
        },
        body: buffer,
    });
    
    if (!res.ok) throw new Error(await res.text());
    return `https://${host}/${BUCKET}/${key}`;
}

async function processAndUploadImage(externalUrl) {
    try {
        const response = await fetch(externalUrl);
        if(!response.ok) throw new Error(`Failed to fetch ${externalUrl}`);
        const arrayBuffer = await response.arrayBuffer();
        const sourceBuffer = Buffer.from(arrayBuffer);
        
        const ts = Date.now();
        const baseNoExt = `migrated_${ts}_${Math.floor(Math.random()*1000)}`;
        const folder = "admin/images";

        // Generate images using sharp
        const img = sharp(sourceBuffer);

        const blurBuf = await img.clone()
            .resize(20, 20, { fit: "cover" })
            .blur(5)
            .toFormat("webp", { quality: 20 })
            .toBuffer();
        const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

        const mainBuf = await img.clone()
            .resize(1080, 1440, { fit: "inside", withoutEnlargement: true })
            .toFormat("avif", { quality: 75, effort: 3 })
            .toBuffer();
            
        const lowResBuf = await img.clone()
            .resize(360, 480, { fit: "cover" })
            .toFormat("webp", { quality: 40, effort: 6 })
            .toBuffer();

        const xsBuf = await img.clone().resize({ width: 640,  withoutEnlargement: true }).toFormat("webp", { quality: 78, effort: 4 }).toBuffer();
        const mdBuf = await img.clone().resize({ width: 828,  withoutEnlargement: true }).toFormat("webp", { quality: 80, effort: 4 }).toBuffer();
        const lgBuf = await img.clone().resize({ width: 1080, withoutEnlargement: true }).toFormat("webp", { quality: 82, effort: 4 }).toBuffer();

        // Upload main
        const mainUrl = await uploadToS3(mainBuf, `${folder}/${baseNoExt}.avif`, "image/avif");
        
        // Upload thumbnails concurrently
        const [lowResUrl, xsUrl, mdUrl, lgUrl] = await Promise.all([
            uploadToS3(lowResBuf, `${folder}/${baseNoExt}_thumb.webp`, "image/webp"),
            uploadToS3(xsBuf,     `${folder}/${baseNoExt}_xs.webp`,    "image/webp"),
            uploadToS3(mdBuf,     `${folder}/${baseNoExt}_md.webp`,    "image/webp"),
            uploadToS3(lgBuf,     `${folder}/${baseNoExt}_lg.webp`,    "image/webp")
        ]);

        return {
            originalUrl: externalUrl,
            mainUrl,
            metadata: {
                blurDataURL,
                lowResUrl,
                xs: xsUrl,
                md: mdUrl,
                lg: lgUrl
            }
        };

    } catch (e) {
        console.error(`Error processing image ${externalUrl}:`, e);
        return null;
    }
}

async function run() {
    console.log("Fetching products with external images...");
    const { data, error } = await supabase.from('products').select('id, sku, image, images, image_metadata');
    if(error) { console.error(error); return; }
    
    const productsToMigrate = data.filter(item => {
        let hasExternal = false;
        if(item.image && !item.image.includes('storage.yandexcloud.net') && !item.image.startsWith('/') && !item.image.toLowerCase().includes('.mp4')) hasExternal = true;
        if(Array.isArray(item.images)) {
            for(let img of item.images) {
                if(img && !img.includes('storage.yandexcloud.net') && !img.startsWith('/') && !img.toLowerCase().includes('.mp4')) hasExternal = true;
            }
        }
        return hasExternal;
    });

    console.log(`Found ${productsToMigrate.length} products to migrate. Starting processing...`);

    let count = 0;
    for(let item of productsToMigrate) {
        console.log(`Processing [${count+1}/${productsToMigrate.length}] SKU: ${item.sku}`);
        
        // Collect all unique external images to migrate for this product
        let urlsToProcess = new Set();
        if(item.image && !item.image.includes('storage.yandexcloud.net') && !item.image.startsWith('/') && !item.image.toLowerCase().includes('.mp4')) urlsToProcess.add(item.image);
        if(Array.isArray(item.images)) {
            for(let img of item.images) {
                if(img && !img.includes('storage.yandexcloud.net') && !img.startsWith('/') && !img.toLowerCase().includes('.mp4')) urlsToProcess.add(img);
            }
        }
        
        let urlMap = {}; // mapping from old external url -> new main url
        let newMetadataObj = item.image_metadata ? { ...item.image_metadata } : {};
        
        for(let oldUrl of urlsToProcess) {
            const result = await processAndUploadImage(oldUrl);
            if(result) {
                urlMap[oldUrl] = result.mainUrl;
                newMetadataObj[result.mainUrl] = result.metadata;
            }
        }
        
        // Reconstruct the new image fields
        let newMainImage = item.image;
        if(urlMap[item.image]) {
            newMainImage = urlMap[item.image];
        } else if (Object.keys(urlMap).length > 0 && !item.image) {
            newMainImage = Object.values(urlMap)[0]; // Fallback if no main image was set
        }
        
        let newImagesArray = Array.isArray(item.images) ? [...item.images] : [];
        for(let i=0; i<newImagesArray.length; i++) {
            if(urlMap[newImagesArray[i]]) {
                newImagesArray[i] = urlMap[newImagesArray[i]];
            }
        }
        
        // Only update if we successfully mapped at least one image
        if(Object.keys(urlMap).length > 0) {
            const { error: updateErr } = await supabase.from('products').update({
                image: newMainImage,
                images: newImagesArray,
                image_metadata: newMetadataObj
            }).eq('id', item.id);
            
            if(updateErr) {
                console.error(`Failed to update DB for SKU ${item.sku}:`, updateErr);
            } else {
                console.log(`   -> Successfully migrated images for ${item.sku}`);
            }
        }
        count++;
    }
    
    console.log(`\nMigration completed!`);
}

run().catch(console.error);
