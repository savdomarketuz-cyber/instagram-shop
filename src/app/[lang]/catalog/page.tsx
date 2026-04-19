import type { Metadata } from 'next';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
    title: "Katalog | Velari - Premium Elektronika va Gadjetlar O'zbekistonda",
    description: "Velari onlayn do'konida barcha turdagi smartfonlar, noutbuklar va gadjetlar katalogi. Muddatli to'lov, rasmiy kafolat va Toshkent bo'ylab tekin yetkazib berish.",
    keywords: ["katalog", "smartfonlar", "gadjetlar", "elektronika", "Velari katalogi", "Toshkent", "Uzbekistan", "muddatli to'lov"],
    openGraph: {
        title: "Katalog | Velari - Premium Elektronika va Gadjetlar",
        description: "Barcha turdagi original gadjetlar va elektronika mahsulotlari katalogi.",
        url: "https://velari.uz/catalog",
        siteName: "Velari",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Velari Katalog" }],
        locale: "uz_UZ",
        type: "website",
    },
    alternates: {
        canonical: "https://velari.uz/uz/catalog",
        languages: {
            'uz-UZ': 'https://velari.uz/uz/catalog',
            'ru-RU': 'https://velari.uz/ru/catalog',
        },
    }
};

export default function CatalogPage() {
    return <CatalogClient />;
}
