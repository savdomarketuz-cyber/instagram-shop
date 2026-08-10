import { Metadata } from 'next';
import { Suspense } from 'react';
import ProductClient from './ProductClient';
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";
import { getProductIdFromSlug, getProductSlug } from "@/lib/slugify";
import BrandedEmptyState from "@/components/common/BrandedEmptyState";

import { cache } from 'react';

export const revalidate = 86400; // 24 soat cache (Admin panelda mahsulot ozgarsa revalidatePath orqali darhol yangilanadi)

// 🚀 Memoize the database call to prevent double-fetching in Metadata & Page
const getProductData = cache(async (identifier: string) => {
    const { data } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .or(`id.eq.${identifier},article.eq.${identifier}`)
        .single();
    
    return data ? mapProduct(data) : null;
});

// ⚡ Eng mashhur 200 mahsulotni SEO slug shaklida pre-render (CDN'dan 0ms).
// Har mahsulot uchun uz va ru slug — sitemap/canonical bilan AYNAN mos bo'ladi.
// (Avval UUID + artikul render qilinardi: UUID dublikat, artikul esa buzilgan 404 edi.)
export async function generateStaticParams() {
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, article, name, name_uz, name_ru")
        .eq("is_deleted", false)
        .order("sales", { ascending: false })
        .limit(200);

    if (!products) return [];

    return products.flatMap((p) => [
        { id: getProductSlug(p, 'uz') },
        { id: getProductSlug(p, 'ru') },
    ]);
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
        const isRu = params.lang === 'ru';

        // Tilga mos canonical slug — UUID/artikul/eski-slug bilan kelsa ham
        // DOIM bitta to'g'ri shaklga normallashtiriladi (dublikat kontentni yo'qotadi).
        const uzSlug = getProductSlug(product, 'uz');
        const ruSlug = getProductSlug(product, 'ru');
        const canonicalSlug = isRu ? ruSlug : uzSlug;
        const canonicalUrl = `${baseUrl}/${params.lang}/products/${canonicalSlug}`;

        // Til bo'yicha nom (ru sahifa uchun ruscha nom — Yandex/Google ruscha qidiruvi uchun)
        const productName = isRu
            ? (product.name_ru || product.name_uz || product.name)
            : (product.name_uz || product.name);

        // Ensure raw direct product image URL is absolute for Google Search Thumbnail Indexing
        const rawProductImage = product.image?.startsWith('http') 
            ? product.image 
            : `${baseUrl}${product.image || ''}`;
            
        const productImages = (product.images && product.images.length > 0) 
            ? product.images.map((img: string) => img.startsWith('http') ? img : `${baseUrl}${img}`)
            : [rawProductImage];

        const ogUrl = new URL(`${baseUrl}/api/og`);
        ogUrl.searchParams.set('name', productName);
        ogUrl.searchParams.set('price', product.price.toString());
        ogUrl.searchParams.set('image', rawProductImage);

        // Title template in layout.tsx already adds "| Velari", so don't add it here
        const title = isRu
            ? `${productName} - Цена, Рассрочка и Гарантия`
            : `${productName} - Narxi, Muddatli to'lov va Kafolat`;
        const description = isRu
            ? `${productName} по самым выгодным ценам в Узбекистане. Рассрочка, официальная гарантия и бесплатная доставка. ${product.description_ru || product.description || ""}`.substring(0, 160)
            : `${productName} O'zbekistonda eng hamyonbop narxlarda. Muddatli to'lov, rasmiy kafolat va tekin yetkazib berish. ${product.description_uz || product.description || ""}`.substring(0, 160);

        return {
            title: title,
            description: description,
            openGraph: {
                title: title,
                description: description,
                url: canonicalUrl,
                siteName: 'Velari',
                images: [
                    { url: rawProductImage, width: 800, height: 800, alt: productName },
                    ...productImages.slice(1, 4).map(img => ({ url: img, width: 800, height: 800, alt: productName })),
                    { url: ogUrl.toString(), width: 1200, height: 630, alt: productName }
                ],
                locale: isRu ? 'ru_RU' : 'uz_UZ',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [rawProductImage, ogUrl.toString()],
            },
            alternates: {
                canonical: canonicalUrl,
                languages: {
                    'uz-UZ': `${baseUrl}/uz/products/${uzSlug}`,
                    'ru-RU': `${baseUrl}/ru/products/${ruSlug}`,
                    'x-default': `${baseUrl}/uz/products/${uzSlug}`,
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

    // Canonical slug (JSON-LD offers.url uchun) — tilga mos, normallashtirilgan
    const canonicalProductUrl = `https://velari.uz/${params.lang}/products/${getProductSlug(product, params.lang)}`;

    // Structured Data (Schema.org) for Google to understand this is a PRODUCT
    const productName = (params.lang === 'ru')
        ? (product.name_ru || product.name_uz || product.name)
        : (product.name_uz || product.name);
    
    // Extract brand name from product name (first word is usually the brand)
    const brandName = product.brand || (productName.split(' ')[0]) || "Velari";
    
    // Ensure images are absolute URLs
    const productImages = (product.images && product.images.length > 0) 
        ? product.images.map((img: string) => img.startsWith('http') ? img : `https://velari.uz${img}`)
        : [product.image?.startsWith('http') ? product.image : `https://velari.uz${product.image}`];

    // Price valid until (30 days from now for freshness)
    const priceValidDate = new Date();
    priceValidDate.setDate(priceValidDate.getDate() + 30);

    const ratingValue = Number(product.rating || product.avg_rating || 0);
    const reviewCount = Number(product.reviewCount || product.review_count || 0);

    const oldPrice = product.oldPrice || product.old_price || null;
    const inStock = (product.stock ?? (product.stockDetails ? Object.values(product.stockDetails as Record<string,number>).reduce((a,b)=>a+b,0) : 1)) > 0;

    const offerBase: any = {
        "@type": "Offer",
        "url": canonicalProductUrl,
        "priceCurrency": "UZS",
        "price": product.price,
        "priceValidUntil": priceValidDate.toISOString().split('T')[0],
        "itemCondition": "https://schema.org/NewCondition",
        "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Velari" },
        "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": { "@type": "MonetaryAmount", "value": 0, "currency": "UZS" },
            "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "UZ" },
            "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
                "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" }
            }
        },
        "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "UZ",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 14,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn"
        }
    };

    // Chegirma bo'lsa — Google eski narxni ham ko'rsatadi (crossed-out price)
    if (oldPrice && oldPrice > product.price) {
        offerBase.priceSpecification = [
            {
                "@type": "UnitPriceSpecification",
                "priceType": "https://schema.org/ListPrice",
                "price": oldPrice,
                "priceCurrency": "UZS"
            },
            {
                "@type": "UnitPriceSpecification",
                "priceType": "https://schema.org/SalePrice",
                "price": product.price,
                "priceCurrency": "UZS"
            }
        ];
    }

    const jsonLd: any = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": productName,
        "image": productImages,
        "description": (product.description_uz || product.description || '').substring(0, 500),
        "sku": product.sku || product.article || product.id,
        "mpn": product.model || product.article || product.id,
        "brand": { "@type": "Brand", "name": brandName },
        "offers": offerBase
    };

    // AggregateRating — FAQAT haqiqiy review bo'lganda (Google policy)
    if (reviewCount > 0 && ratingValue > 0) {
        jsonLd.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": ratingValue.toFixed(1),
            "reviewCount": reviewCount,
            "bestRating": "5",
            "worstRating": "1"
        };
    }

    const language = params.lang || 'uz'; // Dynamic language for SEO indexing

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": language === 'uz' ? "Bosh sahifa" : "Главная",
                "item": `https://velari.uz/${language}`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": language === 'uz' ? "Katalog" : "Каталог",
                "item": `https://velari.uz/${language}/catalog`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": productName,
                "item": `https://velari.uz/${language}/products/${params.id}`
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

    // Get description for server-side rendering (critical for SEO)
    const description = product[language === 'uz' ? 'description_uz' : 'description_ru'] || product.description || '';
    const descriptionText = typeof description === 'string' ? description : '';

    return (
        <>
            <link rel="image_src" href={productImages[0]} />
            <meta property="og:image:secure_url" content={productImages[0]} />
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
            {/* SEO: Server-side rendered content for search engine crawlers */}
            {/* This hidden article ensures Googlebot can read the full product description */}
            <article
                className="sr-only"
                itemScope
                itemType="https://schema.org/Product"
            >
                <h1 itemProp="name">{productName}</h1>
                <nav aria-label="Breadcrumb">
                    <ol>
                        <li><a href={`https://velari.uz/${language}`}>{language === 'uz' ? 'Bosh sahifa' : 'Главная'}</a></li>
                        <li><a href={`https://velari.uz/${language}/catalog`}>{language === 'uz' ? 'Katalog' : 'Каталог'}</a></li>
                        <li>{productName}</li>
                    </ol>
                </nav>
                <span itemProp="brand">{brandName}</span>
                {/* Barcha xom rasm URL'lari SSR HTML'da — image-sitemap bilan mos, Yandex/Google
                    JS render qilmasa ham real rasm manzillarini va alt matnini ko'radi. */}
                {productImages.map((img: string, i: number) => (
                    <img
                        key={i}
                        itemProp="image"
                        src={img}
                        alt={i === 0 ? productName : `${productName} - ${i + 1}`}
                        width={1080}
                        height={1440}
                        loading={i === 0 ? "eager" : "lazy"}
                        {...(i === 0 ? { fetchPriority: "high" } : {})}
                    />
                ))}
                <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
                    <span itemProp="price" content={String(product.price)}>{product.price?.toLocaleString()} so'm</span>
                    <span itemProp="priceCurrency" content="UZS">UZS</span>
                    <link itemProp="availability" href={product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
                </div>
                <div itemProp="description">
                    {descriptionText}
                </div>
            </article>
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
