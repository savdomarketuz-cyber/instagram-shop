"use client";

import { useStore } from "@/store/store";
import Link from "next/link";
import { Heart, Trash2, ChevronLeft, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import { getProductSlug } from "@/lib/slugify";
import Image from "next/image";
import { makeVariantLoader, hasVariants } from "@/lib/imageVariants";
import { useStore as useStoreCart } from "@/store/store";

const GREEN = "#2D6E3E";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function WishlistPage() {
    const { wishlist, toggleWishlist, addToCart, cart, updateQuantity, removeFromCart, user, language } = useStore();
    const t = translations[language];
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    const fmtPrice = (n: number) => n.toLocaleString("ru-RU") + (language === "ru" ? " сум" : " so'm");

    if (!user) {
        return (
            <div className="md:hidden" style={{ background: "#FAFAF6", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: 28, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 4px 16px rgba(15,20,16,0.06)" }}>
                    <Heart size={36} color="#D0D5CF" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#9AA29C", marginBottom: 24 }}>{t.common.loginToSeeWishlist}</p>
                <Link href="/login" style={{ display: "inline-block", padding: "14px 32px", background: GREEN, color: "#fff", borderRadius: 27, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 8px 24px rgba(45,110,62,0.28)" }}>
                    {t.account.login}
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* ── MOBILE ── */}
            <div className="md:hidden" style={{ background: "#FAFAF6", minHeight: "100vh", paddingBottom: 100 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 16px" }}>
                    <Link href={`/${language}/catalog`} style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", textDecoration: "none", color: "#0F1410", flexShrink: 0 }}>
                        <ChevronLeft size={20} />
                    </Link>
                    <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6, color: "#0F1410", margin: 0 }}>
                        {t.nav.wishlist}
                    </h1>
                    <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#9AA29C" }}>
                        {wishlist.length} {language === "uz" ? "ta" : "шт"}
                    </span>
                </div>

                {wishlist.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 32px", textAlign: "center" }}>
                        <div style={{ width: 80, height: 80, borderRadius: 28, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 4px 16px rgba(15,20,16,0.06)" }}>
                            <Heart size={36} color="#D0D5CF" />
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: "#9AA29C", marginBottom: 24 }}>{t.common.nothingHereYet}</p>
                        <Link href="/" style={{ display: "inline-block", padding: "14px 32px", background: GREEN, color: "#fff", borderRadius: 27, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 8px 24px rgba(45,110,62,0.28)" }}>
                            {t.common.viewProducts}
                        </Link>
                    </div>
                ) : (
                    <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {wishlist.map((item, idx) => {
                            const name = (language === "uz" ? item.name_uz : item.name_ru) || item.name;
                            const slug = getProductSlug(item);
                            const cartItem = cart.find(c => c.id === item.id);
                            return (
                                <div key={item.id} style={{
                                    background: "#fff", borderRadius: 22, overflow: "hidden",
                                    boxShadow: "0 4px 16px rgba(15,20,16,0.05)",
                                    display: "flex", flexDirection: "column",
                                    animation: `velari-cart-in ${200 + idx * 40}ms ${EASE} both`,
                                    position: "relative",
                                }}>
                                    <Link href={`/${language}/products/${slug}`} style={{ textDecoration: "none" }}>
                                        <div style={{ position: "relative", aspectRatio: "1/1", background: "#F5F5F0" }}>
                                            {(() => {
                                                const u = item.image || item.imageUrl || "/placeholder.png";
                                                return <Image src={u} alt={name} fill sizes="(max-width: 768px) 50vw, 200px" style={{ objectFit: "cover" }} loader={hasVariants(item.image_metadata, u) ? makeVariantLoader(item.image_metadata) : undefined} />;
                                            })()}
                                        </div>
                                        <div style={{ padding: "10px 12px 12px" }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: "#0F1410", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", marginBottom: 6 }}>
                                                {name}
                                            </p>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: "#0F1410", letterSpacing: -0.3 }}>
                                                {fmtPrice(item.price)}
                                            </p>
                                        </div>
                                    </Link>

                                    {/* Remove */}
                                    <button
                                        onClick={() => toggleWishlist(item)}
                                        style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
                                    >
                                        <Heart size={14} color="#FF3B30" fill="#FF3B30" />
                                    </button>

                                    {/* Add to cart */}
                                    <div style={{ padding: "0 12px 12px" }}>
                                        {cartItem ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, background: "#F5F5F0", borderRadius: 12, overflow: "hidden", height: 36 }}>
                                                <button onClick={() => cartItem.quantity > 1 ? updateQuantity(item.id, cartItem.quantity - 1) : removeFromCart(item.id)}
                                                    style={{ flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: "#5A625C", fontSize: 16 }}>−</button>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: "#0F1410", minWidth: 24, textAlign: "center" }}>{cartItem.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                                                    style={{ flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: GREEN, fontSize: 16 }}>+</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart({ ...item, imageUrl: item.imageUrl || item.image } as any)}
                                                style={{ width: "100%", height: 36, borderRadius: 12, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                            >
                                                <ShoppingBag size={14} /> {language === "uz" ? "Savatga" : "В корзину"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── DESKTOP (unchanged) ── */}
            <div className="hidden md:block p-6 bg-white min-h-screen pb-24 w-full">
                <div className="flex items-center justify-between gap-4 mb-8 mt-4 w-full min-w-0">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic truncate min-w-0 flex-1">{t.nav.wishlist}</h1>
                </div>
                {wishlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Heart size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">{t.common.nothingHereYet}</p>
                        <Link href="/" className="mt-4 text-black font-bold border-b-2 border-black">{t.common.viewProducts}</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
                        {wishlist.map((item) => {
                            const name = (language === "uz" ? item.name_uz : item.name_ru) || item.name;
                            return (
                                <div key={item.id} className="relative group">
                                    <Link href={`/${language}/products/${getProductSlug(item)}`} className="block">
                                        <div className="aspect-[3/4] overflow-hidden rounded-[24px] bg-gray-50 mb-3 shadow-sm relative">
                                            {(() => {
                                                const u = item.image || item.imageUrl || "";
                                                return <Image src={u} alt={name} fill sizes="300px" className="object-cover group-hover:scale-105 transition-transform duration-500" loader={hasVariants(item.image_metadata, u) ? makeVariantLoader(item.image_metadata) : undefined} />;
                                            })()}
                                        </div>
                                        <h3 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.5em]">{name}</h3>
                                        <p className="text-sm font-black text-black mt-1">{fmtPrice(item.price)}</p>
                                    </Link>
                                    <button onClick={() => toggleWishlist(item)} className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-2xl text-red-500 shadow-xl active:scale-90 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
