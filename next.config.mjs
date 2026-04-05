import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swMinify: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
            {
                urlPattern: /\/api\/ai.*/i,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /https:\/\/firestore\.googleapis\.com\/.*$/i,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /https:\/\/.*\.googleapis\.com\/.*$/i,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /https:\/\/.*\.yandex\.ru\/.*$/i,
                handler: 'NetworkOnly',
            }
        ]
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    images: {
        unoptimized: false,
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 3600,
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'storage.yandexcloud.net' },
            { protocol: 'https', hostname: '**.yandexcloud.net' },
            { protocol: 'https', hostname: '**.googleapis.com' },
            { protocol: 'https', hostname: '**.wb.ru' },
            { protocol: 'https', hostname: 'images.uzum.uz' },
            { protocol: 'https', hostname: '**.supabase.co' },
        ],
    },
    webpack: (config) => {
        // Exclude native binaries from build
        config.module.rules.push({
            test: /\.node$/,
            use: 'next-loader',
        });

        // Resolve onnxruntime-node issues by falling back
        config.resolve.fallback = { server: false, fs: false, path: false };

        return config;
    }
};

export default withPWA(nextConfig);
