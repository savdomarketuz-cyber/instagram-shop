"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, Minus, Plus } from "lucide-react";
import { useStore } from "@/store/store";
import { Product, CartItem } from "@/types";
import { TranslationKeys } from "@/lib/translations";
import { getProductSlug } from "@/lib/slugify";

const GREEN = "#2D6E3E";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// — Device-aware Next.js Image URL (matches what carousel <Image> actually requests) —
const DEVICE_SIZES = [640, 750, 828, 1080, 1200];
function getCarouselW(): number {
    if (typeof window === "undefined") return 828;
    const physicalPx = Math.ceil(window.innerWidth * 0.85 * (window.devicePixelRatio || 1));
    return DEVICE_SIZES.find(s => s >= physicalPx) ?? 1200;
}
function nextImgUrl(src: string, w: number, q = 75) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

// — Prefetch product images into browser cache via /_next/image proxy —
const prefetchedSet = new Set<string>();
function prefetchProductImages(item: Product, priority: "low" | "high" = "low") {
    if (typeof document === "undefined") return;
    if (prefetchedSet.has(item.id)) return;
    prefetchedSet.add(item.id);

    const w = getCarouselW(); // DPR-aware: iPhone 14 DPR=3 → w=1080, not 640
    const meta = item.image_metadata || {};
    const urls = (item.images || []).filter(Boolean).slice(0, 6);

    urls.forEach((u) => {
        if (u.toLowerCase().endsWith(".mp4")) return;
        // Carousel media.url ni DPR-aware w bilan prefetch (to'liq sifat)
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = nextImgUrl(u, w); // /_next/image?url=<original>&w=<dpr_w>&q=75
        (link as any).fetchPriority = priority;
        document.head.appendChild(link);
    });
}

interface ProductCardProps {
  item: Product;
  language: "uz" | "ru";
  t: TranslationKeys;
  cart: CartItem[];
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  addToCart: (product: Product) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  priority?: boolean;
}

function WishBtn({ isWished, onClick }: { isWished: boolean; onClick: (e: React.MouseEvent) => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer",
        transform: pressed ? "scale(0.85)" : "scale(1)",
        transition: `transform 180ms ${EASE}`,
        WebkitTapHighlightColor: "transparent",
        zIndex: 2,
      }}
    >
      <Heart
        size={16}
        color={isWished ? "#FF3B30" : "#0F1410"}
        fill={isWished ? "#FF3B30" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}

