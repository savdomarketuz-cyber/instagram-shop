const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const YANDEX = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET: process.env.YANDEX_S3_BUCKET || "savdomarketimag",
    REGION: process.env.YANDEX_S3_REGION || "ru-central1",
};

// S3 AWSv4 signature logic
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
    const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const headers = {
        "host": host,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate,
    };
    const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join("");
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalRequest = ["PUT", `/${BUCKET}/${key}`, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");

    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256hex(canonicalRequest)}`;

    const kDate = hmacSha256(`AWS4${SECRET_KEY}`, dateStamp);
    const kRegion = hmacSha256(kDate, REGION);
    const kService = hmacSha256(kRegion, "s3");
    const kSigning = hmacSha256(kService, "aws4_request");
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

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

async function uploadFromUrl(url) {
    if(!url || !url.startsWith('http')) return null;
    if(url.includes('yandexcloud.net')) return url;
    
    try {
        console.log('Downloading', url);
        const res = await fetch(url);
        if(!res.ok) return null;
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = res.headers.get('content-type') || 'image/jpeg';
        
        const ext = mime.split('/')[1] || 'jpg';
        const key = `bulk/${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
        const newUrl = await uploadToS3(buffer, key, mime);
        return newUrl;
    } catch(e) {
        console.error('Upload error for', url, e.message);
        return null;
    }
}

// Data Processing
const dir = 'D:/Desktop/Yangi jild/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

let categoriesMap = {};
let brandsMap = {};

async function initMaps() {
    // get existing categories
    const { data: cats } = await supabase.from('categories').select('id, name');
    cats.forEach(c => categoriesMap[c.name.toLowerCase()] = c.id);
    
    // get existing brands
    const { data: brs } = await supabase.from('brands').select('id, name');
    brs.forEach(b => brandsMap[b.name.toLowerCase()] = b.id);
}

async function getOrCreateCategory(catName) {
    if(!catName) return null;
    catName = String(catName);
    const lower = catName.toLowerCase();
    if(categoriesMap[lower]) return categoriesMap[lower];
    
    console.log('Creating category:', catName);
    const { data, error } = await supabase.from('categories').insert({
        id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
        name: catName,
        name_uz: catName,
        name_ru: catName,
        parent_id: '1' // Default to 'Elektronika' for these items
    }).select('id').single();
    if(error) { console.error('Cat error', error); return null; }
    categoriesMap[lower] = data.id;
    return data.id;
}

async function getOrCreateBrand(brandName) {
    if(!brandName) return null;
    brandName = String(brandName);
    const lower = brandName.toLowerCase();
    if(brandsMap[lower]) return brandsMap[lower];
    
    console.log('Creating brand:', brandName);
    const { data, error } = await supabase.from('brands').insert({
        id: crypto.randomUUID(),
        name: brandName
    }).select('id').single();
    if(error) { console.error('Brand error', error); return null; }
    brandsMap[lower] = data.id;
    return data.id;
}

