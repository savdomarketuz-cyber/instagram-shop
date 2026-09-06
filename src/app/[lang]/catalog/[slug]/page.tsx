import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogClient from '../CatalogClient';
import { getCatalogCategories, resolveCategoryBySlug } from '@/lib/categories';
import { getCategorySlug } from '@/lib/slugify';

export const revalidate = 86400; // 24 soat

export async function generateMetadata({ params }: { params: { lang: string; slug: string } }): Promise<Metadata> {
    const lang = params.lang === 'ru' ? 'ru' : 'uz';
    const baseUrl = 'https://velari.uz';
    const categories = await getCatalogCategories();
    const cat = resolveCategoryBySlug(categories, params.slug, lang);

    if (!cat) {
        return {
            title: lang === 'ru' ? 'Каталог | Velari' : 'Katalog | Velari',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const name = lang === 'ru' ? (cat.name_ru || cat.name_uz || cat.name) : (cat.name_uz || cat.name);
    const uzSlug = getCategorySlug(cat, 'uz');
    const ruSlug = getCategorySlug(cat, 'ru');
    const canonicalSlug = lang === 'ru' ? ruSlug : uzSlug;

    const title = lang === 'ru'
        ? `${name} — купить в Ташкенте | Velari`
        : `${name} — Toshkentda sotib olish | Velari`;
    const description = lang === 'ru'
        ? `${name}: широкий выбор по выгодным ценам. Рассрочка, официальная гарантия и бесплатная доставка по Ташкенту. Velari Market.`
        : `${name}: keng tanlov hamyonbop narxlarda. Muddatli to'lov, rasmiy kafolat va Toshkent bo'ylab tekin yetkazib berish. Velari Market.`;

    return {
        title,
        description,
        openGraph: {
            title, description,
            url: `${baseUrl}/${lang}/catalog/${canonicalSlug}`,
            siteName: 'Velari', type: 'website',
            locale: lang === 'ru' ? 'ru_RU' : 'uz_UZ',
            images: [{ url: '/og-image.png', width: 1200, height: 630, alt: name }],
        },
        alternates: {
            canonical: `${baseUrl}/${lang}/catalog/${canonicalSlug}`,
            languages: {
                'uz-UZ': `${baseUrl}/uz/catalog/${uzSlug}`,
                'ru-RU': `${baseUrl}/ru/catalog/${ruSlug}`,
                'x-default': `${baseUrl}/uz/catalog/${uzSlug}`,
            },
        },
        robots: { index: true, follow: true },
    };
}

export default async function CategoryCatalogPage({ params }: { params: { lang: string; slug: string } }) {
    const lang = params.lang === 'ru' ? 'ru' : 'uz';
    const categories = await getCatalogCategories();
    const cat = resolveCategoryBySlug(categories, params.slug, lang);

    if (!cat) notFound();

    return <CatalogClient initialCategories={categories} initialCategory={cat!.id} />;
}
