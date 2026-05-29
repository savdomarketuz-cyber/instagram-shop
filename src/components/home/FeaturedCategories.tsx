"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FeaturedCat {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    icon?: string;
    color?: string;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Pastel rang generatsiya — agar kategoriyada rang yo'q bo'lsa
const PALETTE = [
    "#FFE0EC", "#E0E7FF", "#D1FAE5", "#FEF3C7",
    "#FCE7F3", "#DBEAFE", "#ECFDF5", "#FEF9C3",
    "#F3E8FF", "#CFFAFE", "#FEE2E2", "#E0F2FE",
];

export default function FeaturedCategories({ language }: { language: "uz" | "ru" }) {
    const [categories, setCategories] = useState<FeaturedCat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                // 1) Settings'dan featured category ID lar ro'yxatini olish
                const { data: settingsRow } = await supabase
                    .from("settings")
                    .select("value")
                    .eq("id", "featured_categories")
                    .single();

                const ids: string[] = settingsRow?.value?.category_ids || [];
                const showOnHome = settingsRow?.value?.show_on_home !== false;

                if (!showOnHome || ids.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2) Kategoriyalar ma'lumotlarini olish
                const { data: cats } = await supabase
                    .from("categories")
                    .select("id, name, name_uz, name_ru, icon, color")
                    .in("id", ids);

                if (cats) {
                    // settings dagi tartib bo'yicha saralash
                    const sorted = ids
                        .map(id => cats.find(c => c.id === id))
                        .filter(Boolean) as FeaturedCat[];
                    setCategories(sorted);
                }
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        fetchFeatured();
    }, []);

    // Yuklanayotgan paytda skelet ko'rsatmaymiz — agar kategoriyalar admin
    // panelidan sozlanmagan bo'lsa, hech qanday "uzunchoq chiziqlar" chiqmasligi kerak.
    if (loading) return null;

    if (categories.length === 0) return null;

    return (
        <div className="md:hidden" style={{ padding: "16px 20px 0" }}>
            {/* Sarlavha */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 14,
            }}>
                <h2 style={{
                    fontSize: 18, fontWeight: 700, color: "#0F1410",
                    letterSpacing: -0.4, margin: 0,
                }}>
                    {language === "uz" ? "Kategoriyalar" : "Категории"}
                </h2>
                <Link
                    href={`/${language}/catalog`}
                    style={{
                        fontSize: 13, fontWeight: 600, color: "#2D6E3E",
                        textDecoration: "none", display: "flex", alignItems: "center", gap: 2,
                    }}
                >
                    {language === "uz" ? "Barchasi" : "Все"}
                    <ChevronRight size={14} color="#2D6E3E" />
                </Link>
            </div>

            {/* Kategoriyalar qatori */}
            <div
                style={{
                    display: "flex", gap: 14, overflowX: "auto",
                    paddingBottom: 4, scrollbarWidth: "none",
                }}
                className="no-scrollbar"
            >
                {categories.map((cat, idx) => {
                    const bg = cat.color || PALETTE[idx % PALETTE.length];
                    const name = language === "uz"
                        ? (cat.name_uz || cat.name)
                        : (cat.name_ru || cat.name);

                    return (
                        <Link
                            key={cat.id}
                            href={`/${language}/?category=${cat.id}`}
                            style={{
                                flexShrink: 0, display: "flex", flexDirection: "column",
                                alignItems: "center", gap: 8, textDecoration: "none",
                                WebkitTapHighlightColor: "transparent",
                                animation: `velari-cart-in ${200 + idx * 60}ms ${EASE} both`,
                            }}
                        >
                            <div style={{
                                width: 64, height: 64, borderRadius: 20,
                                background: bg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, lineHeight: 1,
                                boxShadow: `0 4px 12px ${bg}66`,
                                transition: "transform 200ms ease, box-shadow 200ms ease",
                            }}>
                                {cat.icon || "📦"}
                            </div>
                            <span style={{
                                fontSize: 11, fontWeight: 600, color: "#0F1410",
                                letterSpacing: -0.1, maxWidth: 72,
                                textAlign: "center", whiteSpace: "nowrap",
                                overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                                {name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
