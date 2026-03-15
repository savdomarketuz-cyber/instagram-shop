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
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*$/,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /^https:\/\/firebaselogging\.googleapis\.com\/.*$/,
                handler: 'NetworkOnly',
            },
            {
                urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*$/,
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
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'storage.yandexcloud.net' },
            { protocol: 'https', hostname: '**.yandexcloud.net' },
            { protocol: 'https', hostname: '**.googleapis.com' },
            { protocol: 'https', hostname: '**.wb.ru' },
            { protocol: 'https', hostname: 'images.uzum.uz' },
        ],
    },
};

export default withPWA(nextConfig);

