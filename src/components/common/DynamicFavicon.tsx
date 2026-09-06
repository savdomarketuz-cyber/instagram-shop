\"use client\";

import { useEffect } from "react";
import { useStore } from "@/store/store";

/**
 * DynamicFavicon
 * Brauzer tabidagi dumaloq favikonga savatda mahsulot borligida
 * jonli qizil bildirishnoma raqamini (live badge) dinamik chizadi.
 */
export default function DynamicFavicon() {
    const cart = useStore((state) => state.cart);
    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const originalFaviconUrl = "/favicon.ico";

    useEffect(() => {
        if (typeof window === "undefined") return;

        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "shortcut icon";
            document.head.appendChild(link);
        }

        if (cartCount === 0) {
            link.href = originalFaviconUrl;
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = originalFaviconUrl;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 64;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // 1. Asosiy dumaloq favikonni chizamiz
            ctx.drawImage(img, 0, 0, size, size);

            // 2. Yuqori o'ng burchakka jonli qizil bildirishnoma nishoni (Notification Badge)
            const badgeRadius = 15;
            const badgeX = size - badgeRadius - 1;
            const badgeY = badgeRadius + 1;

            // Oq chegara halqasi
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius + 2.5, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();

            // Qizil jonli nishon
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#EF4444";
            ctx.fill();

            // Savatdagi soni
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(cartCount > 9 ? "9+" : cartCount.toString(), badgeX, badgeY + 1);

            if (link) {
                link.href = canvas.toDataURL("image/png");
            }
        };
    }, [cartCount]);

    return null;
}
