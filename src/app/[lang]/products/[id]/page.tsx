import { Metadata } from 'next';
import { Suspense } from 'react';
import ProductClient from './ProductClient';
import { supabase } from "@/lib/supabase";
import { mapProduct } from "@/lib/mappers";
import { getProductIdFromSlug } from "@/lib/slugify";
import BrandedEmptyState from "@/components/common/BrandedEmptyState";

import { cache } from 'react';

export const runtime = "edge";
export const revalidate = 60; 

// 🚀 Memoize the database call to prevent double-fetching in Metadata & Page
const getProductData = cache(async (identifier: string) => {
    const { data } = await supabase
        .from("products")
        .select("*")
        .or(`id.eq.${identifier},article.eq.${identifier}`)
        .single();
    
    return data ? mapProduct(data) : null;
});

// ⚡ Pre-render top 50 popular products for INSTANT (0ms) loading from CDN
export async function generateStaticParams() {
    const { data: products } = await supabase
        .from("products")
        .select("id, article")
        .eq("is_deleted", false)
        .order("sales", { ascending: false })
        .limit(50);

    if (!products) return [];

    return products.flatMap((p) => [
        { id: p.id },
        { id: p.article?.toString() }
    ].filter(v => v.id));
}

export async function generateMetadata({ params }: { params: { lang: string, id: string } }): Promise<Metadata> {
    try {
        const productIdOrArticle = getProductIdFromSlug(params.id);
        const product = await getProductData(productIdOrArticle);
        
        if (!product) {
            return {
                title: 'Mahsulot topilmadi | Velari',
                description: 'Kechirasiz, siz qidirayotgan mahsulot topilmadi.'
            };
        }
        const baseUrl = "https://velari.uz";
        
        const ogUrl = new URL(`${baseUrl}/api/og`);
        ogUrl.searchParams.set('name', product.name_uz || product.name);
        ogUrl.searchParams.set('price', product.price.toString());
        ogUrl.searchParams.set('image', product.image);

        const title = `${product.name_uz || product.name} - Narxi, Muddatli to'lov va Kafolat | Velari`;
        const description = `${product.name_uz || product.name} O'zbekistonda eng hamyonbop narxlarda. ${product.description_uz || product.description || ""}`.substring(0, 160);

        return {
            title: title,
            description: description,
            openGraph: {
                title: title,
                description: description,
                url: `${baseUrl}/products/${params.id}`,
                siteName: 'Velari',
                images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: title }],
                locale: 'uz_UZ',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [ogUrl.toString()],
            },
            alternates: { 
                canonical: `/${params.lang}/products/${params.id}`,
                languages: {
                    'uz-UZ': `/uz/products/${params.id}`,
                    'ru-RU': `/ru/products/${params.id}`,
                },
            },
            keywords: [
                product.name, 
                product.name_uz || "", 
                "Velari", 
                "muddatli to'lov", 
                "bo'lib to'lash",
                "muddatli tolov",
                "narxi",
                "sotib olish",
                "Toshkent",
                "Uzbekistan",
                product.category as string
            ].filter(Boolean) as string[],
            robots: { index: true, follow: true },
        };
    } catch (error) {
        return { title: 'Velari | Global Electronics' };
    }
}

async function ProductDataWrapper({ params }: { params: { lang: string, id: string } }) {
    const productIdOrArticle = getProductIdFromSlug(params.id);
    const product: any = await getProductData(productIdOrArticle);
    
    if (!product) return <BrandedEmptyState type="not-found" showPopular={true} />;

    // Structured Data (Schema.org) for Google to understand this is a PRODUCT
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name_uz || product.name,
        "image": product.images || [product.image],
        "description": product.description_uz || product.description,
        "sku": product.sku || product.id,
        "brand": { "@type": "Brand", "name": "Velari" },
        "offers": {
            "@type": "Offer",
            "url": `https://velari.uz/products/${product.id}`,
            "priceCurrency": "UZS",
            "price": product.price,
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Velari" }
        }
    };

    const language = params.lang || 'uz'; // Dynamic language for SEO indexing

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Bosh sahifa",
                "item": "https://velari.uz"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Katalog",
                "item": "https://velari.uz/catalog"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.name_uz || product.name,
                "item": `https://velari.uz/products/${params.id}`
            }
        ]
    };

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": language === 'uz' ? `Bu ${product.name_uz || product.name} originalmi?` : `Это оригинал ${product.name_ru || product.name}?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": language === 'uz' ? "Ha, Velari do'konida barcha mahsulotlar 100% original va rasmiy kafolatga ega." : "Да, в магазине Velari все товары на 100% оригинальные и имеют официальную гарантию."
                }
            },
            {
                "@type": "Question",
                "name": language === 'uz' ? "Yetkazib berish qancha vaqt oladi?" : "Сколько времени занимает доставка?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": language === 'uz' ? "Toshkent bo'ylab yetkazib berish 24 soat ichida mutlaqo tekin amalga oshiriladi." : "Доставка по Ташкенту осуществляется бесплатно в течение 24 часов."
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <ProductClient params={params} initialProduct={product} />
        </>
    );
}

export default function Page({ params }: { params: { lang: string, id: string } }) {
    return (
        <Suspense fallback={<ProductSkeleton />}>
            <ProductDataWrapper params={params} />
        </Suspense>
    );
}

function ProductSkeleton() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="aspect-[1080/1440] bg-gray-50 rounded-3xl" />
                <div className="space-y-6">
                    <div className="h-10 w-3/4 bg-gray-50 rounded-xl" />
                    <div className="h-6 w-1/4 bg-gray-50 rounded-lg" />
                    <div className="h-24 w-full bg-gray-50 rounded-2xl" />
                    <div className="h-16 w-full bg-gray-50 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
