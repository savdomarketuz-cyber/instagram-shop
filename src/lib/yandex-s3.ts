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
 * Downloads an image from an external URL and uploads it to Yandex S3
 */
export async function uploadFromUrlToYandexS3(externalUrl: string): Promise<{ url: string; blurDataURL?: string; lowResUrl?: string }> {
    try {
        // If it's already on our S3, don't re-upload
        if (externalUrl.includes("yandexcloud.net")) {
            return { url: externalUrl };
        }

        const response = await fetch(externalUrl);
        if (!response.ok) throw new Error(`External image fetch failed: ${response.statusText}`);

        const blob = await response.blob();
        const fileName = externalUrl.split('/').pop()?.split('?')[0] || 'image.jpg';

        return await uploadToYandexS3(blob, fileName);
    } catch (error) {
        console.error("Failed to proxy image to S3:", error);
        return { url: externalUrl }; // Fallback
    }
}

