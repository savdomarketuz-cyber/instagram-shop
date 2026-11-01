"use client";

import { useEffect } from "react";
import { useStore } from "@/store/store";

/**
 * DynamicFavicon
 * Do'kon uchun: Toza oppoq dumaloq favikonda katta qalin VELARI. yozuvi va savat nishoni.
 * Kutubxona uchun: Elegant zumrad kitob va oltin xatcho'p (bookmark) belgisi.
 */
export default function DynamicFavicon() {
    const cart = useStore((state) => state.cart);
    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const isLibrary = process.env.NEXT_PUBLIC_APP_THEME === "library" || 
            window.location.host.includes("book") || 
            window.location.host.includes("kutubxona");

        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "shortcut icon";
            document.head.appendChild(link);
        }

        const canvas = document.createElement("canvas");
        const size = 64; // Ultra HD 64x64 canvas
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const center = size / 2;

        if (isLibrary) {
            // --- KUTUBXONA FAVIKONI (Zamonaviy zumrad kitob) ---
            ctx.clearRect(0, 0, size, size);

            // Dumaloq orqa fon
            ctx.beginPath();
            ctx.arc(center, center, size / 2 - 1, 0, Math.PI * 2);
            ctx.fillStyle = "#0F172A";
            ctx.fill();

            // Kitob varaqlari (yashil gradient)
            const bookGrad = ctx.createLinearGradient(14, 14, 50, 50);
            bookGrad.addColorStop(0, "#10B981");
            bookGrad.addColorStop(1, "#059669");

            ctx.fillStyle = bookGrad;
            // Chap sahifa
            ctx.beginPath();
            ctx.roundRect(14, 18, 16, 28, 4);
            ctx.fill();

            // O'ng sahifa
            ctx.beginPath();
            ctx.roundRect(34, 18, 16, 28, 4);
            ctx.fill();

            // Oltin xatcho'p (ribbon)
            ctx.fillStyle = "#F59E0B";
            ctx.beginPath();
            ctx.moveTo(30, 16);
            ctx.lineTo(34, 16);
            ctx.lineTo(34, 38);
            ctx.lineTo(32, 35);
            ctx.lineTo(30, 38);
            ctx.closePath();
            ctx.fill();

            if (link) {
                link.href = canvas.toDataURL("image/png");
            }
            return;
        }

        // --- DO'KON FAVIKONI (Oq fonda VELARI.) ---
        const radius = size / 2 - 0.5;
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.fillStyle = "#0F1410";
        ctx.font = "900 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "-0.4px";

        ctx.fillText("VELARI", center - 2, center + 1);

        ctx.fillStyle = "#2D6E3E";
        ctx.beginPath();
        ctx.arc(center + 26, center + 3.5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        if (cartCount > 0) {
            const badgeRadius = 10;
            const badgeX = size - badgeRadius - 0.5;
            const badgeY = badgeRadius + 0.5;

            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius + 2, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#EF4444";
            ctx.fill();

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(cartCount > 9 ? "9+" : cartCount.toString(), badgeX, badgeY + 0.5);
        }

        if (link) {
            link.href = canvas.toDataURL("image/png");
        }
    }, [cartCount]);

    return null;
}
