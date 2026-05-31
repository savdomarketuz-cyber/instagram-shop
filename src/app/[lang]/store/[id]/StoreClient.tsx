"use client";

import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store/store";
import { translations } from "@/lib/translations";
import { ProductGrid } from "@/components/home/ProductGrid";
import { ChevronLeft, Store as StoreIcon } from "lucide-react";
import type { Product } from "@/types";

const GREEN = "#2D6E3E";

interface Props {
    warehouse: { id: string; name: string; logo: string | null; address: string | null };
    products: Product[];
    language: "uz" | "ru";
}

export default function StoreClient({ warehouse, products, language }: Props) {
    const router = useRouter();
    const { cart, wishlist, user, addToCart, updateQuantity, removeFromCart, toggleWishlist } = useStore(
        useShallow((s) => ({
            cart: s.cart,
            wishlist: s.wishlist,
            user: s.user,
            addToCart: s.addToCart,
            updateQuantity: s.updateQuantity,
            removeFromCart: s.removeFromCart,
            toggleWishlist: s.toggleWishlist,
        }))
    );
    const t = translations[language];

    return (
        <div style={{ minHeight: "100vh", background: "#FAFAF6" }}>
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-6 md:pt-28 pb-24">
                {/* Orqaga */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-gray-500 font-bold text-sm mb-5 hover:text-black transition-colors"
                >
                    <ChevronLeft size={20} /> {language === "uz" ? "Orqaga" : "Назад"}
                </button>

                {/* Do'kon sarlavhasi */}
                <div
                    className="flex items-center gap-5 p-6 md:p-8 rounded-[32px] mb-8"
                    style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#F2F8F3 100%)", border: "1px solid #E6EFE8", boxShadow: "0 8px 28px rgba(45,110,62,0.06)" }}
                >
                    <div
                        className="shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ width: 88, height: 88, borderRadius: 24, background: warehouse.logo ? "#fff" : GREEN, boxShadow: "0 6px 18px rgba(15,20,16,0.1)" }}
                    >
                        {warehouse.logo ? (
                            <img src={warehouse.logo} alt={warehouse.name} className="w-full h-full object-cover" />
                        ) : (
                            <StoreIcon size={38} color="#fff" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <StoreIcon size={13} color={GREEN} strokeWidth={2.4} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: 0.6, textTransform: "uppercase" }}>
                                {language === "uz" ? "Do'kon" : "Магазин"}
                            </span>
                        </div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F1410", letterSpacing: -0.6, lineHeight: 1.1, margin: 0 }} className="truncate">
                            {warehouse.name}
                        </h1>
                        {warehouse.address && (
                            <p style={{ fontSize: 13, color: "#7A857C", fontWeight: 500, marginTop: 4 }} className="truncate">
                                {warehouse.address}
                            </p>
                        )}
                        <p style={{ fontSize: 12, color: "#9AA29C", fontWeight: 700, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            {products.length} {language === "uz" ? "ta mahsulot" : "товаров"}
                        </p>
                    </div>
                </div>

                {/* Mahsulotlar */}
                <ProductGrid
                    products={products}
                    loading={false}
                    language={language}
                    t={t}
                    cart={cart}
                    wishlist={wishlist}
                    user={user}
                    toggleWishlist={toggleWishlist}
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                />
            </div>
        </div>
    );
}
