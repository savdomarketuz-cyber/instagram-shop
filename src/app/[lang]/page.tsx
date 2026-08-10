import { Suspense } from "react";
import HomeClient from "./HomeClient";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct, mapCategory, mapBanner } from "@/lib/mappers";
import type { Product, Category, Banner } from "@/types";
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
    const lang = params.lang || 'uz';
    const baseUrl = 'https://velari.uz';
    
    return {
        title: lang === 'uz' 
            ? "Velari | O'zbekistonda №1 Premium Elektronika Do'koni" 
            : "Velari | Премиум магазин электроники №1 в Узбекистане",
        description: lang === 'uz'
            ? "iPhone, Samsung, Xiaomi va boshqa global brendlarni muddatli to'lovga sotib oling. Toshkent bo'ylab tekin yetkazib berish va rasmiy kafolat."
            : "Покупайте iPhone, Samsung, Xiaomi и другие мировые бренды в рассрочку. Бесплатная доставка по Ташкенту и официальная гарантия.",
        keywords: ["Velari", "elektronika do'koni", "Toshkent", "muddatli to'lov", "iphone narxi", "samsung narxi", "O'zbekiston"],
        alternates: {
            canonical: `${baseUrl}/${lang}`,
            languages: {
                'uz-UZ': `${baseUrl}/uz`,
                'ru-RU': `${baseUrl}/ru`,
                'x-default': `${baseUrl}/uz`,
            },
        }
    };
}

export const revalidate = 86400; // 24 soatda bir marta yangilanadi (ISR limitni tejash uchun)

async function getInitialData() {
    try {
        const [
            { data: productsData },
            { data: categoriesData },
            { data: bannersData },
            { data: settingsData },
            { data: promoData },
            { data: prodCatRows },
            { data: featuredSettingRow }
        ] = await Promise.all([
            supabaseAdmin.from("products").select("id,name,name_uz,name_ru,price,old_price,image,images,image_metadata,sales,avg_rating,review_count,stock,stock_details,category_id,brand_id,video_url,model,color_name,group_id,is_original,article,express_delivery,created_at").eq("is_deleted", false).gt("stock", 0).order("sales", { ascending: false }).order("avg_rating", { ascending: false }).limit(50),
            supabaseAdmin.from("categories").select("id,name,name_uz,name_ru,parent_id,image,image_meta,icon,color,is_deleted").eq("is_deleted", false).order("name", { ascending: true }),
            supabaseAdmin.from("banners").select("id,title_uz,title_ru,html_uz,html_ru,active,order_index,tab_name_uz,tab_name_ru").eq("active", true).order("order_index", { ascending: true }),
            supabaseAdmin.from("settings").select("data").eq("id", "banners").single(),
            supabaseAdmin.from("site_settings").select("value").eq("key", "promo_countdown").single(),
            // Mahsuloti bor kategoriyalarni aniqlash uchun barcha mahsulot category_id lari
            supabaseAdmin.from("products").select("category_id").eq("is_deleted", false).gt("stock", 0),
            // Kategoriya vitrinasi sozlamasi (settings anon o'qishdan yopiq -> server orqali)
            supabaseAdmin.from("settings").select("data").eq("id", "featured_categories").maybeSingle(),
        ]);

        // Mahsuloti bor (bo'sh bo'lmagan) kategoriyalar to'plamini hisoblash.
        // Subkategoriyada mahsulot bo'lsa, uning parenti ham "bo'sh emas" hisoblanadi.
        const rawCats = categoriesData || [];
        const parentOf = new Map<string, string | null>(rawCats.map((c: any) => [String(c.id), c.parent_id ? String(c.parent_id) : null]));
        const directCatIds = new Set<string>((prodCatRows || []).map((r: any) => String(r.category_id)).filter(Boolean));
        const nonEmpty = new Set<string>();
        for (const id of Array.from(directCatIds)) {
            let cur: string | null | undefined = id;
            while (cur) {
                if (nonEmpty.has(cur)) break;
                nonEmpty.add(cur);
                cur = parentOf.get(cur) ?? null;
            }
        }
        const visibleCatRows = rawCats.filter((c: any) => nonEmpty.has(String(c.id)));

        const products = (productsData || []).map(mapProduct);
        const categories = visibleCatRows.map(mapCategory);
        const banners = (bannersData || []).map(mapBanner);
        const bannerSettings = settingsData?.data
            ? { desktopHeight: settingsData.data.desktopHeight || 210, borderRadius: settingsData.data.borderRadius || 32 }
            : { desktopHeight: 210, borderRadius: 32 };
        const promoSettings = (promoData?.value as any) || null;

        // Kategoriya vitrinasi: tanlangan, mahsuloti bor, tartibda saqlangan kategoriyalar.
        const fcData: any = (featuredSettingRow as any)?.data || null;
        const fcShow = fcData ? fcData.show_on_home !== false : false;
        const fcIds: string[] = fcData?.category_ids || [];
        const featuredCategories = (fcShow ? fcIds : [])
            .map((id: string) => rawCats.find((c: any) => String(c.id) === String(id)))
            .filter((c: any) => c && nonEmpty.has(String(c.id)))
            .map((c: any) => ({
                id: String(c.id),
                name: c.name,
                name_uz: c.name_uz,
                name_ru: c.name_ru,
                image: c.image || null,
                icon: c.icon || null,
                color: c.color || null,
            }));

        return { products, categories, banners, bannerSettings, promoSettings, featuredCategories };
    } catch (error) {
        console.error("Server-side fetch failed:", error);
        return { products: [], categories: [], banners: [], bannerSettings: { desktopHeight: 210, borderRadius: 32 }, promoSettings: null, featuredCategories: [] };
    }
}

