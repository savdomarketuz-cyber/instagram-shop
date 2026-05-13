import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/uz/',
                    '/ru/',
                    '/uz/products/',
                    '/ru/products/',
                    '/uz/catalog',
                    '/ru/catalog',
                    '/uz/blog',
                    '/ru/blog',
                    '/uz/reels',
                    '/ru/reels',
                ],
                disallow: [
                    '/admin/',
                    '/api/',
                    '/*/checkout',
                    '/*/cart',
                    '/*/login',
                    '/*/account',
                    '/*/orders',
                    '/*/wishlist',
                    '/*/payment',
                    '/*/wallet',
                    '/*/messages/',
                    '/*/affiliate',
                ],
            },
            {
                // Block common AI crawlers that don't respect ToS
                userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai'],
                disallow: '/',
            }
        ],
        sitemap: 'https://velari.uz/sitemap.xml',
        host: 'https://velari.uz',
    };
}
