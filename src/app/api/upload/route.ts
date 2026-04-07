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

        let fileBuffer: Buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
        let finalContentType = file.type || "image/jpeg";
        let blurDataURL = "";

        // 🟢 PRE-PROCESSING: Optimize Images with Sharp
        if (file.type.startsWith("image/") && !file.type.includes("dynamic") && !file.type.includes("gif") && !file.type.includes("svg")) {
            try {
                const image = sharp(fileBuffer);
                const metadata = await image.metadata();

                // 1. Generate ultra-low res blur placeholder (10px)
                const blurBuffer = await image
                    .clone()
                    .resize(20, 20, { fit: "cover" })
                    .blur(5)
                    .toFormat("webp", { quality: 20 })
                    .toBuffer();
                blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

                // 2. Optimize Main Image: Max 1200px width, convert to WebP
                const processedImage = image
                    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
                    .toFormat("webp", { quality: 85, effort: 6 });
                
                fileBuffer = await processedImage.toBuffer();
                finalContentType = "image/webp";
                
                // Force .webp extension if not present
                if (fileName && !fileName.toLowerCase().endsWith(".webp")) {
                    fileName = fileName.substring(0, fileName.lastIndexOf(".")) + ".webp";
                }
            } catch (err) {
                console.error("Sharp processing failed, falling back to original:", err);
            }
        }

        const { ACCESS_KEY, SECRET_KEY, BUCKET, REGION } = YANDEX_CONFIG;
        const finalFileName = fileName || file.name || `file_${Date.now()}`;

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
        const dateStamp = amzDate.slice(0, 8);

        const safeFileName = `${Date.now()}-${finalFileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileKey = `uploads/${safeFileName}`;
        const host = "storage.yandexcloud.net";
        const url = `https://${host}/${BUCKET}/${fileKey}`;

        const method = "PUT";
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

        if (fileBuffer.byteLength > 8 * 1024 * 1024) {
             return NextResponse.json({ error: "Processed file still too large (Max 8MB)" }, { status: 413 });
        }

        const uploadResponse = await fetch(url, {
            method: method,
            headers: {
                "x-amz-date": amzDate,
                "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
                "Authorization": authorizationHeader,
                "Content-Type": finalContentType
            },
            body: fileBuffer as any
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error("Yandex S3 Error:", errorBody);
            return NextResponse.json(
                { error: `S3 Error: ${uploadResponse.status} - ${errorBody.slice(0, 50)}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ url, blurDataURL });
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

