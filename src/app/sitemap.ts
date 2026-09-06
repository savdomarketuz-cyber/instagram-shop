import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductSlug, getCategorySlug } from '@/lib/slugify';

export const revalidate = 86400; // Regenerate sitemap every 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://velari.uz';
    const alternateLanguages = (uzUrl: string, ruUrl: string) => ({
        'uz-UZ': uzUrl,
        'ru-RU': ruUrl,
        'x-default': uzUrl,
    });

    // Static routes — ONLY pages that should be indexed
    // Removed: /cart, /wishlist, /login (these are blocked in robots.txt)
    const staticPaths = [
        '',
        '/catalog',
        '/reels',
        '/blog',
        '/about',
        '/return-policy',
    ];

    const routes: MetadataRoute.Sitemap = [];

    // Generate static routes — each path once with hreflang alternates
    for (const path of staticPaths) {
        const languages = alternateLanguages(
            `${baseUrl}/uz${path === '/' ? '' : path}`,
            `${baseUrl}/ru${path === '/' ? '' : path}`
        );

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
            .select('id, name, name_uz, name_ru, article, updated_at')
            .eq('is_deleted', false);

        if (productsError) {
            console.error('Sitemap: Failed to fetch products:', productsError.message);
        }

        if (products && products.length > 0) {
            console.log(`Sitemap: Adding ${products.length} products`);
            // Har mahsulot bir marta, har til O'Z slug'i bilan (uz=name_uz, ru=name_ru-translit)
            products.forEach((product) => {
                const slugByLocale: Record<string, string> = {
                    uz: getProductSlug(product, 'uz'),
                    ru: getProductSlug(product, 'ru'),
                };
                const languages = alternateLanguages(
                    `${baseUrl}/uz/products/${slugByLocale.uz}`,
                    `${baseUrl}/ru/products/${slugByLocale.ru}`
                );

                // Canonical (uz) versiya + hreflang alternates
                routes.push({
                    url: `${baseUrl}/uz/products/${slugByLocale.uz}`,
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

        // 2. Dynamic category routes — TOZA URL (/catalog/<slug>), har til o'z slug'i
        const { data: categories, error: categoriesError } = await supabaseAdmin
            .from('categories')
            .select('id, name, name_uz, name_ru, updated_at')
            .eq('is_deleted', false);

        if (categoriesError) {
            console.error('Sitemap: Failed to fetch categories:', categoriesError.message);
        }

        if (categories && categories.length > 0) {
            categories.forEach((cat) => {
                const slugByLocale: Record<string, string> = {
                    uz: getCategorySlug(cat, 'uz'),
                    ru: getCategorySlug(cat, 'ru'),
                };
                const languages = alternateLanguages(
                    `${baseUrl}/uz/catalog/${slugByLocale.uz}`,
                    `${baseUrl}/ru/catalog/${slugByLocale.ru}`
                );

                routes.push({
                    url: `${baseUrl}/uz/catalog/${slugByLocale.uz}`,
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
                .select('slug, created_at, updated_at')
                .eq('is_deleted', false);

            if (blogsError) {
                console.error('Sitemap: Failed to fetch blogs:', blogsError.message);
            }

            if (blogs && blogs.length > 0) {
                blogs.forEach((blog) => {
                    const languages = alternateLanguages(
                        `${baseUrl}/uz/blog/${blog.slug}`,
                        `${baseUrl}/ru/blog/${blog.slug}`
                    );

                    routes.push({
                        url: `${baseUrl}/uz/blog/${blog.slug}`,
                        lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(blog.created_at),
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
