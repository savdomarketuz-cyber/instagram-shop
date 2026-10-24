import { Metadata } from 'next';
import { Suspense } from 'react';
import ProductClient from './ProductClient';
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";
import { getProductIdFromSlug, getProductSlug } from "@/lib/slugify";
import { getProductImageUrls, isIndexableProduct } from "@/lib/sitemap-data";
import { getProductRealStock } from "@/lib/stock";
import { RETURN_WINDOW_DAYS, computeStandardDelivery, isExpressFree } from "@/lib/delivery";
import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/public-product";
import { cleanText, getProductDescription, getProductIdentifiers, truncateAtWord } from "@/lib/seo-text";
import { notFound, permanentRedirect } from 'next/navigation';

import { cache } from 'react';

export const revalidate = 86400; // 24 soat cache (Admin panelda mahsulot ozgarsa revalidatePath orqali darhol yangilanadi)

// ⚡ Fast 404 tekshiruvi: noto'g'ri identifikatorlar uchun Supabase so'rovlarini chetlab o'tish
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARTICLE_OR_SLUG_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

const INVALID_IDENTIFIERS = new Set([
    'undefined', 'null', 'nan', 'nil', 'true', 'false',
    'admin', 'api', 'cart', 'checkout', 'robots', 'sitemap',
    'favicon', 'index', 'test', 'search', 'catalog', 'products',
    '[object object]'
]);

function isValidProductIdentifier(identifier: string | null | undefined): boolean {
    if (!identifier || typeof identifier !== 'string') return false;
    const clean = identifier.trim();
    if (clean.length < 3 || clean.length > 64) return false;
    // Fayl kengaytmalari (.php, .html, .js) yoki xavfli belgilarni darhol bloklash
    if (/[./\\%<>;?]/.test(clean)) return false;
    if (INVALID_IDENTIFIERS.has(clean.toLowerCase())) return false;
    return UUID_REGEX.test(clean) || ARTICLE_OR_SLUG_ID_REGEX.test(clean);
}

// 🚀 Memoize the database call to prevent double-fetching in Metadata & Page
const getProductData = cache(async (identifier: string) => {
    if (!identifier || !isValidProductIdentifier(identifier) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        // Faqat ommaviy ustunlar — ichki maydonlar (tannarx, komissiya, embedding...) HTML'ga tushmasin
        let query = supabaseAdmin
            .from("products")
            .select(PUBLIC_PRODUCT_COLUMNS)
            .eq("is_deleted", false);

        if (isUUID) {
            query = query.or(`id.eq.${identifier},article.eq.${identifier}`);
        } else {
            // Case-insensitive artikul qidirish + agar 'l' harfi 'I' bilan adashgan bo'lsa (Google crawl xatoligi)
            const altIdentifier = identifier.startsWith('l') ? ('I' + identifier.slice(1)) : (identifier.startsWith('I') ? ('l' + identifier.slice(1)) : '');
            if (altIdentifier) {
                query = query.or(`article.eq.${identifier},article.ilike.${identifier},article.eq.${altIdentifier},article.ilike.${altIdentifier}`);
            } else {
                query = query.or(`article.eq.${identifier},article.ilike.${identifier}`);
            }
        }

        let { data } = await query.limit(1).maybeSingle();

        // ⚡ Agar topilmasa va identifikator maxsus eski slug bo'lsa (masalan: "vgr-v195-qora")
        if (!data && !isUUID) {
            const modelMatch = identifier.match(/(?:vgr[-_]?)?([a-z]\d{2,4}|[a-z]-\d{2,4}|\d{3,5})/i);
            if (modelMatch) {
                const rawModel = modelMatch[1];
                const modelFormatted = rawModel.replace(/^([a-z])(\d+)$/i, '$1-$2').toUpperCase();
                const { data: fallbackData } = await supabaseAdmin
                    .from("products")
                    .select(PUBLIC_PRODUCT_COLUMNS)
                    .eq("is_deleted", false)
                    .or(`model.ilike.${rawModel},model.ilike.${modelFormatted},name.ilike.%${rawModel}%,article.ilike.%${rawModel}%`)
                    .limit(1)
                    .maybeSingle();
                if (fallbackData) data = fallbackData;
            }
        }

        if (!data) return null;

        const [brandRes, groupRes, warehousesRes] = await Promise.all([
            data.brand_id
                ? supabaseAdmin.from("brands").select("name").eq("id", data.brand_id).maybeSingle()
                : Promise.resolve({ data: null }),
            data.group_id
                ? supabaseAdmin.from("products").select(PUBLIC_PRODUCT_COLUMNS).eq("group_id", data.group_id).eq("is_deleted", false).order("created_at", { ascending: true })
                : Promise.resolve({ data: null }),
            supabaseAdmin.from("warehouses").select("id,name,logo,dbs_config,active").eq("active", true)
        ]);

        const brandName = brandRes.data?.name || undefined;
        const initialGroupProducts = (groupRes.data && groupRes.data.length > 0)
            ? groupRes.data.map(mapProduct)
            : [];

        return {
            ...mapProduct(data),
            brand_name: brandName,
            initialGroupProducts,
            initialWarehouses: warehousesRes.data || [],
            // isIndexableProduct snake_case maydonlarni tekshiradi — XOM DB qatoriga qo'llanadi
            isIndexable: isIndexableProduct(data),
        };
    } catch (err) {
        console.error("getProductData error:", err);
        return null;
    }
});

