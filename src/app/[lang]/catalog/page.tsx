import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CatalogClient from './CatalogClient';
import { getCatalogCategories } from '@/lib/categories';
import { getCategorySlug } from '@/lib/slugify';

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

export default async function CatalogPage({ params, searchParams }: {
    params: { lang: string };
    searchParams?: { category?: string };
}) {
    const categories = await getCatalogCategories();

    // Eski `?category=ID` havolalarni toza URL'ga 301-redirect (SEO + indekslangan URL'lar)
    const catId = searchParams?.category;
    if (catId) {
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
            const lang = params.lang === 'ru' ? 'ru' : 'uz';
            redirect(`/${lang}/catalog/${getCategorySlug(cat, lang)}`);
        }
    }

    return <CatalogClient initialCategories={categories} />;
}

