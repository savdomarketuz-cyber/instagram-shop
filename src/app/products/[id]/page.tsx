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
        const baseUrl = "https://velari.uz";
        
        const ogUrl = new URL(`${baseUrl}/api/og`);
        ogUrl.searchParams.set('name', product.name_uz || product.name);
        ogUrl.searchParams.set('price', product.price.toString());
        ogUrl.searchParams.set('image', product.image);

        const title = `${product.name_uz || product.name} - Muddatli to'lov va Arzon Narx | Velari`;
        const description = product.description_uz || product.description || `Velari do'konida ${product.name} hamyonbop narxlarda. Rasmiy kafolat va Toshkent bo'ylab tezkor yetkazib berish.`;

        return {
            title: title,
            description: description.substring(0, 160),
            openGraph: {
                title: title,
                description: description.substring(0, 160),
                url: `${baseUrl}/products/${params.id}`,
                siteName: 'Velari',
                images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: title }],
                locale: 'uz_UZ',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description.substring(0, 160),
                images: [ogUrl.toString()],
            },
            alternates: { canonical: `/products/${params.id}` },
            keywords: [
                product.name, 
                product.name_uz || "", 
                "Velari", 
                "muddatli to'lov", 
                "skidka", 
                "arzon narx", 
                "kafolat",
                "Toshkent",
                "Uzbekistan",
                product.category
            ].filter(Boolean) as string[],
            robots: { index: true, follow: true },
        };
    } catch (error) {
        return { title: 'Velari | Global Electronics' };
    }
}

async function getProductData(id: string) {
    const docRef = doc(db, "products", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
}

export default async function Page({ params }: { params: { id: string } }) {
    const product: any = await getProductData(params.id);
    
    if (!product) return <div>Mahsulot topilmadi</div>;

    // Structured Data (Schema.org) for Google to understand this is a PRODUCT
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name_uz || product.name,
        "image": product.images || [product.image],
        "description": product.description_uz || product.description,
        "sku": product.sku || product.id,
        "brand": { "@type": "Brand", "name": "Velari" },
        "offers": {
            "@type": "Offer",
            "url": `https://velari.uz/products/${product.id}`,
            "priceCurrency": "UZS",
            "price": product.price,
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Velari" }
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductClient params={params} />
        </>
    );
}
