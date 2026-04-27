import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductSlug } from '@/lib/slugify';
import { i18n } from '@/lib/i18n-config';

export const revalidate = 3600; // Regenerate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://velari.uz';
    const locales = i18n.locales;

    // Static routes — ONLY pages that should be indexed
    // Removed: /cart, /wishlist, /login (these are blocked in robots.txt)
    const staticPaths = [
        '',
        '/catalog',
        '/reels',
        '/blog',
    ];

    const routes: MetadataRoute.Sitemap = [];

    // Generate static routes — each path once with hreflang alternates
    for (const path of staticPaths) {
        const languages = locales.reduce((acc, loc) => ({
            ...acc,
            [loc]: `${baseUrl}/${loc}${path === '/' ? '' : path}`
        }), {} as Record<string, string>);

        routes.push({
            url: `${baseUrl}/uz${path === '/' ? '' : path}`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: (path === '' || path === '/blog') ? 1 : 0.8,
            alternates: {
                languages,
            }
        });
    }

    try {
        // 1. Dynamic product routes — THE MOST IMPORTANT PART
        const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name, name_uz, article, updated_at')
            .eq('is_deleted', false);

        if (productsError) {
            console.error('Sitemap: Failed to fetch products:', productsError.message);
        }

        if (products && products.length > 0) {
            console.log(`Sitemap: Adding ${products.length} products`);
            // Each product is added ONCE with canonical locale, alternates point to all locales
            products.forEach((product) => {
                const slug = getProductSlug(product);
                const languages = locales.reduce((acc, loc) => ({
                    ...acc,
                    [loc]: `${baseUrl}/${loc}/products/${slug}`
                }), {} as Record<string, string>);

                // Add canonical (uz) version with alternates
                routes.push({
                    url: `${baseUrl}/uz/products/${slug}`,
                    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.9,
                    alternates: {
                        languages,
                    }
                });
            });
        } else {
            console.warn('Sitemap: No products found! Check supabaseAdmin connection.');
        }

        // 2. Dynamic category routes
        const { data: categories, error: categoriesError } = await supabaseAdmin
            .from('categories')
            .select('id, updated_at')
            .eq('is_deleted', false);

        if (categoriesError) {
            console.error('Sitemap: Failed to fetch categories:', categoriesError.message);
        }

        if (categories && categories.length > 0) {
            categories.forEach((cat) => {
                const languages = locales.reduce((acc, loc) => ({
                    ...acc,
                    [loc]: `${baseUrl}/${loc}/catalog?category=${cat.id}`
                }), {} as Record<string, string>);

                routes.push({
                    url: `${baseUrl}/uz/catalog?category=${cat.id}`,
                    lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
                    changeFrequency: 'monthly' as const,
                    priority: 0.6,
                    alternates: {
                        languages,
                    }
                });
            });
        }

        // 3. Dynamic blog routes (table might not exist)
        try {
            const { data: blogs, error: blogsError } = await supabaseAdmin
                .from('blogs')
                .select('slug, created_at')
                .eq('is_deleted', false);

            if (blogsError) {
                console.error('Sitemap: Failed to fetch blogs:', blogsError.message);
            }

            if (blogs && blogs.length > 0) {
                blogs.forEach((blog) => {
                    const languages = locales.reduce((acc, loc) => ({
                        ...acc,
                        [loc]: `${baseUrl}/${loc}/blog/${blog.slug}`
                    }), {} as Record<string, string>);

                    routes.push({
                        url: `${baseUrl}/uz/blog/${blog.slug}`,
                        lastModified: blog.created_at ? new Date(blog.created_at) : new Date(),
                        changeFrequency: 'weekly' as const,
                        priority: 0.7,
                        alternates: {
                            languages,
                        }
                    });
                });
            }
        } catch (blogError) {
            console.warn('Sitemap: Blogs table not available:', blogError);
        }

        console.log(`Sitemap: Total ${routes.length} URLs generated`);
        return routes;
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        // Still return static routes even if dynamic generation fails
        return routes;
    }
}
