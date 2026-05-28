import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt-utils";
import sharp from "sharp";

export const maxDuration = 60; // Vercel: max 60s on Hobby, 300s on Pro

// — Yandex S3 config —
const YANDEX = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET:     process.env.YANDEX_S3_BUCKET     || "savdomarketimag",
    REGION:     process.env.YANDEX_S3_REGION     || "ru-central1",
};

// — AWS-v4 signing helpers —
async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        typeof key === "string" ? enc.encode(key) : key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

async function sha256hex(data: string | ArrayBuffer): Promise<string> {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX;
    const host = "storage.yandexcloud.net";
    const now = new Date();
    const amzDate  = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const headers: Record<string, string> = {
        "host": host,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate,
    };
    const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join("");
    const signedHeaders    = Object.keys(headers).sort().join(";");
    const canonicalRequest = ["PUT", `/${BUCKET}/${key}`, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");

    const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
    const stringToSign    = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

    const kDate    = await hmacSha256(`AWS4${SECRET_KEY}`, dateStamp);
    const kRegion  = await hmacSha256(kDate, REGION);
    const kService = await hmacSha256(kRegion, "s3");
    const kSigning = await hmacSha256(kService, "aws4_request");
    const sigBuf   = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

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
        body: buffer as any,
    });
    if (!res.ok) throw new Error(await res.text());
    return `https://${host}/${BUCKET}/${key}`;
}

export async function POST(req: NextRequest) {
    // — Admin auth only —
    const adminToken  = req.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || "default-secret";
    const payload = adminToken ? await verifyJwt(adminToken, ADMIN_SECRET) : null;
    if (!payload) {
        return NextResponse.json({ error: "Admin ruxsati kerak" }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "FormData o'qib bo'lmadi" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Fayl yo'q" }, { status: 400 });

    // — Size limit: 300 MB —
    const MAX = 300 * 1024 * 1024;
    if (file.size > MAX) {
        return NextResponse.json({ error: `Fayl juda katta (Max: 300 MB)` }, { status: 400 });
    }

    try {
        const rawBuffer = await file.arrayBuffer();
        const sourceBuffer: Buffer = Buffer.from(new Uint8Array(rawBuffer));
        let buffer: Buffer = sourceBuffer;
        let mime    = file.type || "application/octet-stream";
        const rawName = (formData.get("fileName") as string | null) || file.name || `file_${Date.now()}`;
        const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ts = Date.now();

        let blurDataURL = "";
        let lowResBuf: Buffer | null = null;
        let xsBuf: Buffer | null = null;
        let mdBuf: Buffer | null = null;
        let lgBuf: Buffer | null = null;

        if (mime.startsWith("image/") && !mime.includes("gif") && !mime.includes("svg")) {
            try {
                const img = sharp(sourceBuffer);

                const blurBuf = await img.clone()
                    .resize(20, 20, { fit: "cover" })
                    .blur(5)
                    .toFormat("webp", { quality: 20 })
                    .toBuffer();
                blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

                buffer = await img.clone()
                    .resize(1080, 1440, { fit: "inside", withoutEnlargement: true })
                    .toFormat("avif", { quality: 75, effort: 3 })
                    .toBuffer();
                mime = "image/avif";

                lowResBuf = await img.clone()
                    .resize(360, 480, { fit: "cover" })
                    .toFormat("webp", { quality: 40, effort: 6 })
                    .toBuffer();

                [xsBuf, mdBuf, lgBuf] = await Promise.all([
                    img.clone().resize({ width: 640,  withoutEnlargement: true }).toFormat("webp", { quality: 78, effort: 4 }).toBuffer(),
                    img.clone().resize({ width: 828,  withoutEnlargement: true }).toFormat("webp", { quality: 80, effort: 4 }).toBuffer(),
                    img.clone().resize({ width: 1080, withoutEnlargement: true }).toFormat("webp", { quality: 82, effort: 4 }).toBuffer(),
                ]);
            } catch { /* sharp failed – upload original */ }
        }

        let folder = "admin/misc";
        if (mime.startsWith("image/"))  folder = "admin/images";
        if (mime.startsWith("audio/"))  folder = "admin/audio";
        if (mime.startsWith("video/"))  folder = "admin/video";

        const ext = mime.startsWith("image/") ? "avif" : safeName.split(".").pop() || "bin";
        const baseNoExt = safeName.split(".")[0];
        const key = `${folder}/${ts}_${baseNoExt}.${ext}`;

        const url = await uploadToS3(buffer, key, mime);

        let lowResUrl: string | undefined, xsUrl: string | undefined, mdUrl: string | undefined, lgUrl: string | undefined;
        const extras: Promise<void>[] = [];
        if (lowResBuf) extras.push(uploadToS3(lowResBuf, `${folder}/${ts}_${baseNoExt}_thumb.webp`, "image/webp").then(u => { lowResUrl = u; }));
        if (xsBuf)     extras.push(uploadToS3(xsBuf,     `${folder}/${ts}_${baseNoExt}_xs.webp`,    "image/webp").then(u => { xsUrl = u; }));
        if (mdBuf)     extras.push(uploadToS3(mdBuf,     `${folder}/${ts}_${baseNoExt}_md.webp`,    "image/webp").then(u => { mdUrl = u; }));
        if (lgBuf)     extras.push(uploadToS3(lgBuf,     `${folder}/${ts}_${baseNoExt}_lg.webp`,    "image/webp").then(u => { lgUrl = u; }));
        if (extras.length) await Promise.all(extras);

        return NextResponse.json({ url, blurDataURL: blurDataURL || undefined, lowResUrl, xs: xsUrl, md: mdUrl, lg: lgUrl });

    } catch (err: any) {
        console.error("Admin upload error:", err);
        return NextResponse.json({ error: `Yuklash xatosi: ${err.message}` }, { status: 500 });
    }
}