const OG_FALLBACK_IMAGE = "https://velari.uz/og-image.png";

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
            .gt("stock", 0)
            .order("sales", { ascending: false, nullsFirst: false })
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
    const rawId = params?.id;
    if (!rawId || typeof rawId !== 'string') {
        return {
            title: { absolute: "404 - Sahifa topilmadi | Velari" },
            robots: { index: false, follow: false },
        };
    }
    const productIdOrArticle = getProductIdFromSlug(rawId);
    if (!isValidProductIdentifier(productIdOrArticle)) {
        return {
            title: { absolute: "404 - Sahifa topilmadi | Velari" },
            robots: { index: false, follow: false },
        };
    }
    const product = await getProductData(productIdOrArticle);
    
    if (!product) {
        return {
            title: { absolute: "404 - Sahifa topilmadi | Velari" },
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
        ? `${productName} по самым выгодным ценам в Узбекистане. Рассрочка, официальная гарантия и доставка по всему Узбекистану.`
        : `${productName} O'zbekistonda eng hamyonbop narxlarda. Muddatli to'lov, rasmiy kafolat va O'zbekiston bo'ylab yetkazib berish.`;
    const description = truncateAtWord(
        cleanText(`${descriptionIntro} ${getProductDescription(product, params.lang)}`),
        160,
    );

    // og/twitter: birinchi 3 ta rasm + oxirida brend OG rasmi (jami ≤ 4).
    // Rasm bo'lmasa — umumiy OG rasm. JSON-LD va sitemap'da esa hamma rasm qoladi.
    const shareImages = productImages.length > 0 ? productImages.slice(0, 3) : [OG_FALLBACK_IMAGE];

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
                ...shareImages.map((url) => ({ url, alt: productName })),
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
            images: [...shareImages, ogUrl.toString()],
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

    // Google Shopping / AI Overviews uchun standart va tezkor yetkazish tafsilotlari
    const standardShippingFee = computeStandardDelivery(product.price);
    const shippingDetailsList: any[] = [
        {
            "@type": "OfferShippingDetails",
            "shippingRate": {
                "@type": "MonetaryAmount",
                "value": standardShippingFee,
                "currency": "UZS"
            },
            "shippingDestination": {
                "@type": "DefinedRegion",
                "addressCountry": "UZ"
            },
            "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 0,
                    "maxValue": 1,
                    "unitCode": "DAY"
                },
                "transitTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 1,
                    "maxValue": 2,
                    "unitCode": "DAY"
                }
            }
        }
    ];

    if (product.express_delivery) {
        shippingDetailsList.unshift({
            "@type": "OfferShippingDetails",
            "shippingRate": {
                "@type": "MonetaryAmount",
                "value": isExpressFree(product.price) ? 0 : 25000,
                "currency": "UZS"
            },
            "shippingDestination": {
                "@type": "DefinedRegion",
                "addressCountry": "UZ",
                "addressRegion": "Tashkent"
            },
            "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 0,
                    "maxValue": 0,
                    "unitCode": "HOUR"
                },
                "transitTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 1,
                    "maxValue": 2,
                    "unitCode": "HOUR"
                }
            }
        });
    }

    const offerBase: any = {
        "@type": "Offer",
        "url": canonicalProductUrl,
        "priceCurrency": "UZS",
        "price": product.price,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Velari" },
        "shippingDetails": shippingDetailsList,
        "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "UZ",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": RETURN_WINDOW_DAYS,
            "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
            "refundType": "https://schema.org/FullRefund",
            // Xaridor tovarni o'zi olib keladi yoki kuryer/pochta orqali yuboradi
            "returnMethod": [
                "https://schema.org/ReturnInStore",
                "https://schema.org/ReturnByMail",
            ],
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
        "description": truncateAtWord(descriptionText || productName, 2500),
        "sku": product.sku || product.article || product.id,
        "offers": offerBase
    };
    // Rasm bo'lmasa, image umuman yozilmaydi (faqat domen yoki "undefined" chiqmasin)
    if (productImages.length > 0) {
        jsonLd.image = productImages;
    }

    // Identifikatorlar faqat haqiqiy bo'lsa: MPN (model), brend (brands jadvalidan).
    // Ichki artikul/id MPN emas; brand_id (UUID) yoki "Velari" brend emas.
    const identifiers = getProductIdentifiers(product);
    if (identifiers.mpn) {
        jsonLd.mpn = identifiers.mpn;
    }
    if (identifiers.brand) {
        jsonLd.brand = {
            "@type": "Brand",
            "name": identifiers.brand
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
                initialWarehouses={product.initialWarehouses || []}
            />
        </>
    );
}

export default async function Page({ params }: { params: { lang: string, id: string } }) {
    const rawId = params?.id;
    if (!rawId || typeof rawId !== 'string') {
        notFound();
    }
    const productIdOrArticle = getProductIdFromSlug(rawId);
    if (!isValidProductIdentifier(productIdOrArticle)) {
        notFound();
    }
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
