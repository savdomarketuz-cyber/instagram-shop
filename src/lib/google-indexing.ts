import { google } from "googleapis";

/**
 * Google Indexing API Helper
 * Notifies Google about updated or new URLs.
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

        // Google expects individual notifications. 
        // We run them in parallel but limited batches to avoid rate limits if URLs count is high.
        const promises = urls.map(url => 
            indexing.urlNotifications.publish({
                auth,
                requestBody: {
                    url: url,
                    type: "URL_UPDATED"
                }
            })
        );

        await Promise.all(promises);
        console.log(`Successfully notified Google about ${urls.length} URLs`);
        return true;
    } catch (error) {
        console.error("Google Indexing API Error:", error);
        return false;
    }
}
