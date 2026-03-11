import "./globals.css";

export const metadata = {
    title: "Velari | Global Electronics",
    description: "Premium tech store - Dunyo brendlari bir joyda",

    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Velari",
    },
    formatDetection: {
        telephone: false,
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
    return (
        <html lang="en">
            <body className="bg-gray-100 text-gray-900 antialiased">
                <AppWrapper>
                    {children}
                </AppWrapper>
            </body>
        </html>
    );
}
