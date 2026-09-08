/**
 * Instagram FlashCache & VideoPreWarmer Web Architecture
 * Ported from Instagram Android APK (com.instagram.flashcache & ReelsViewerVideoPreWarmer)
 * 
 * Ushbu modul videolarning birinchi 1-1.5 MB segmentini (First Data Segment)
 * fonda yuklab, foydalanuvchi keyingi reelga o'tganda videoning 0 soniyada boshlanishini ta'minlaydi.
 */

class VideoPreWarmerService {
    private cacheMap = new Map<string, string>(); // url -> objectUrl
    private pendingFetches = new Set<string>();
    private lruList: string[] = [];
    private readonly MAX_CACHE_SIZE = 6; // Mobil xotirani asrash uchun maksimal 6 ta video obyekti
    private cacheStorageName = "ig-reels-flashcache-v1";

    /**
     * Berilgan video URL uchun Blob URL mavjud bo'lsa uni qaytaradi, aks holda asl URL'ni qaytaradi
     */
    public getVideoSrc(url: string): string {
        if (!url) return "";
        return this.cacheMap.get(url) || url;
    }

    /**
     * Bitta videoni oldindan keshga yuklash (First Segment: ~1.2 MB)
     */
    public async prewarmVideo(url: string, priority: "high" | "low" = "high"): Promise<void> {
        if (!url || typeof window === "undefined" || this.cacheMap.has(url) || this.pendingFetches.has(url)) {
            return;
        }

        if (!url.startsWith("http")) return;

        this.pendingFetches.add(url);

        try {
            let blob: Blob | null = null;
            if ("caches" in window) {
                try {
                    const cache = await caches.open(this.cacheStorageName);
                    const matched = await cache.match(url);
                    if (matched) {
                        blob = await matched.blob();
                    }
                } catch {
                    // Cache API xatolik bersa sokin davom etadi
                }
            }

            if (!blob) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), priority === "high" ? 6000 : 3000);

                const res = await fetch(url, {
                    headers: { Range: "bytes=0-1258291" }, // ~1.2 MB birinchi segment
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (res.ok || res.status === 206) {
                    blob = await res.blob();
                    if ("caches" in window && res.status === 200) {
                        try {
                            const cache = await caches.open(this.cacheStorageName);
                            cache.put(url, new Response(blob.slice(0, blob.size)));
                        } catch {}
                    }
                }
            }

            if (blob) {
                this.evictIfNeeded();
                const objectUrl = URL.createObjectURL(blob);
                this.cacheMap.set(url, objectUrl);
                this.lruList.push(url);
            }
        } catch {
            // Tarmoq xatosi bo'lsa standart URL ishlayveradi
        } finally {
            this.pendingFetches.delete(url);
        }
    }

    /**
     * Navbatdagi va oldingi videolarni aqlli tartibda isitib qo'yish (Prewarm Upcoming)
     */
    public prewarmUpcoming(urls: string[], activeIndex: number) {
        if (!urls || urls.length === 0) return;

        // 1-ustuvorlik: Keyingi video
        const next1 = urls[activeIndex + 1];
        if (next1) {
            this.prewarmVideo(next1, "high");
        }

        // 2-ustuvorlik: Undan keyingi video
        const next2 = urls[activeIndex + 2];
        if (next2) {
            setTimeout(() => this.prewarmVideo(next2, "low"), 350);
        }

        // 3-ustuvorlik: Oldingi video
        const prev1 = urls[activeIndex - 1];
        if (prev1) {
            setTimeout(() => this.prewarmVideo(prev1, "low"), 700);
        }
    }

    /**
     * Mobil qurilma xotirasini bo'shatish (Memory Eviction)
     */
    private evictIfNeeded() {
        while (this.lruList.length >= this.MAX_CACHE_SIZE) {
            const oldestUrl = this.lruList.shift();
            if (oldestUrl) {
                const objUrl = this.cacheMap.get(oldestUrl);
                if (objUrl) {
                    URL.revokeObjectURL(objUrl);
                    this.cacheMap.delete(oldestUrl);
                }
            }
        }
    }

    /**
     * Taktil haptic vibratsiya berish (Instagram mobil ilovasi kabi)
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
