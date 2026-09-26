import { Metadata } from 'next';
import { Suspense } from 'react';
import ProductClient from './ProductClient';
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";
import { getProductIdFromSlug, getProductSlug } from "@/lib/slugify";
import { getProductImageUrls, isIndexableProduct } from "@/lib/sitemap-data";
import { getProductRealStock } from "@/lib/stock";
import { RETURN_WINDOW_DAYS } from "@/lib/delivery";
import { notFound, permanentRedirect } from 'next/navigation';

import { cache } from 'react';

export const revalidate = 86400; // 24 soat cache (Admin panelda mahsulot ozgarsa revalidatePath orqali darhol yangilanadi)

// 🚀 Memoize the database call to prevent double-fetching in Metadata & Page
const getProductData = cache(async (identifier: string) => {
    if (!identifier || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        let query = supabaseAdmin
            .from("products")
            .select("*")
            .eq("is_deleted", false);

        if (isUUID) {
            query = query.or(`id.eq.${identifier},article.eq.${identifier}`);
        } else {
            query = query.eq("article", identifier);
        }

        const { data } = await query.single();
        if (!data) return null;

        const [brandRes, groupRes] = await Promise.all([
            data.brand_id
                ? supabaseAdmin.from("brands").select("name").eq("id", data.brand_id).maybeSingle()
                : Promise.resolve({ data: null }),
            data.group_id
                ? supabaseAdmin.from("products").select("*").eq("group_id", data.group_id).eq("is_deleted", false).order("created_at", { ascending: true })
                : Promise.resolve({ data: null })
        ]);

        const brandName = brandRes.data?.name || undefined;
        const initialGroupProducts = (groupRes.data && groupRes.data.length > 0)
            ? groupRes.data.map(mapProduct)
            : [];

        return {
            ...mapProduct(data),
            brand_name: brandName,
            initialGroupProducts,
            // isIndexableProduct snake_case maydonlarni tekshiradi — XOM DB qatoriga qo'llanadi
            isIndexable: isIndexableProduct(data),
        };
    } catch (err) {
        console.error("getProductData error:", err);
        return null;
    }
});

const OG_FALLBACK_IMAGE = "https://velari.uz/og-image.png";

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

/** HTML teglari olib tashlanadi, entity'lar ochiladi, barcha bo'shliqlar bitta probelga, trim(). */
function cleanText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
            if (code[0] === '#') {
                const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
                return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
            }
            return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
        })
        .replace(/\s+/g, ' ')
        .trim();
}

/** So'z chegarasida qisqartiradi; kesilgan bo'lsa oxiriga "…" (natija ≤ max). */
function truncateAtWord(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return base.replace(/[\s,.;:!?—–-]+$/, '') + '…';
}

/** Tilga mos tozalangan tavsif — JSON-LD, meta description va yashirin blok uchun bir xil manba. */
function getProductDescription(product: any, lang: string): string {
    const raw = lang === 'ru'
        ? (product.description_ru || product.description)
        : (product.description_uz || product.description);
    return cleanText(raw);
}

function decodeSlug(slug: string): string {
    try {
        return decodeURIComponent(slug);
    } catch {
        return slug;
    }
}

// ⚡ Eng mashhur 200 mahsulotni SEO slug shaklida pre-render (CDN'dan 0ms).
// Har mahsulot uchun uz va ru slug — sitemap/canonical bilan AYNAN mos bo'ladi.
// (Avval UUID + artikul render qilinardi: UUID dublikat, artikul esa buzilgan 404 edi.)
export async function generateStaticParams() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return [];
    }

    try {
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
    } catch (err) {
        console.error("generateStaticParams error:", err);
        return [];
    }
}

