import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const YANDEX_CONFIG = {
    ACCESS_KEY: process.env.YANDEX_S3_ACCESS_KEY || "",
    SECRET_KEY: process.env.YANDEX_S3_SECRET_KEY || "",
    BUCKET: process.env.YANDEX_S3_BUCKET || "savdomarketimag",
    REGION: process.env.YANDEX_S3_REGION || "ru-central1",
};

async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
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

async function hashSha256(data: string | ArrayBuffer): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        let fileName = formData.get("fileName") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        let originalBuffer: Buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
        let lowResBuffer: Buffer | null = null;
        let finalContentType = "image/webp";
        let blurDataURL = "";

        // 🟢 PRE-PROCESSING: Optimize Images with Sharp
        if (file.type.startsWith("image/") && !file.type.includes("dynamic") && !file.type.includes("gif") && !file.type.includes("svg")) {
            try {
                const image = sharp(originalBuffer);
                
                // 1. Generate ultra-low res blur placeholder (base64)
                const blurBuffer = await image
                    .clone()
                    .resize(20, 20, { fit: "cover" })
                    .blur(5)
                    .toFormat("webp", { quality: 20 })
                    .toBuffer();
                blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

                // 2. Generate Original (1080x1440px, Q80)
                originalBuffer = await image
                    .clone()
                    .resize(1080, 1440, { fit: "cover" })
                    .toFormat("webp", { quality: 80, effort: 6 })
                    .toBuffer();

                // 3. Generate Thumbnail (360x480px, Q40) - Maximum Compression for Grid Speed
                lowResBuffer = await image
                    .clone()
                    .resize(360, 480, { fit: "cover" })
                    .toFormat("webp", { quality: 40, effort: 6, smartSubsample: true })
                    .toBuffer();


                // Force .webp extension
                if (fileName) {
                    const dotIndex = fileName.lastIndexOf(".");
                    fileName = (dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName) + ".webp";
                } else {
                    fileName = `image_${Date.now()}.webp`;
                }

            } catch (err) {
                console.error("Sharp processing failed:", err);
            }
        }

        const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX_CONFIG;
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
        const dateStamp = amzDate.slice(0, 8);
        const host = "storage.yandexcloud.net";

        const uploadToS3 = async (buffer: Buffer, key: string) => {
            const method = "PUT";
            const canonicalUri = `/${BUCKET}/${key}`;
            const canonicalQueryString = "";
            const headersConfig: Record<string, string> = {
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
                    "Content-Type": "image/webp"
                },
                body: buffer as any
            });
            if (!res.ok) throw new Error(await res.text());
            return `https://${host}${canonicalUri}`;
        };

        const safeBaseName = (fileName || "image.webp").replace(/[^a-zA-Z0-9.-]/g, "_");
        const timestamp = Date.now();
        
        // Parallel Uploads
        const uploadPromises = [
            uploadToS3(originalBuffer, `uploads/${timestamp}_original_${safeBaseName}`)
        ];

        if (lowResBuffer) {
            uploadPromises.push(uploadToS3(lowResBuffer, `uploads/${timestamp}_thumb_${safeBaseName}`));
        }

        const [originalUrl, thumbUrl] = await Promise.all(uploadPromises);

        return NextResponse.json({ 
            url: originalUrl, 
            lowResUrl: thumbUrl || originalUrl, 
            blurDataURL 
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: `Upload failed: ${error.message || "Unknown error"}` }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest) {
    try {
        const { fileUrl } = await req.json();

        if (!fileUrl || !fileUrl.includes("yandexcloud.net")) {
            return NextResponse.json({ success: true, note: "Not a Yandex S3 URL" });
        }

        const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX_CONFIG;
        const host = "storage.yandexcloud.net";

        const urlParts = new URL(fileUrl);
        const fileKey = decodeURIComponent(urlParts.pathname.replace(`/${BUCKET}/`, '').replace(/^\//, ''));

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
        const dateStamp = amzDate.slice(0, 8);

        const method = "DELETE";
        const canonicalUri = `/${BUCKET}/${fileKey}`;
        const canonicalQueryString = "";

        const headersConfig: Record<string, string> = {
            "host": host,
            "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
            "x-amz-date": amzDate
        };

        const canonicalHeaders = Object.keys(headersConfig)
            .sort()
            .map(key => `${key}:${headersConfig[key]}\n`)
            .join("");

        const signedHeaders = Object.keys(headersConfig).sort().join(";");

        const canonicalRequest = [
            method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"
        ].join("\n");

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

        const authorizationHeader = `${algorithm} Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        const deleteUrl = `https://${host}/${BUCKET}/${fileKey}`;

        const deleteResponse = await fetch(deleteUrl, {
            method: method,
            headers: {
                "x-amz-date": amzDate,
                "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
                "Authorization": authorizationHeader
            }
        });

        if (!deleteResponse.ok) {
            const errorBody = await deleteResponse.text();
            console.error("Yandex S3 Delete Error:", deleteResponse.status, errorBody);
            return NextResponse.json({ success: false, error: "Failed to delete from S3" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

