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
    experimental: {
        serverComponentsExternalPackages: ['@xenova/transformers', 'sharp'],
    },
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
            { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
        ],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('@xenova/transformers', 'sharp');
        }
        
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });

        config.resolve.alias = {
            ...config.resolve.alias,
            'onnxruntime-node': false,
        };
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
