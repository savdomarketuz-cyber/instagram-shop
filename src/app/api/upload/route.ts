import { NextRequest, NextResponse } from "next/server";

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
        const fileName = formData.get("fileName") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

        const fileBuffer = await file.arrayBuffer();

        if (fileBuffer.byteLength > 4.5 * 1024 * 1024) {
             return NextResponse.json({ error: "File too large (Max 4.5MB)" }, { status: 413 });
        }

        const uploadResponse = await fetch(url, {
            method: method,
            headers: {
                "x-amz-date": amzDate,
                "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
                "Authorization": authorizationHeader,
                "Content-Type": file.type || "image/jpeg"
            },
            body: fileBuffer
        });

        if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.error("Yandex S3 Error:", errorBody);
            return NextResponse.json(
                { error: `S3 Error: ${uploadResponse.status} - ${errorBody.slice(0, 50)}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ url });
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

