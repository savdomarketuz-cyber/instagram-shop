/**
 * Migration: Mavjud barcha product rasmlari uchun lowResUrl thumbnail generatsiya
 *
 * Ishlatish: node scripts/generate-thumbnails.mjs
 *
 * Nima qiladi:
 * 1. Supabase dan barcha productlarni oladi
 * 2. Her bir rasm uchun lowResUrl yo'q bo'lsa — thumbnail yaratadi
 * 3. 360x480 WebP (quality 40) → Yandex S3 ga yuklaydi
 * 4. image_metadata ni DB da yangilaydi
 */

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_KEY   = process.env.YANDEX_S3_ACCESS_KEY;
const SECRET_KEY   = process.env.YANDEX_S3_SECRET_KEY;
const BUCKET       = process.env.YANDEX_S3_BUCKET || "savdomarketimag";
const REGION       = process.env.YANDEX_S3_REGION || "ru-central1";
const HOST         = "storage.yandexcloud.net";

if (!SUPABASE_URL || !SUPABASE_KEY || !ACCESS_KEY || !SECRET_KEY) {
    console.error("❌ .env.local da kerakli env vars yo'q");
    process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// — AWS V4 HMAC signing —
async function hmac(key, data) {
    const k = typeof key === "string" ? Buffer.from(key, "utf8") : key;
    return crypto.createHmac("sha256", k).update(data).digest();
}
async function sha256hex(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

async function uploadToS3(buffer, key, contentType) {
    const now = new Date();
    const amzDate  = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const datestamp = amzDate.slice(0, 8);

    const headers = {
        "host": HOST,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate,
    };
    const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join("");
    const signedHeaders    = Object.keys(headers).sort().join(";");
    const canonicalRequest = ["PUT", `/${BUCKET}/${key}`, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
    const scope      = `${datestamp}/${REGION}/s3/aws4_request`;
    const stringSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256hex(canonicalRequest)}`;
    const kDate    = await hmac(`AWS4${SECRET_KEY}`, datestamp);
    const kRegion  = await hmac(kDate, REGION);
    const kService = await hmac(kRegion, "s3");
    const kSign    = await hmac(kService, "aws4_request");
    const sig      = crypto.createHmac("sha256", kSign).update(stringSign).digest("hex");
    const auth     = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;

    const res = await fetch(`https://${HOST}/${BUCKET}/${key}`, {
        method: "PUT",
        headers: {
            "x-amz-date": amzDate,
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            "Authorization": auth,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
        },
        body: buffer,
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${await res.text()}`);
    return `https://${HOST}/${BUCKET}/${key}`;
}

async function generateThumb(imageUrl) {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    // 360x480 WebP, quality 40
    const thumb = await sharp(buf)
        .resize(360, 480, { fit: "cover", position: "center" })
        .toFormat("webp", { quality: 40, effort: 6, smartSubsample: true })
        .toBuffer();

    const ts  = Date.now();
    const ext = ".webp";
    const baseName = imageUrl.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") || "img";
    const safe = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const key  = `uploads/thumb_${ts}_${safe}${ext}`;

    const thumbUrl = await uploadToS3(thumb, key, "image/webp");
    return thumbUrl;
}

async function main() {
    console.log("🔍 Supabase dan productlar olinmoqda...");
    const { data: products, error } = await sb
        .from("products")
        .select("id, images, image_metadata")
        .eq("is_deleted", false);

    if (error) { console.error("❌ Supabase error:", error.message); process.exit(1); }
    console.log(`📦 Jami: ${products.length} product\n`);

    let totalImages = 0, generated = 0, skipped = 0, failed = 0;

    for (const product of products) {
        const images = (product.images || []).filter(Boolean);
        const meta   = { ...(product.image_metadata || {}) };
        let changed  = false;

        for (const url of images) {
            if (!url.startsWith("http")) continue;
            if (url.endsWith(".mp4"))    continue;
            totalImages++;

            if (meta[url]?.lowResUrl) {
                skipped++;
                continue; // allaqachon bor
            }

            process.stdout.write(`  📸 ${url.slice(-50)}... `);
            try {
                const thumbUrl = await generateThumb(url);
                meta[url] = { ...meta[url], lowResUrl: thumbUrl };
                changed = true;
                generated++;
                console.log(`✅ ${thumbUrl.slice(-50)}`);
            } catch (e) {
                failed++;
                console.log(`❌ ${e.message?.slice(0, 80)}`);
            }

            // Rate limit: 300ms oralig'
            await new Promise(r => setTimeout(r, 300));
        }

        if (changed) {
            const { error: updateErr } = await sb
                .from("products")
                .update({ image_metadata: meta })
                .eq("id", product.id);

            if (updateErr) {
                console.error(`  ⚠️  DB update xato (${product.id}):`, updateErr.message);
            } else {
                console.log(`  💾 Product ${product.id} yangilandi (${Object.keys(meta).length} rasm)\n`);
            }
        }
    }

    console.log("\n=== NATIJA ===");
    console.log(`Jami rasmlar:    ${totalImages}`);
    console.log(`Yangi thumbnail: ${generated}`);
    console.log(`Allaqachon bor:  ${skipped}`);
    console.log(`Xato:            ${failed}`);
    console.log("\n✅ Tugadi!");
    process.exit(0);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
