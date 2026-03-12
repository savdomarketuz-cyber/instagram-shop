import { Metadata } from 'next';
import ProductClient from './ProductClient';
import { db, doc, getDoc } from "@/lib/firebase";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const docRef = doc(db, "products", params.id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return {
                title: 'Mahsulot topilmadi | Velari',
                description: 'Kechirasiz, siz qidirayotgan mahsulot topilmadi.'
            };
        }
        
        const product = docSnap.data();
        const baseUrl = "https://velari.uz"; // Saytingizning asosiy manzili
        
        // OG Image URL yaratish
        const ogUrl = new URL(`${baseUrl}/api/og`);
        ogUrl.searchParams.set('name', product.name_uz || product.name);
        ogUrl.searchParams.set('price', product.price.toString());
        ogUrl.searchParams.set('image', product.image);

        const title = product.name_uz || product.name;
        const description = (product.description_uz || product.description || "").substring(0, 160);

        return {
            title: `${title} | Velari`,
            description: description,
            openGraph: {
                title: title,
                description: description,
                url: `${baseUrl}/products/${params.id}`,
                siteName: 'Velari',
                images: [
                    {
                        url: ogUrl.toString(),
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
                locale: 'uz_UZ',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: product.name_uz || product.name,
                description: description,
                images: [ogUrl.toString()],
            },
            alternates: {
                canonical: `/products/${params.id}`,
            },
            keywords: [
                product.name, 
                product.name_uz || "", 
                "Velari", 
                "muddatli to'lov", 
                "skidka", 
                "hamyonbop narx", 
                product.category
            ].filter(Boolean) as string[],
            robots: {
                index: true,
                follow: true,
            },
        };
    } catch (error) {
        return {
            title: 'Velari | Global Electronics',
        };
    }
}

export default function Page({ params }: { params: { id: string } }) {
    return <ProductClient params={params} />;
}
