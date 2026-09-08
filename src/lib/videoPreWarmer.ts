/**
 * VideoPreWarmer & Haptic Engine for Reels
 * Direct native HTTP streaming with zero blob truncation.
 */

class VideoPreWarmerService {
    private prewarmedSet = new Set<string>();

    constructor() {
        if (typeof window !== "undefined" && "caches" in window) {
            // Clear any broken 1.2MB partial cache from before
            caches.delete("ig-reels-flashcache-v1").catch(() => {});
        }
    }

    /**
     * Always returns direct video URL for native GPU-accelerated Range streaming
     */
    public getVideoSrc(url: string): string {
        return url || "";
    }

    /**
     * Prewarm video by requesting metadata in background
     */
    public prewarmVideo(url: string): void {
        if (!url || typeof window === "undefined" || this.prewarmedSet.has(url)) {
            return;
        }
        if (!url.startsWith("http")) return;

        this.prewarmedSet.add(url);

        try {
            const v = document.createElement("video");
            v.preload = "metadata";
            v.src = url;
        } catch {}
    }

    /**
     * Prewarm next video in background
     */
    public prewarmUpcoming(urls: string[], activeIndex: number) {
        if (!urls || urls.length === 0) return;

        const next1 = urls[activeIndex + 1];
        if (next1) this.prewarmVideo(next1);

        const next2 = urls[activeIndex + 2];
        if (next2) setTimeout(() => this.prewarmVideo(next2), 400);
    }

    /**
     * Taktil haptic feedback
     */
    public triggerHaptic(type: "light" | "medium" | "double" = "light") {
        if (typeof window === "undefined" || !("vibrate" in navigator)) return;
        try {
            if (type === "light") {
                navigator.vibrate(8);
            } else if (type === "medium") {
                navigator.vibrate(15);
            } else if (type === "double") {
                navigator.vibrate([10, 40, 15]);
            }
        } catch {}
    }
}

export const videoPreWarmer = new VideoPreWarmerService();
