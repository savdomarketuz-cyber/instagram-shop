import { Suspense } from "react";
import HomeClient from "./HomeClient";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapCategory, mapBanner } from "@/lib/mappers";
import type { Product, Category, Banner } from "@/types";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Velari | O'zbekistonda №1 Premium Elektronika Do'koni",
    description: "iPhone, Samsung, Xiaomi va boshqa global brendlarni muddatli to'lovga sotib oling. Toshkent bo'ylab tekin yetkazib berish va rasmiy kafolat.",
    keywords: ["Velari", "elektronika do'koni", "Toshkent", "muddatli to'lov", "iphone narxi", "samsung narxi", "O'zbekiston"],
    alternates: {
        canonical: "https://velari.uz/uz",
        languages: {
            'uz-UZ': 'https://velari.uz/uz',
            'ru-RU': 'https://velari.uz/ru',
        },
    }
};

export const runtime = "edge";
export const revalidate = 60; 

async function getInitialData() {
    try {
        const [
            { data: productsData },
            { data: categoriesData },
            { data: bannersData },
            { data: settingsData }
        ] = await Promise.all([
            supabase.from("products").select("*").eq("is_deleted", false).order("created_at", { ascending: false }).limit(20),
            supabase.from("categories").select("*").eq("is_deleted", false).order("name", { ascending: true }),
            supabase.from("banners").select("*").eq("active", true).order("order_index", { ascending: true }),
            supabase.from("settings").select("*").eq("id", "banners").single()
        ]);
        
        const products = (productsData || []).map(mapProduct);
        const categories = (categoriesData || []).map(mapCategory);
        const banners = (bannersData || []).map(mapBanner);
        const bannerSettings = settingsData?.data 
            ? { desktopHeight: settingsData.data.desktopHeight || 210, borderRadius: settingsData.data.borderRadius || 32 }
            : { desktopHeight: 210, borderRadius: 32 };

        return { products, categories, banners, bannerSettings };
    } catch (error) {
        console.error("Server-side fetch failed:", error);
        return { products: [], categories: [], banners: [], bannerSettings: { desktopHeight: 210, borderRadius: 32 } };
    }
}

async function HomeDataWrapper() {
    const { products, categories, banners, bannerSettings } = await getInitialData();
    
    return (
        <HomeClient 
            initialProducts={products}
            initialCategories={categories}
            initialBanners={banners}
            initialBannerSettings={bannerSettings}
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
            {/* Header Skeleton */}
            <div className="h-20 border-b border-gray-100 flex items-center px-10 gap-8">
                <div className="w-32 h-8 bg-gray-50 rounded-full" />
                <div className="flex-1 max-w-2xl h-12 bg-gray-50 rounded-2xl mx-auto" />
                <div className="w-12 h-12 bg-gray-50 rounded-2xl" />
            </div>
            {/* Banner Skeleton */}
            <div className="mt-4 px-4 h-[210px]">
                <div className="w-full h-full bg-gray-50 rounded-[32px]" />
            </div>
            {/* Filter Skeleton */}
            <div className="mt-8 px-10 flex gap-3 overflow-hidden">
                {[...Array(6)].map((_, i) => <div key={i} className="w-24 h-10 bg-gray-50 rounded-2xl shrink-0" />)}
            </div>
        </div>
    );
}