export const ProductCard = memo(({
  item, language, t, cart, wishlist,
  toggleWishlist, addToCart, updateQuantity, removeFromCart,
  priority = false,
}: ProductCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // — Viewport prefetch: card ko'ringanda rasmlarni fonida yuklash —
  useEffect(() => {
    const el = cardRef.current;
    if (!el || prefetchedSet.has(item.id)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          prefetchProductImages(item, "low");
        }
      },
      { threshold: 0.3 } // 30% ko'ringanda boshlaydi
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.id]);

  const isInCart = cart.find(ci => ci.id === item.id);
  const isWished = wishlist.some(w => w.id === item.id);
  const totalStock = item.stockDetails
    ? Object.values(item.stockDetails).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0;

  const mainMedia = item.images?.[0] || item.image || "/placeholder.png";
  const isVideo = mainMedia.toLowerCase().endsWith(".mp4");

  const discount = (item.oldPrice && item.oldPrice > item.price)
    ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
    : 0;

  const badge = discount > 0 ? `-${discount}%` : item.sales > 50 ? "HIT" : null;
  const badgeBg = badge === "HIT" ? "#0F1410" : "#FF3B30";

  const name = (language === "uz" ? item.name_uz : item.name_ru) || item.name;
  const brandName = "";

  const fmtPrice = (n: number) => {
    const s = n.toLocaleString("ru-RU");
    return s + (language === "ru" ? " сум" : " so'm");
  };

  return (
    <div ref={cardRef} style={{
      background: "#fff",
      borderRadius: 22,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 4px 16px rgba(15,20,16,0.05)",
      WebkitTapHighlightColor: "transparent",
      animation: "velari-cart-in 300ms cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {/* Image area */}
      <Link
        href={`/${language}/products/${getProductSlug(item)}`}
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
        prefetch={true}
        onPointerEnter={() => prefetchProductImages(item, "high")}
        onPointerDown={() => prefetchProductImages(item, "high")}
        onTouchStart={() => prefetchProductImages(item, "high")}
        onClick={() => {
          const query = useStore.getState().homeSearchQuery;
          if (query && query.trim().length >= 2) {
            fetch("/api/analytics/search-click", {
              method: "POST",
              body: JSON.stringify({ productId: item.id, query: query.trim() }),
            }).catch(() => null);
          }
        }}
      >
        <div style={{ position: "relative", padding: 12, paddingBottom: 6 }}>
          <div style={{
            position: "relative",
            aspectRatio: "1 / 1",
            borderRadius: 16,
            overflow: "hidden",
            background: "#F5F5F0",
          }}>
            {isVideo ? (
              <video
                src={mainMedia}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                autoPlay muted loop playsInline
              />
            ) : (
              <Image
                src={item.image_metadata?.[mainMedia]?.lowResUrl || mainMedia}
                alt={name}
                fill
                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                style={{ objectFit: "cover" }}
                priority={priority}
                placeholder={item.image_metadata?.[mainMedia]?.blurDataURL ? "blur" : "empty"}
                blurDataURL={item.image_metadata?.[mainMedia]?.blurDataURL}
              />
            )}

            {/* Badge */}
            {badge && (
              <div style={{
                position: "absolute",
                top: 8,
                left: 8,
                padding: "4px 9px",
                borderRadius: 10,
                background: badgeBg,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                zIndex: 2,
              }}>
                {badge}
              </div>
            )}

            <WishBtn
              isWished={isWished}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(item); }}
            />
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "2px 14px 12px" }}>
          {brandName && (
            <div style={{
              fontSize: 10,
              color: "#9AA29C",
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 2,
            }}>
              {brandName}
            </div>
          )}

          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0F1410",
            lineHeight: 1.25,
            letterSpacing: -0.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}>
            {name}
          </div>

          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            <Star size={11} fill="#F6B100" color="#F6B100" />
            <span style={{ fontSize: 11, color: "#5A625C", fontWeight: 600 }}>
              {(item.reviewCount || 0) > 0 ? (item.rating || 0).toFixed(1) : t.common.new}
            </span>
            {(item.reviewCount || 0) > 0 && (
              <>
                <span style={{ fontSize: 11, color: "#9AA29C" }}>·</span>
                <span style={{ fontSize: 11, color: "#9AA29C" }}>{item.reviewCount}</span>
              </>
            )}
          </div>

          {/* Price */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F1410", letterSpacing: -0.3 }}>
              {fmtPrice(item.price)}
            </span>
            {item.oldPrice && item.oldPrice > item.price && (
              <span style={{ fontSize: 12, color: "#9AA29C", textDecoration: "line-through" }}>
                {fmtPrice(item.oldPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Cart controls */}
      <div style={{ padding: "0 12px 12px" }}>
        {isInCart ? (
          <div style={{
            width: "100%",
            height: 42,
            background: "#F5F9F6",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
          }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (isInCart.quantity > 1) updateQuantity(item.id, isInCart.quantity - 1);
                else removeFromCart(item.id);
              }}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: "transparent", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#5A625C",
              }}
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F1410" }}>{isInCart.quantity}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (isInCart.quantity < ((totalStock as number) || 999))
                  updateQuantity(item.id, isInCart.quantity + 1);
              }}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: GREEN, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); addToCart(item); }}
            style={{
              width: "100%",
              height: 42,
              borderRadius: 14,
              background: GREEN,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: -0.1,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(45,110,62,0.25)",
              transition: `transform 150ms ${EASE}`,
              WebkitTapHighlightColor: "transparent",
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.96)"; }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            {language === "uz" ? "Savatga" : "В корзину"}
          </button>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";
