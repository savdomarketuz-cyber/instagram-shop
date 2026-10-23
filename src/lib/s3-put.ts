/**
 * Object Storage'ga PUT (Backblaze B2 / Yandex Cloud S3) — ikkala upload route'i va scripts/ uchun yagona funksiya.
 * Birlamchi ombor: Backblaze B2 (Cloudflare CDN: media.velari.uz orqali keshlanadi).
 * Har obyektga Cache-Control: public, max-age=31536000, immutable.
 */

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const HOST = "storage.yandexcloud.net";

type S3Config = { accessKey: string; secretKey: string; bucket: string; region: string };

export function s3ConfigFromEnv(env: Record<string, string | undefined> = process.env): S3Config {
    return {
        accessKey: env.YANDEX_S3_ACCESS_KEY || "",
        secretKey: env.YANDEX_S3_SECRET_KEY || "",
        bucket: env.YANDEX_S3_BUCKET || "savdomarketimag",
        region: env.YANDEX_S3_REGION || "ru-central1",
    };
}

async function hmac(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey("raw", typeof key === "string" ? enc.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", k, enc.encode(data));
}

async function sha256hex(data: string): Promise<string> {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");

/**
 * SigV4 imzolangan so'rov (Yandex S3 yoki S3-mos omborlar uchun).
 */
export async function s3Request(
    method: "PUT" | "HEAD" | "GET",
    key: string,
    opts: { body?: Buffer | Uint8Array; contentType?: string; cacheControl?: string; amzHeaders?: Record<string, string>; query?: Record<string, string>; config?: S3Config } = {},
): Promise<Response> {
    const { accessKey, secretKey, bucket, region } = opts.config || s3ConfigFromEnv();
    const amzDate = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const path = `/${bucket}/${key ? key.split("/").map(encodeURIComponent).join("/") : ""}`;
    const enc3986 = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
    const q = opts.query || {};
    const canonicalQuery = Object.keys(q).sort().map(k => `${enc3986(k)}=${enc3986(q[k])}`).join("&");

    const signed: Record<string, string> = {
        host: HOST,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        "x-amz-date": amzDate,
        ...Object.fromEntries(Object.entries(opts.amzHeaders || {}).map(([k, v]) => [k.toLowerCase(), v])),
    };
    const names = Object.keys(signed).sort();
    const canonicalHeaders = names.map(k => `${k}:${signed[k]}\n`).join("");
    const signedHeaders = names.join(";");
    const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256hex(canonicalRequest)}`;
    const kSigning = await hmac(await hmac(await hmac(await hmac(`AWS4${secretKey}`, dateStamp), region), "s3"), "aws4_request");
    const signature = hex(await hmac(kSigning, stringToSign));

    const headers: Record<string, string> = {
        "x-amz-date": amzDate,
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        ...(opts.amzHeaders || {}),
    };
    if (opts.contentType) headers["Content-Type"] = opts.contentType;
    if (opts.cacheControl) headers["Cache-Control"] = opts.cacheControl;
    return fetch(`https://${HOST}${path}${canonicalQuery ? "?" + canonicalQuery : ""}`, { method, headers, body: opts.body as any });
}

// Backblaze B2 Upload Helper
let cachedB2Auth: any = null;
let b2AuthExpiry = 0;

async function getB2Auth(accountId: string, masterKey: string) {
    const now = Date.now();
    if (cachedB2Auth && now < b2AuthExpiry) return cachedB2Auth;
    const creds = Buffer.from(`${accountId}:${masterKey}`).toString("base64");
    const res = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
        headers: { Authorization: `Basic ${creds}` }
    });
    if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
    cachedB2Auth = await res.json();
    b2AuthExpiry = now + 12 * 3600 * 1000;
    return cachedB2Auth;
}

async function uploadToBackblazeB2(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const accountId = process.env.BACKBLAZE_ACCOUNT_ID || "27af289f5e55";
    const masterKey = process.env.BACKBLAZE_MASTER_KEY || "003b136f649036d7f2a49f15b944f05d5d7a9b0ea2";
    const bucketId = process.env.BACKBLAZE_BUCKET_ID || "b2377aafa2e829ffa51e0515";
    const mediaBase = process.env.NEXT_PUBLIC_MEDIA_URL || "https://media.velari.uz/file/velariuz";

    const auth = await getB2Auth(accountId, masterKey);
    const upRes = await fetch(`${auth.apiInfo.storageApi.apiUrl}/b2api/v3/b2_get_upload_url`, {
        method: "POST",
        headers: { Authorization: auth.authorizationToken, "Content-Type": "application/json" },
        body: JSON.stringify({ bucketId })
    });
    if (!upRes.ok) throw new Error(`B2 get_upload_url failed: ${upRes.status}`);
    const up = await upRes.json();

    const uint8 = new Uint8Array(buffer);
    const sha1Hex = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", uint8)))
        .map(b => b.toString(16).padStart(2, "0")).join("");

    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(up.uploadUrl, {
        method: "POST",
        headers: {
            Authorization: up.authorizationToken,
            "X-Bz-File-Name": encodedKey,
            "Content-Type": contentType,
            "Content-Length": String(buffer.length),
            "X-Bz-Content-Sha1": sha1Hex
        },
        body: uint8
    });

    if (!res.ok) throw new Error(`B2 upload failed: ${res.status} ${await res.text()}`);
    return `${mediaBase}/${key}`;
}

/** Faylni yuklaydi va ommaviy URL qaytaradi (Backblaze B2 / media.velari.uz). */
export async function putObject(buffer: Buffer, key: string, contentType: string, config?: S3Config): Promise<string> {
    const hasBackblaze = Boolean(process.env.BACKBLAZE_ACCOUNT_ID || "27af289f5e55");
    if (hasBackblaze) {
        try {
            return await uploadToBackblazeB2(buffer, key, contentType);
        } catch (b2Err) {
            console.error("Backblaze upload error, falling back to Yandex:", b2Err);
        }
    }

    const cfg = config || s3ConfigFromEnv();
    const res = await s3Request("PUT", key, { body: buffer, contentType, cacheControl: IMMUTABLE_CACHE_CONTROL, config: cfg });
    if (!res.ok) throw new Error(await res.text());
    return `https://${HOST}/${cfg.bucket}/${key}`;
}