async function HomeDataWrapper() {
    const { products, categories, banners, bannerSettings, promoSettings, featuredCategories } = await getInitialData();

    return (
        <HomeClient
            initialProducts={products}
            initialCategories={categories}
            initialBanners={banners}
            initialBannerSettings={bannerSettings}
            initialPromo={promoSettings}
            initialFeaturedCategories={featuredCategories}
        />
    );
}

export default function Home() {
    return (
        <Suspense fallback={<HomeSkeleton />}>
            <HomeDataWrapper />
        </Suspense>
    );
}

function HomeSkeleton() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            {/* 1. Header Navigation Skeleton (matches height of real site) */}
            <div className="h-16 border-b border-gray-50 flex items-center px-4 md:px-10 gap-8">
                <div className="w-24 h-6 bg-gray-100 rounded-full" />
                <div className="hidden md:block flex-1 max-w-xl h-10 bg-gray-100 rounded-2xl mx-auto" />
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            </div>

            {/* 2. Banner Section Skeleton (matches logic of real banner) */}
            <div className="mt-8 px-4 md:px-10">
                <div className="w-full h-[210px] md:h-[420px] bg-gray-50 rounded-[32px] md:rounded-[48px]" />
            </div>

            {/* 3. Category Filter Skeleton */}
            <div className="mt-12 px-4 md:px-10 space-y-4">
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-20 md:w-28 h-8 md:h-12 bg-gray-50 rounded-2xl shrink-0" />
                    ))}
                </div>
            </div>

            {/* 4. Product Tab Skeleton */}
            <div className="mt-10 px-4 md:px-10 border-b border-gray-50 flex gap-12">
                <div className="w-24 h-8 bg-gray-50 rounded-t-lg" />
                <div className="w-24 h-8 bg-gray-50 rounded-t-lg" />
            </div>

            {/* 5. Product Grid Skeleton */}
            <div className="mt-8 px-4 md:px-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <div className="aspect-[1080/1440] bg-gray-50 rounded-3xl" />
                        <div className="h-4 w-3/4 bg-gray-50 rounded-lg" />
                        <div className="h-6 w-1/4 bg-gray-50 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
