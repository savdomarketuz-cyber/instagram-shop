import { Suspense } from "react";
import HomeClient from "./HomeClient";
import { db, collection, query, getDocs, orderBy, limit, where, doc, getDoc } from "@/lib/firebase";
import type { Product, Category, Banner } from "@/types";

// This makes the page dynamic as it fetches data from Firestore on every request (or based on revalidate)
export const dynamic = 'force-dynamic';

async function getInitialData() {
    try {
        // 1. Fetch first 20 products
        const productsQuery = query(
            collection(db, "products"), 
            where("isDeleted", "==", false),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const productsSnap = await getDocs(productsQuery);
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

        // 2. Fetch categories
        const categoriesQuery = query(collection(db, "categories"), orderBy("name", "asc"));
        const categoriesSnap = await getDocs(categoriesQuery);
        const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];

        // 3. Fetch banners
        const bannersSnap = await getDocs(query(collection(db, "banners"), orderBy("order", "asc")));
        const banners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[];

        // 4. Fetch banner settings
        const settingsSnap = await getDoc(doc(db, "settings", "banners"));
        const bannerSettings = settingsSnap.exists() 
            ? { desktopHeight: settingsSnap.data().desktopHeight || 210, borderRadius: settingsSnap.data().borderRadius || 32 }
            : { desktopHeight: 210, borderRadius: 32 };

        return { products, categories, banners, bannerSettings };
    } catch (error) {
        console.error("Server-side fetch failed:", error);
        return { products: [], categories: [], banners: [], bannerSettings: { desktopHeight: 210, borderRadius: 32 } };
    }
}

export default async function Home() {
    const { products, categories, banners, bannerSettings } = await getInitialData();

    return (
        <Suspense fallback={<HomeSkeleton />}>
            <HomeClient 
                initialProducts={products}
                initialCategories={categories}
                initialBanners={banners}
                initialBannerSettings={bannerSettings}
            />
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
