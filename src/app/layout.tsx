import "./globals.css";

export const metadata = {
    title: {
        default: "Velari | Global Electronics",
        template: "%s | Velari"
    },
    description: "Premium tech store in Uzbekistan. Global brands, official warranty, and fast delivery. Velari - Your connection to the future.",
    keywords: ["electronics", "tech store", "Uzbekistan", "Velari", "smartphones", "laptops", "accessories", "gadgets", "online shop", "muddatli to'lov", "muddatli tolov", "bo'lib to'lash"],
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
        title: "Velari | Global Electronics",
        description: "Premium tech store in Uzbekistan. Global brands, official warranty, and fast delivery.",
        url: "https://velari.uz",
        siteName: "Velari",
        images: [
            {
                url: "/og-image.png", // We should ensure this image exists
                width: 1200,
                height: 630,
                alt: "Velari Premium Electronics",
            },
        ],
        locale: "uz_UZ",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Velari | Global Electronics",
        description: "Premium tech store in Uzbekistan. Global brands, official warranty.",
        images: ["/og-image.jpg"],
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
    themeColor: "#000000",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};


import AppWrapper from "@/components/AppWrapper";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
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

    return (
        <html lang="en">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
                />
            </head>
            <body className="bg-gray-100 text-gray-900 antialiased">
                <AppWrapper>
                    {children}
                </AppWrapper>
            </body>
        </html>
    );
}

