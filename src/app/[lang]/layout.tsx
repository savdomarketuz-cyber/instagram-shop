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
        default: "Velari | Elektronika va Gadjetlar Do'koni O'zbekistonda",
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
        canonical: "/",
        languages: {
            'uz-UZ': '/uz',
            'ru-RU': '/ru',
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
        title: "Velari | Global Electronics & Gadgets Uzbekistan",
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
        "sameAs": [
            "https://instagram.com/velari.uz",
            "https://t.me/velariuz"
        ]
    };

    const displayLang = ['uz', 'ru'].includes(params.lang) ? params.lang : 'uz';

    return (
        <html lang={displayLang} className={inter.variable}>
            <head>
                <link rel="preconnect" href="https://storage.yandexcloud.net" />
                <link rel="dns-prefetch" href="https://storage.yandexcloud.net" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
                />
                <style dangerouslySetInnerHTML={{ __html: `
                    #pwa-splash {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: #f0f0f2; z-index: 999999; display: none;
                        align-items: center; justify-content: center; overflow: hidden;
                    }
                    body.is-pwa #pwa-splash { display: flex; }
                    .logo-container { display: flex; flex-direction: column; align-items: center; position: relative; transform: scale(0.6); }
                    @media (min-width: 768px) { .logo-container { transform: scale(1); } }
                    .logo-text { font-family: 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; font-size: 140px; font-weight: 750; color: #0d1117; letter-spacing: -1px; line-height: 1; display: flex; align-items: baseline; }
                    .letter { display: inline-block; opacity: 0; transform: translateY(60px); animation: letterRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    .logo-dot { display: inline-block; color: #2d6e3e; font-size: 100px; position: relative; top: 8px; opacity: 0; transform: scale(0) rotate(-180deg); animation: dotSpin 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.62s; }
                    @keyframes letterRise { 0% { opacity: 0; transform: translateY(60px); } 100% { opacity: 1; transform: translateY(0); } }
                    @keyframes dotSpin { 0% { opacity: 0; transform: scale(0) rotate(-180deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
                    .smile-line { margin-top: 12px; }
                    .arc-wrap { clip-path: inset(0 50% 0 50%); animation: revealArc 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.75s; }
                    @keyframes revealArc { 0% { clip-path: inset(0 50% 0 50%); } 100% { clip-path: inset(0 0% 0 0%); } }
                    .glow { position: absolute; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(45,110,62,0.07) 0%, transparent 65%); top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); animation: glowIn 1.4s ease forwards 0.3s; pointer-events: none; z-index: -1; }
                    @keyframes glowIn { 0% { transform: translate(-50%, -50%) scale(0); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
                `}} />
                <script dangerouslySetInnerHTML={{ __html: `
                    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://')) {
                        document.documentElement.classList.add('is-pwa');
                        document.body.classList.add('is-pwa');
                    }
                `}} />
            </head>
            <body className="bg-white text-gray-900 antialiased font-sans w-full max-w-full min-h-screen">
                <a href="#main-content" className="skip-to-main">
                    Asosiy kontentga o&apos;tish
                </a>
                <div id="pwa-splash">
                    <div className="logo-container">
                        <div className="glow"></div>
                        <div className="logo-text">
                            <span className="letter" style={{animationDelay:'0.05s'}}>V</span>
                            <span className="letter" style={{animationDelay:'0.13s'}}>E</span>
                            <span className="letter" style={{animationDelay:'0.21s'}}>L</span>
                            <span className="letter" style={{animationDelay:'0.29s'}}>A</span>
                            <span className="letter" style={{animationDelay:'0.37s'}}>R</span>
                            <span className="letter" style={{animationDelay:'0.45s'}}>I</span>
                            <span className="logo-dot">.</span>
                        </div>
                        <div className="smile-line">
                            <div className="arc-wrap">
                                <svg width="560" height="210" viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M 0 20 Q 280 240 560 20 Q 280 180 0 20 Z" fill="#2d6e3e" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="main-content" className="w-full max-w-full">
                    <AppWrapper lang={displayLang}>
                        {children}
                    </AppWrapper>
                </div>
                <YandexMetrika ymid="107383008" />
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}

