import { MetadataRoute } from 'next';
import { db, collection, getDocs, query, where } from '@/lib/firebase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://velari.uz';

    // Static routes
    const routes = [
        '',
        '/catalog',
        '/reels',
        '/cart',
        '/wishlist',
        '/login',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    try {
        // Dynamic product routes
        const productsQuery = query(collection(db, 'products'), where('isDeleted', '==', false));
        const productsSnap = await getDocs(productsQuery);
        
        const productRoutes = productsSnap.docs.map((doc) => ({
            url: `${baseUrl}/products/${doc.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));

        // Dynamic category routes (if you have categorical landing pages)
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        const categoryRoutes = categoriesSnap.docs.map((doc) => ({
            url: `${baseUrl}/catalog?category=${doc.id}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }));

        return [...routes, ...productRoutes, ...categoryRoutes];
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        return routes;
    }
}
