import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

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
        importScripts: ["/push-handler.js"],
        runtimeCaching: [
            {
                urlPattern: /\/api\/ai.*/i,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /https:\/\/.*\.googleapis\.com\/.*$/i,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /^https:\/\/storage\.yandexcloud\.net\/.*\.(?:png|jpg|jpeg|webp|avif|gif|svg)$/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'yandex-images',
                    expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
            {
                urlPattern: /^https:\/\/storage\.yandexcloud\.net\/.*\.mp4$/i,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'yandex-videos',
                    rangeRequests: true,
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 14 },
                    cacheableResponse: { statuses: [0, 200, 206] },
                },
            },
            {
                urlPattern: /^\/_next\/image\?.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'next-images',
                    expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
                    cacheableResponse: { statuses: [0, 200] },
                },
            },
        ]
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverComponentsExternalPackages: ['sharp', 'web-push'],
    },
    images: {
        unoptimized: true,
        formats: ['image/webp'],
        minimumCacheTTL: 31536000,
        deviceSizes: [640, 828, 1080],
        imageSizes: [64, 128, 256, 384],
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'storage.yandexcloud.net' },
            { protocol: 'https', hostname: '**.yandexcloud.net' },
            { protocol: 'https', hostname: '**.googleapis.com' },
            { protocol: 'https', hostname: '**.wb.ru' },
            { protocol: 'https', hostname: 'images.uzum.uz' },
            { protocol: 'https', hostname: '**.supabase.co' },
            { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
        ],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('sharp');
        }
        return config;
    }

};

export default withSentryConfig(
    withPWA(nextConfig),
    {
        silent: true,
        org: "velari",
        project: "velari-market",
    },
    {
        widenClientFileUpload: true,
        transpileClientSDK: true,
        tunnelRoute: "/monitoring",
        hideSourceMaps: true,
        disableLogger: true,
    }
);
