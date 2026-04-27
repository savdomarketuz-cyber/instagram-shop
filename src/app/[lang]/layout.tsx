import "../globals.css";
import { Inter } from "next/font/google";
import { i18n } from "@/lib/i18n-config";

export async function generateStaticParams() {
    return i18n.locales.map((locale) => ({ lang: locale }));
}

const inter = Inter({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata = {
    title: {
        default: "Velari | Zamonaviy Texnologiyalar va Gadjetlar Dunyosi",
        template: "%s | Velari"
    },
    description: "Premium gadjetlar va elektronika do'koni. Apple, Samsung, Xiaomi mahsulotlari hamyonbop narxlarda. Muddatli to'lov, rasmiy kafolat va Toshkent bo'ylab tekin yetkazib berish.",
    keywords: [
        "Velari", "velari.uz", "elektronika do'koni", "gadjetlar", "iphone narxi", "samsung narxi", 
        "Toshkent", "O'zbekistan", "muddatli to'lov", "bo'lib to'lash", "kreditga telefon", 
        "online shop", "internet do'kon", "arzon narxlar", "kafolatli texnika"
    ],
    authors: [{ name: "Velari Team" }],
    creator: "Velari",
    publisher: "Velari",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/icons/icon-192x192.png",
    },
    metadataBase: new URL("https://velari.uz"),
    alternates: {
        languages: {
            'uz-UZ': 'https://velari.uz/uz',
            'ru-RU': 'https://velari.uz/ru',
        },
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        title: "Velari | Zamonaviy Texnologiyalar va Gadjetlar Dunyosi",
        description: "Premium tech store in Uzbekistan. Global brands, official warranty, and fast delivery. Buy iPhones, Samsung and Xiaomi with installments.",
        url: "https://velari.uz",
        siteName: "Velari",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Velari Premium Electronics Store",
            },
        ],
        locale: "uz_UZ",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Velari | Global Electronics",
        description: "Premium tech store in Uzbekistan. Global brands, official warranty.",
        images: ["/og-image.png"],
    },
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Velari",
    },
    verification: {
        google: "LTHMhrgHGixfKuNRWuOnvLrkiUHaTuTiy1kCG",
    },
};

export const viewport = {
    themeColor: "#2d6e3e",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover" as const,
};

import AppWrapper from "@/components/AppWrapper";
import YandexMetrika from "@/components/YandexMetrika";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { lang: string };
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Velari",
        "url": "https://velari.uz",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://velari.uz/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    const orgJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Velari",
        "url": "https://velari.uz",
        "logo": "https://velari.uz/logo.png",
        "contactPoint": [
            {
                "@type": "ContactPoint",
                "telephone": "+998950821188",
                "contactType": "customer service",
                "areaServed": "UZ",
                "availableLanguage": ["Uzbek", "Russian"]
            },
            {
                "@type": "ContactPoint",
                "telephone": "+998200144989",
                "contactType": "sales",
                "areaServed": "UZ",
                "availableLanguage": ["Uzbek", "Russian"]
            }
        ],
        "sameAs": [
            "https://instagram.com/velari_uz_",
            "https://t.me/VELARI_UZ_ADMIN"
        ]
    };

    const storeJsonLd = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": "Velari",
        "url": "https://velari.uz",
        "image": "https://velari.uz/logo.png",
        "telephone": ["+998950821188", "+998200144989"],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Tashkent",
            "addressLocality": "Tashkent",
            "addressRegion": "Tashkent",
            "postalCode": "100000",
            "addressCountry": "UZ"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": "41.2995",
            "longitude": "69.2401"
        },
        "priceRange": "$$",
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
                ],
                "opens": "00:00",
                "closes": "23:59"
            }
        ]
    };

    const displayLang = ['uz', 'ru'].includes(params.lang) ? params.lang : 'uz';

    return (
        <html lang={displayLang} className={inter.variable}>
            <head>
                {/* 🚀 VIP Magistral: Preconnect with CrossOrigin for instant data flow */}
                <link rel="preconnect" href="https://storage.yandexcloud.net" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://storage.yandexcloud.net" />
                <link rel="preconnect" href="https://slmbethqqqugnktxwzdz.supabase.co" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://slmbethqqqugnktxwzdz.supabase.co" />
                
                {/* ⚡ High-Priority Asset Preloading */}
                <link rel="preload" href="/globals.css" as="style" fetchPriority="high" />

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
                />
            </head>
            <body className="bg-white text-gray-900 antialiased font-sans w-full max-w-full min-h-screen">
                <a href="#main-content" className="skip-to-main">
                    Asosiy kontentga o&apos;tish
                </a>

                <div id="main-content" className="w-full max-w-full">
                    <AppWrapper lang={displayLang}>
                        {children}
                    </AppWrapper>
                </div>
                <YandexMetrika ymid="107383008" />
                <Analytics />
                <SpeedInsights />
                <script dangerouslySetInnerHTML={{ __html: `
                    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://')) {
                        document.documentElement.classList.add('is-pwa');
                        document.body.classList.add('is-pwa');
                    }
                `}} />
            </body>
        </html>
    );
}

