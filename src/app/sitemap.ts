import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductSlug } from '@/lib/slugify';
import { i18n } from '@/lib/i18n-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://velari.uz';
    const locales = i18n.locales;

    // Static routes
    const staticPaths = [
        '',
        '/catalog',
        '/reels',
        '/blog',
        '/cart',
        '/wishlist',
        '/login',
    ];

    const routes: MetadataRoute.Sitemap = [];

    // Generate static routes for all locales
    for (const locale of locales) {
        for (const path of staticPaths) {
            routes.push({
                url: `${baseUrl}/${locale}${path === '/' ? '' : path}`,
                lastModified: new Date(),
                changeFrequency: 'daily' as const,
                priority: (path === '' || path === '/blog') ? 1 : 0.8,
            });
        }
    }

    try {
        // 1. Dynamic product routes
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, name, name_uz, updated_at')
            .eq('is_deleted', false);

        if (products) {
            for (const locale of locales) {
                products.forEach((product) => {
                    routes.push({
                        url: `${baseUrl}/${locale}/products/${getProductSlug(product)}`,
                        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
                        changeFrequency: 'weekly' as const,
                        priority: 0.7,
                    });
                });
            }
        }

        // 2. Dynamic category routes
        const { data: categories } = await supabaseAdmin
            .from('categories')
            .select('id, updated_at');

        if (categories) {
            for (const locale of locales) {
                categories.forEach((cat) => {
                    routes.push({
                        url: `${baseUrl}/${locale}/catalog?category=${cat.id}`,
                        lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
                        changeFrequency: 'monthly' as const,
                        priority: 0.6,
                    });
                });
            }
        }

        // 3. Dynamic blog routes
        const { data: blogs } = await supabaseAdmin
            .from('blogs')
            .select('slug, updated_at')
            .eq('is_deleted', false);

        if (blogs) {
            for (const locale of locales) {
                blogs.forEach((blog) => {
                    routes.push({
                        url: `${baseUrl}/${locale}/blog/${blog.slug}`,
                        lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(),
                        changeFrequency: 'weekly' as const,
                        priority: 0.7,
                    });
                });
            }
        }

        return routes;
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        return routes;
    }
}
