import { S3_UPLOAD_ENDPOINT } from "./constants";

/**
 * Upload file to Yandex S3 via server-side API route
 * Maxfiy kalitlar endi serverda — client-da ko'rinmaydi
 */
export async function uploadToYandexS3(file: File | Blob, fileName?: string): Promise<{ url: string; blurDataURL?: string; lowResUrl?: string }> {
    const finalFileName = fileName || (file as File).name || `file_${Date.now()}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", finalFileName);

    const response = await fetch(S3_UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData
    });

    const rawText = await response.text();

    if (!response.ok) {
        let errorMsg = "Upload failed";
        try {
            const error = JSON.parse(rawText);
            errorMsg = error.error || errorMsg;
        } catch {
            errorMsg = rawText.slice(0, 100) || errorMsg;
        }
        throw new Error(errorMsg);
    }

    try {
        const data = JSON.parse(rawText);
        return { url: data.url, blurDataURL: data.blurDataURL, lowResUrl: data.lowResUrl };
    } catch {
        console.error("Non-JSON response from upload API:", rawText);
        throw new Error("Server returned invalid response. Please try again or check file size.");
    }
}


/**
 * Downloads an image from an external URL and uploads it to Yandex S3.
 * Yandex S3 URL bo'lsa — originalini qayta yuklamaydi, faqat thumbnail generatsiya qiladi.
 */
export async function uploadFromUrlToYandexS3(externalUrl: string): Promise<{ url: string; blurDataURL?: string; lowResUrl?: string }> {
    try {
        const isAlreadyOnS3 = externalUrl.includes("yandexcloud.net");

        const response = await fetch(externalUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`External image fetch failed: ${response.statusText}`);

        const blob = await response.blob();
        const fileName = externalUrl.split('/').pop()?.split('?')[0] || 'image.jpg';

        if (isAlreadyOnS3) {
            // Original allaqachon S3 da — faqat thumbnail generatsiya
            const result = await uploadToYandexS3(blob, `thumb_${fileName}`);
            return { url: externalUrl, lowResUrl: result.lowResUrl, blurDataURL: result.blurDataURL };
        }

        // Yangi tashqi URL — to'liq upload (original + thumbnail)
        return await uploadToYandexS3(blob, fileName);
    } catch (error) {
        console.error("Failed to proxy image to S3:", error);
        return { url: externalUrl }; // Fallback
    }
}

