import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import CatalogClient from './CatalogClient';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
    const lang = params.lang || 'uz';
    const baseUrl = 'https://velari.uz';

    return {
        title: lang === 'uz' 
            ? "Katalog | Velari - Premium Elektronika va Gadjetlar O'zbekistonda"
            : "Каталог | Velari - Премиум электроника и гаджеты в Узбекистане",
        description: lang === 'uz'
            ? "Velari onlayn do'konida barcha turdagi smartfonlar, noutbuklar va gadjetlar katalogi. Muddatli to'lov, rasmiy kafolat va Toshkent bo'ylab tekin yetkazib berish."
            : "Каталог всех видов смартфонов, ноутбуков и гаджетов в онлайн магазине Velari. Рассрочка, официальная гарантия и бесплатная доставка по Ташкенту.",
        keywords: ["katalog", "smartfonlar", "gadjetlar", "elektronika", "Velari katalogi", "Toshkent", "Uzbekistan", "muddatli to'lov"],
        openGraph: {
            title: lang === 'uz' 
                ? "Katalog | Velari - Premium Elektronika va Gadjetlar"
                : "Каталог | Velari - Премиум электроника и гаджеты",
            description: lang === 'uz'
                ? "Barcha turdagi original gadjetlar va elektronika mahsulotlari katalogi."
                : "Каталог всех видов оригинальных гаджетов и электроники.",
            url: `${baseUrl}/${lang}/catalog`,
            siteName: "Velari",
            images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Velari Katalog" }],
            locale: lang === 'uz' ? "uz_UZ" : "ru_RU",
            type: "website",
        },
        alternates: {
            canonical: `${baseUrl}/${lang}/catalog`,
            languages: {
                'uz-UZ': `${baseUrl}/uz/catalog`,
                'ru-RU': `${baseUrl}/ru/catalog`,
                'x-default': `${baseUrl}/uz/catalog`,
            },
        }
    };
}

export const revalidate = 3600; // 1 hour

async function getCategories() {
    try {
        const { data, error } = await supabaseAdmin
            .from("categories")
            .select("*")
            .eq("is_deleted", false)
            .order("name");

        if (error) {
            console.error("Catalog SSR: Failed to fetch categories:", error.message);
            return [];
        }

        return (data || []).map(c => ({
            id: c.id,
            name: c.name,
            name_uz: c.name_uz,
            name_ru: c.name_ru,
            parentId: c.parent_id,
            image: c.image
        }));
    } catch (error) {
        console.error("Catalog SSR error:", error);
        return [];
    }
}

export default async function CatalogPage() {
    const categories = await getCategories();
    return <CatalogClient initialCategories={categories} />;
}

