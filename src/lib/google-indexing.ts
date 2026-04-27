import { google } from "googleapis";

/**
 * Google Indexing API Helper
 * 
 * ⚠️ MUHIM: Google Indexing API faqat quyidagi kontent turlari uchun ishlaydi:
 * - JobPosting (ish e'lonlari)
 * - BroadcastEvent (jonli efirlar)
 * 
 * E-commerce sahifalari uchun BU API ISHLAMAYDI!
 * E-commerce uchun quyidagilar ishlatilishi kerak:
 * 1. Google Search Console → Sitemap yuborish
 * 2. IndexNow (Bing/Yandex uchun) → index-now.ts
 * 3. Google Search Console API → URL inspection
 * 
 * Bu fayl faqat kelajakda JobPosting/BroadcastEvent qo'shilganda ishlatiladi.
 */
export async function submitToGoogleIndexing(urls: string[]) {
    try {
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!clientEmail || !privateKey) {
            console.warn("GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY is missing in env.");
            return false;
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/indexing"]
        });

        const indexing = google.indexing("v3");

        // Batch URLs to avoid rate limits (max 200/day for Indexing API)
        const batchSize = 10;
        const results: boolean[] = [];
        
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const promises = batch.map(url => 
                indexing.urlNotifications.publish({
                    auth,
                    requestBody: {
                        url: url,
                        type: "URL_UPDATED"
                    }
                }).catch(error => {
                    // Log individual URL errors but don't fail the batch
                    const errorMessage = error?.response?.data?.error?.message || error.message;
                    console.warn(`Google Indexing API rejected URL: ${url} — ${errorMessage}`);
                    return null;
                })
            );

            const batchResults = await Promise.all(promises);
            results.push(...batchResults.map(r => r !== null));
            
            // Wait between batches to respect rate limits
            if (i + batchSize < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successCount = results.filter(Boolean).length;
        console.log(`Google Indexing API: ${successCount}/${urls.length} URLs submitted successfully`);
        return successCount > 0;
    } catch (error) {
        console.error("Google Indexing API Error:", error);
        return false;
    }
}

/**
 * Ping Google to re-crawl sitemap
 * Bu funksiya Google Webmaster sitemap ping endpoint ni ishlatadi.
 * E-commerce saytlar uchun eng samarali usul!
 */
export async function pingSitemapToGoogle(sitemapUrl: string = "https://velari.uz/sitemap.xml") {
    try {
        const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const response = await fetch(pingUrl, { method: 'GET' });
        
        if (response.ok) {
            console.log(`✅ Google Sitemap ping successful: ${sitemapUrl}`);
            return true;
        } else {
            console.warn(`⚠️ Google Sitemap ping failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error("Google Sitemap ping error:", error);
        return false;
    }
}
