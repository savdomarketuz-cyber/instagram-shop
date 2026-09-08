/**
 * Video URL Sanitizer
 * Ensures all video URLs with spaces or special characters are properly encoded
 * so mobile browsers (iOS Safari, Android Chrome, WebView) can stream them without syntax rejection.
 */
export function sanitizeVideoUrl(url?: string | null): string {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";

    try {
        const parsed = new URL(trimmed);
        return parsed.toString();
    } catch {
        return encodeURI(trimmed);
    }
}
