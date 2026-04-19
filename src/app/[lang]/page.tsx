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
            'x-default': 'https://velari.uz/uz',
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
