#!/usr/bin/env node

/**
 * 📚 Archive.org -> Yandex Cloud S3 Kitoblar Migratsiyasi
 * 
 * Ushbu skript Supabase'dagi kitoblarni Archive.org'dan Yandex S3 omboriga
 * avtomatik ko'chiradi va bazadagi havolalarni yangilaydi.
 * 
 * Ishlatish:
 *   node scripts/migrate-archive-to-yandex.mjs --dry-run          (Faqat tekshirish, yuklamaydi)
 *   node scripts/migrate-archive-to-yandex.mjs --limit 5         (Sinov uchun 5 ta kitobni ko'chirish)
 *   node scripts/migrate-archive-to-yandex.mjs --id book-59052   (Aynan bitta kitobni ko'chirish)
 *   node scripts/migrate-archive-to-yandex.mjs --all             (Barcha kitoblarni ko'chirish)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// 1. .env.local yuklash
function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, "utf8");
    const env = {};
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
            process.env[key] = val;
            env[key] = val;
        }
    }
    return env;
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://psacoekfxbvhrkrywreh.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YANDEX_ACCESS_KEY = process.env.YANDEX_S3_ACCESS_KEY;
const YANDEX_SECRET_KEY = process.env.YANDEX_S3_SECRET_KEY;
const YANDEX_BUCKET = process.env.YANDEX_S3_BUCKET || "savdomarketimag";
const YANDEX_REGION = process.env.YANDEX_S3_REGION || "ru-central1";
const YANDEX_HOST = `${YANDEX_BUCKET}.storage.yandexcloud.net`;

if (!SERVICE_KEY || !YANDEX_ACCESS_KEY || !YANDEX_SECRET_KEY) {
    console.error("❌ Xatolik: SUPABASE_SERVICE_ROLE_KEY yoki YANDEX_S3_* kalitlari .env.local ichida to'liq emas!");
    process.exit(1);
}

// 2. Yandex S3 SigV4 Upload Helper
async function uploadToYandexS3(buffer, key, contentType = "application/pdf") {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = date.slice(0, 8);
    const amzDate = date;

    const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const canonicalHeaders = `host:${YANDEX_HOST}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const path = `/${encodedKey}`;

    const canonicalRequest = ["PUT", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${dateStamp}/${YANDEX_REGION}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");

    function hmac(k, str) { return crypto.createHmac("sha256", k).update(str).digest(); }
    const kDate = hmac(`AWS4${YANDEX_SECRET_KEY}`, dateStamp);
    const kRegion = hmac(kDate, YANDEX_REGION);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${YANDEX_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${YANDEX_HOST}${path}`, {
        method: "PUT",
        headers: {
            "x-amz-date": amzDate,
            "x-amz-content-sha256": payloadHash,
            "Authorization": authHeader,
            "Content-Type": contentType,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=31536000, immutable"
        },
        body: buffer
    });

    if (!res.ok) {
        throw new Error(`S3 PUT failed with status ${res.status}: ${await res.text()}`);
    }

    return `https://storage.yandexcloud.net/${YANDEX_BUCKET}/${key}`;
}

// 3. Archive.org Metadata Resolver
async function resolveArchiveFile(identifier) {
    try {
        const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        if (!metaRes.ok) return null;
        const meta = await metaRes.json();
        const files = Array.isArray(meta.files) ? meta.files : [];
        const pdf = files.find(f => (f.format || "").toLowerCase().includes("pdf") || (f.name || "").toLowerCase().endsWith(".pdf"));
        return pdf ? pdf.name : null;
    } catch {
        return null;
    }
}

// 4. Asosiy Migratsiya Jarayoni
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");
    const limitIdx = args.indexOf("--limit");
    const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : (args.includes("--all") ? 10000 : 10);
    const idIdx = args.indexOf("--id");
    const singleId = idIdx !== -1 ? args[idIdx + 1] : null;

    console.log("======================================================");
    console.log("  📚 KUTUBXONA: ARCHIVE.ORG -> YANDEX CLOUD S3 MIGRATE ");
    console.log("======================================================");
    console.log(`Rejim: ${isDryRun ? "DRY-RUN (Faqat ko'rish)" : "JONLI KO'CHIRISH"}`);
    console.log(`Limit: ${limit} ta kitob`);
    if (singleId) console.log(`Aynan kitob ID: ${singleId}`);

    let queryUrl = `${SUPABASE_URL}/rest/v1/products?select=id,name,archive_url,archive_identifier,image&order=id.asc`;
    if (singleId) {
        queryUrl += `&id=eq.${encodeURIComponent(singleId)}`;
    } else {
        queryUrl += `&archive_url=like.*archive.org*&limit=${limit}`;
    }

    const res = await fetch(queryUrl, {
        headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`
        }
    });

    if (!res.ok) {
        console.error("❌ Supabase'dan kitoblarni olib bo'lmadi:", res.status);
        process.exit(1);
    }

    const books = await res.json();
    console.log(`\nAniqlangan kitoblar soni: ${books.length} ta\n`);

    let migrated = 0;
    let failed = 0;

    for (const [idx, book] of books.entries()) {
        const cleanId = book.id;
        console.log(`[${idx + 1}/${books.length}] ${cleanId}: ${book.name}`);

        // Agar allaqachon Yandex'da bo'lsa
        if (book.archive_url && book.archive_url.includes("yandexcloud.net")) {
            console.log("  ✅ Allaqachon Yandex S3 da mavjud, o'tkazib yuborildi.");
            continue;
        }

        // Archive identifikatorini aniqlash
        let identifier = book.archive_identifier;
        if (!identifier && book.archive_url) {
            const m = book.archive_url.match(/archive\.org\/(?:details|embed|download)\/([^/?#]+)/i);
            if (m) identifier = m[1];
        }

        if (!identifier) {
            console.log("  ⚠️ Archive identifikatori topilmadi.");
            failed++;
            continue;
        }

        if (isDryRun) {
            console.log(`  🔍 [DRY-RUN] Identifier: ${identifier} -> Ko'chirilishi kerak`);
            continue;
        }

        try {
            // PDF fayl nomini aniqlash
            console.log(`  ⏳ Archive.org fayl ma'lumotlari olinmoqda (${identifier})...`);
            const fileName = await resolveArchiveFile(identifier);
            if (!fileName) {
                console.log(`  ❌ PDF fayl topilmadi`);
                failed++;
                continue;
            }

            // PDF yuklab olish
            const downloadUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(fileName)}`;
            console.log(`  ⏳ Yuklab olinmoqda: ${fileName}...`);
            const dlRes = await fetch(downloadUrl, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });

            if (!dlRes.ok) {
                console.log(`  ❌ Faylni yuklab bo'lmadi (HTTP ${dlRes.status})`);
                failed++;
                continue;
            }

            const arrayBuf = await dlRes.arrayBuffer();
            const pdfBuffer = Buffer.from(arrayBuf);
            const sizeMb = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
            console.log(`  📦 Yuklandi: ${sizeMb} MB. Yandex S3 ga uzatilmoqda...`);

            // Yandex S3 ga yuklash
            const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
            const s3Key = `books/${cleanId}/${safeFileName}`;
            const yandexUrl = await uploadToYandexS3(pdfBuffer, s3Key, "application/pdf");
            console.log(`  🚀 Yandex S3 manzili: ${yandexUrl}`);

            // Supabase'da yangilash
            const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(cleanId)}`, {
                method: "PATCH",
                headers: {
                    "apikey": SERVICE_KEY,
                    "Authorization": `Bearer ${SERVICE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    archive_url: yandexUrl,
                    file_format: "pdf",
                    file_size_mb: parseFloat(sizeMb)
                })
            });

            if (patchRes.ok) {
                console.log(`  ✅ Baza yangilandi!`);
                migrated++;
            } else {
                console.log(`  ⚠️ S3 ga yuklandi, lekin baza yangilanmadi (${patchRes.status})`);
            }

        } catch (err) {
            console.error(`  ❌ Ko'chirishda xatolik:`, err.message);
            failed++;
        }
    }

    console.log("\n======================================================");
    console.log(`Natija: ${migrated} ta muvaffaqiyatli, ${failed} ta xatolik`);
    console.log("======================================================");
}

main();
