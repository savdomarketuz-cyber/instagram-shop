import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/public-product";
import { mapProduct } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import ShowroomClient from "./ShowroomClient";

export const revalidate = 3600; // 1 soat cache

export async function generateMetadata({ params: { lang } }: { params: { lang: string } }): Promise<Metadata> {
    const validLang = (lang === "ru" ? "ru" : "uz") as "uz" | "ru";
    const t = translations[validLang];
    const baseUrl = "https://velari.uz";

    return {
        title: { absolute: `${t.showroom.title} — Velari.uz` },
        description: t.showroom.subtitle,
        alternates: {
            canonical: `${baseUrl}/${validLang}/showroom`,
            languages: {
                "uz-UZ": `${baseUrl}/uz/showroom`,
                "ru-RU": `${baseUrl}/ru/showroom`,
                "x-default": `${baseUrl}/uz/showroom`,
            },
        },
    };
}

export default async function ShowroomPage({ params: { lang } }: { params: { lang: string } }) {
    const validLang = (lang === "ru" ? "ru" : "uz") as "uz" | "ru";

    let products: any[] = [];
    try {
        const { data } = await supabaseAdmin
            .from("products")
            .select(PUBLIC_PRODUCT_COLUMNS)
            .eq("is_deleted", false)
            .not("image", "is", null)
            .order("sales", { ascending: false })
            .limit(100);

        if (data && data.length > 0) {
            products = data.map(mapProduct);
        }
    } catch (err) {
        console.error("Showroom products fetch error:", err);
    }

    return <ShowroomClient initialProducts={products} lang={validLang} />;
}