export async function generateMetadata({ params }: { params: { lang: string, id: string } }): Promise<Metadata> {
    const productIdOrArticle = getProductIdFromSlug(params.id);
    const product = await getProductData(productIdOrArticle);
    
    if (!product) {
        return {
            title: "404 - Sahifa topilmadi | Velari",
            robots: { index: false, follow: false },
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

    // Rasmlar — yagona manba (image-sitemap va JSON-LD bilan AYNAN bir xil)
    const productImages = getProductImageUrls(product);
    const primaryImage = productImages[0] || OG_FALLBACK_IMAGE;

    const ogUrl = new URL(`${baseUrl}/api/og`);
    ogUrl.searchParams.set('name', productName);
    ogUrl.searchParams.set('price', String(product.price ?? ''));
    ogUrl.searchParams.set('image', primaryImage);

    // Title template in layout.tsx already adds "| Velari", so don't add it here
    const title = isRu
        ? `${productName} - Цена, Рассрочка и Гарантия`
        : `${productName} - Narxi, Muddatli to'lov va Kafolat`;
    const descriptionIntro = isRu
        ? `${productName} по самым выгодным ценам в Узбекистане. Рассрочка, официальная гарантия и бесплатная доставка.`
        : `${productName} O'zbekistonda eng hamyonbop narxlarda. Muddatli to'lov, rasmiy kafolat va tekin yetkazib berish.`;
    const description = truncateAtWord(
        cleanText(`${descriptionIntro} ${getProductDescription(product, params.lang)}`),
        160,
    );

    // Rasm bo'lmasa — umumiy OG rasm (faqat og/twitter uchun)
    const ogImages = productImages.length > 0
        ? productImages.map((url) => ({ url, alt: productName }))
        : [{ url: OG_FALLBACK_IMAGE, width: 1200, height: 630, alt: productName }];

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: canonicalUrl,
            siteName: 'Velari',
            images: [
                // ⚡ Avval mahsulotning haqiqiy rasmlari (JSON-LD/image-sitemap bilan bir xil tartibda)
                ...ogImages,
                // OG brend rasmi oxirida (Facebook/WhatsApp uchun)
                { url: ogUrl.toString(), width: 1200, height: 630, alt: productName },
            ],
            locale: isRu ? 'ru_RU' : 'uz_UZ',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [primaryImage, ogUrl.toString()],
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
        // Narxsiz/rasmsiz/nomsiz mahsulot ochilaveradi, lekin indeksga kirmaydi (sitemap'da ham yo'q)
        robots: product.isIndexable ? { index: true, follow: true } : { index: false, follow: true },
    };
}

function ProductDataWrapper({ params, product, canonicalSlug }: { params: { lang: string, id: string }, product: any, canonicalSlug: string }) {
    // Canonical slug (JSON-LD offers.url uchun) — tilga mos, normallashtirilgan
    const canonicalProductUrl = `https://velari.uz/${params.lang}/products/${canonicalSlug}`;

    // Structured Data (Schema.org) for Google to understand this is a PRODUCT
    const productName = (params.lang === 'ru')
        ? (product.name_ru || product.name_uz || product.name)
        : (product.name_uz || product.name);
    
    // Rasmlar — yagona manba (image-sitemap va og:image bilan AYNAN bir xil)
    const productImages = getProductImageUrls(product);

    const ratingValue = Number(product.rating || product.avg_rating || 0);
    const reviewCount = Number(product.reviewCount || product.review_count || 0);

    const oldPrice = product.oldPrice || product.old_price || null;
    // Stok — src/lib/stock.ts (katalog, savat, checkout bilan bir xil qoida)
    const inStock = getProductRealStock(product) > 0;

    const offerBase: any = {
        "@type": "Offer",
        "url": canonicalProductUrl,
        "priceCurrency": "UZS",
        "price": product.price,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Velari" },
        "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "UZ",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": RETURN_WINDOW_DAYS,
            "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
            "refundType": "https://schema.org/FullRefund",
            "merchantReturnLink": `https://velari.uz/${params.lang}/return-policy`,
        },
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

    // Tilga mos tozalangan tavsif — meta description va yashirin blok bilan bir xil manba
    const descriptionText = getProductDescription(product, params.lang);

    const jsonLd: any = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": productName,
        "description": truncateAtWord(descriptionText || productName, 500),
        "sku": product.sku || product.article || product.id,
        "mpn": product.model || product.article || product.id,
        "offers": offerBase
    };
    // Rasm bo'lmasa, image umuman yozilmaydi (faqat domen yoki "undefined" chiqmasin)
    if (productImages.length > 0) {
        jsonLd.image = productImages;
    }

    // Real DB'dagi brand nomi bo'lsa — schema'ga kiritamiz
    const realBrandName = product.brand_name || product.brand;
    if (realBrandName) {
        jsonLd.brand = {
            "@type": "Brand",
            "name": realBrandName
        };
    }

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
                "item": `https://velari.uz/${language}/products/${canonicalSlug}`
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
            {/* SEO: Server-side rendered content for search engine crawlers */}
            {/* This hidden article ensures Googlebot can read the full product description.
                Microdata yo'q: yagona structured data manbasi — yuqoridagi JSON-LD.
                <p>, <h1> emas: sahifada yagona <h1> — mobil ProductInfo'da. */}
            <article className="sr-only">
                <p>{productName}</p>
                <nav aria-label="Breadcrumb">
                    <ol>
                        <li><a href={`https://velari.uz/${language}`}>{language === 'uz' ? 'Bosh sahifa' : 'Главная'}</a></li>
                        <li><a href={`https://velari.uz/${language}/catalog`}>{language === 'uz' ? 'Katalog' : 'Каталог'}</a></li>
                        <li>{productName}</li>
                    </ol>
                </nav>
                {/* Barcha rasm URL'lari SSR HTML'da — image-sitemap bilan AYNAN bir xil, Yandex/Google
                    JS render qilmasa ham real rasm manzillarini va alt matnini ko'radi. */}
                {productImages.map((img: string, i: number) => (
                    <img
                        key={i}
                        src={img}
                        alt={i === 0 ? productName : `${productName} - ${i + 1}`}
                        width={1080}
                        height={1440}
                        loading={i === 0 ? "eager" : "lazy"}
                        {...(i === 0 ? { fetchPriority: "high" } : {})}
                    />
                ))}
                <div>
                    <span>{product.price?.toLocaleString()} so'm</span>
                </div>
                <div>
                    {descriptionText}
                </div>
            </article>
            <ProductClient 
                key={product.id}
                params={params} 
                initialProduct={product} 
                initialGroupProducts={product.initialGroupProducts || []}
            />
        </>
    );
}

export default async function Page({ params }: { params: { lang: string, id: string } }) {
    const productIdOrArticle = getProductIdFromSlug(params.id);
    const product: any = await getProductData(productIdOrArticle);
    
    if (!product) notFound();

    const canonicalSlug = getProductSlug(product, params.lang);
    // Dekodlangan slug bilan taqqoslanadi — kodlangan belgilar tufayli redirect sikli bo'lmasin
    if (decodeSlug(params.id) !== canonicalSlug) {
        permanentRedirect(`/${params.lang}/products/${canonicalSlug}`);
    }

    return (
        <Suspense fallback={<ProductSkeleton />}>
            <ProductDataWrapper params={params} product={product} canonicalSlug={canonicalSlug} />
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
