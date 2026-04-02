import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { getProductSlug } from '@/lib/slugify';

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
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, name, name_uz, updated_at')
            .eq('is_deleted', false);

        const productRoutes = (products || []).map((product) => ({
            url: `${baseUrl}/products/${getProductSlug(product)}`,
            lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));

        // Dynamic category routes
        const { data: categories } = await supabaseAdmin
            .from('categories')
            .select('id, updated_at');

        const categoryRoutes = (categories || []).map((cat) => ({
            url: `${baseUrl}/catalog?category=${cat.id}`,
            lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }));

        return [...routes, ...productRoutes, ...categoryRoutes];
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        return routes;
    }
}
