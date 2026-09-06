\"use client\";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/store";

/**
 * DynamicFavicon
 * Brauzer tabidagi favikon atrofida zamonaviy bo'lingan texnologik aylanani (tech orbital ring)
 * mayinlik bilan aylantirib (spin) turadi va savatda tovar bo'lsa jonli nishon chiqaradi.
 */
export default function DynamicFavicon() {
    const cart = useStore((state) => state.cart);
    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const angleRef = useRef<number>(0);
    const animFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "shortcut icon";
            document.head.appendChild(link);
        }

        const canvas = document.createElement("canvas");
        const size = 64; // Ultra HD 64x64 favicon canvas
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const center = size / 2;
        const outerR = 29;
        const coreR = 23;

        let lastTime = performance.now();

        const renderFrame = (now: number) => {
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            // Aylanish tezligi: 1 sekundda ~45 daraja
            angleRef.current = (angleRef.current + delta * 0.8) % (Math.PI * 2);

            ctx.clearRect(0, 0, size, size);

            // 1. Aylana atrofidagi Bo'lingan Texnologik Halqa (Segmented Tech Ring)
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angleRef.current);

            // Yupqa yo'naltiruvchi halqa
            ctx.beginPath();
            ctx.arc(0, 0, outerR, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(45, 110, 62, 0.25)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // 6 ta bo'lingan chiziqli arklar
            const segments = 6;
            const segAngle = (Math.PI * 2) / segments;
            const arcLength = segAngle * 0.65; // Har bir segmentning uzunligi

            ctx.strokeStyle = "#2D6E3E"; // Velari Emerald
            ctx.lineWidth = 2.4;
            ctx.lineCap = "round";

            for (let i = 0; i < segments; i++) {
                const start = i * segAngle;
                const end = start + arcLength;

                ctx.beginPath();
                ctx.arc(0, 0, outerR, start, end);
                ctx.stroke();

                // Segment boshidagi neon yashil cyber nuqta
                const dotX = (outerR) * Math.cos(start - 0.12);
                const dotY = (outerR) * Math.sin(start - 0.12);
                ctx.beginPath();
                ctx.arc(dotX, dotY, 1.4, 0, Math.PI * 2);
                ctx.fillStyle = "#10B981";
                ctx.fill();
            }
            ctx.restore();

            // 2. Markazdagi Toza Oq Doira (Core White Circle)
            ctx.beginPath();
            ctx.arc(center, center, coreR, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();

            // 3. Markaziy VELARI. Yozuvi
            ctx.fillStyle = "#0F1410";
            ctx.font = "900 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.letterSpacing = "-0.3px";
            
            // VELARI
            ctx.fillText("VELARI", center - 1.5, center + 0.5);

            // Yashil nuqta .
            ctx.fillStyle = "#2D6E3E";
            ctx.beginPath();
            ctx.arc(center + 19, center + 2.5, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 4. Savatda tovar bo'lsa Jonli Qizil Nishon (Cart Badge)
            if (cartCount > 0) {
                const badgeRadius = 9;
                const badgeX = size - badgeRadius - 1;
                const badgeY = badgeRadius + 1;

                // Oq chegara
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeRadius + 1.5, 0, Math.PI * 2);
                ctx.fillStyle = "#FFFFFF";
                ctx.fill();

                // Qizil nishon
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                ctx.fillStyle = "#EF4444";
                ctx.fill();

                // Son
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(cartCount > 9 ? "9+" : cartCount.toString(), badgeX, badgeY + 0.5);
            }

            if (link) {
                link.href = canvas.toDataURL("image/png");
            }

            // Foydalanuvchi tabda bo'lsa animatsiya davom etadi (~15 FPS tejamkor rejim)
            if (!document.hidden) {
                animFrameRef.current = window.setTimeout(() => {
                    requestAnimationFrame(renderFrame);
                }, 60); // 15 FPS: 0% CPU sarfi bilan juda mayin
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                lastTime = performance.now();
                requestAnimationFrame(renderFrame);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        requestAnimationFrame(renderFrame);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (animFrameRef.current) clearTimeout(animFrameRef.current);
        };
    }, [cartCount]);

    return null;
}