function parseRowData(row) {
    let name = '';
    let imgsRaw = '';
    let desc = '';
    let brandRaw = '';
    let modelRaw = '';
    
    // Find images first
    for(let col=0; col<30; col++) {
        let val = row[col] ? String(row[col]) : '';
        if (val.length > 10 && val.includes('http') && (val.includes('yandex') || val.includes('uzum'))) {
            imgsRaw = val;
            break;
        }
    }
    
    if(!imgsRaw) return null;
    
    // Collect strings for name and description
    let strings = [];
    const junkTexts = ['Ko\'proq ball', 'Maydon qiymati', 'Toifaga kiradi', 'Avtomatik ravishda', 'Ko\'rsatmalarga rioya', 'Bu har qanday raqam', 'Sxemaga e\'tibor', 'Havola (URL)', 'Variantni tanlash', '6000 belgidan', 'Mahsulot filtrga tushishi', 'Agar bir nechta shtrix-kodlar', 'Siz vergul bilan', 'Bu to\'g\'ridan-to\'g\'ri', 'Sizning SKU', 'Mahsulot nomi'];
    
    for(let col=0; col<30; col++) {
        let val = row[col] ? String(row[col]).trim() : '';
        if(val && val !== imgsRaw && val.length > 5 && !val.includes('http')) {
            // Check if it's not a junk instruction text
            let isJunk = junkTexts.some(j => val.includes(j));
            if(!isJunk) {
                strings.push(val);
            }
        }
    }
    
    strings.sort((a,b) => b.length - a.length);
    
    if(strings.length > 0) {
        if(strings[0].length > 100 || strings[0].includes('<p>')) {
            desc = strings[0];
            name = strings[1] || '';
        } else {
            name = strings[0];
            desc = strings[1] || '';
        }
    }
    
    if(!name || name.length < 5) return null;
    
    // Extract brand/model from name
    const bMatch = name.match(/([a-zA-Z]{3,})/);
    if(bMatch) brandRaw = bMatch[1];
    const mMatch = name.match(/([A-Z0-9-]{3,})/);
    if(mMatch) modelRaw = mMatch[1];
    
    let barcodeRaw = `${(brandRaw||'UNKNOWN').toUpperCase()}-${(modelRaw||'1').toUpperCase()}`;
    
    const params = [];
    let images = imgsRaw.split(',').map(s=>s.trim()).filter(Boolean);
    
    return {
       name: name,
       name_ru: name,
       name_uz: name,
       description_ru: desc,
       description_uz: desc,
       brandRaw,
       model: modelRaw,
       barcode: barcodeRaw,
       catName: '', // dynamically set
       price: 0,
       images,
       params
    };
}

async function runImport() {
    await initMaps();
    let count = 0;
    
    for(const f of files) {
        console.log('Processing file:', f);
        const wb = xlsx.readFile(dir + f);
        const data = xlsx.utils.sheet_to_json(wb.Sheets["Mahsulot ma'lumotlari"], {header: 1});
        
        const categoryName = data[0] && data[0][0] ? String(data[0][0]).replace('Kategoriya:', '').replace('Категория:', '').trim() : 'Elektronika';
        
        for(let i=0; i<data.length; i++) {
           if(!data[i]) continue;
           const parsed = parseRowData(data[i]);
           if(!parsed) continue;
           
           parsed.catName = categoryName;
           
           const catId = await getOrCreateCategory(parsed.catName);
           const brandId = await getOrCreateBrand(parsed.brandRaw);
           
           // Upload images
           const finalImages = [];
           for(let url of parsed.images) {
              const s3Url = await uploadFromUrl(url);
              if(s3Url) finalImages.push(s3Url);
           }
           
           // Build HTML parameters
           let htmlParams = '';
           if(parsed.params.length > 0) {
               htmlParams = '<ul>' + parsed.params.map(p => `<li><strong>${p.name_uz}:</strong> ${p.value}</li>`).join('') + '</ul>';
           }
           
           let productData = {
              id: crypto.randomUUID(),
              name: parsed.name,
              name_uz: parsed.name_uz,
              name_ru: parsed.name_ru,
              description_uz: parsed.description_uz + (htmlParams ? '<br><h3>Xususiyatlari</h3>' + htmlParams : ''),
              description_ru: parsed.description_ru + (htmlParams ? '<br><h3>Характеристики</h3>' + htmlParams : ''),
              category_id: catId,
              brand_id: brandId,
              model: parsed.model,
              barcode: parsed.barcode,
              price: parseFloat(parsed.price) || 0,
              stock: 100,
              images: finalImages,
              image: finalImages[0] || null,
              sku: Math.random().toString(36).substring(2, 10).toUpperCase(),
              group_id: `bulk-${parsed.brandRaw}-${parsed.model}`.toLowerCase(),
              is_deleted: false,
              created_at: new Date().toISOString()
           };
           
           const { data: insertedProd, error: pErr } = await supabase.from('products').insert(productData).select('id').single();
           if(pErr) {
               console.error('Failed to insert product', parsed.name, pErr.message);
           } else {
               count++;
               console.log(`Inserted ${count}: ${parsed.name}`);
           }
        }
    }
    
    console.log(`\nImport complete! Total inserted: ${count}`);
}

runImport().catch(console.error);
