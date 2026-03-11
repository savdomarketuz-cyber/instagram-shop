"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { db, doc, getDoc, collection, query, where, getDocs, limit, updateDoc, increment, arrayUnion, setDoc } from "@/lib/firebase";
import { translations } from "@/lib/translations";
import { Loader2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { getDeliveryDateText } from "@/lib/date-utils";

// Components
import { ProductMedia } from "@/components/product/ProductMedia";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { ProductDescriptionModal } from "@/components/product/ProductDescriptionModal";
import { RelatedProducts } from "@/components/product/RelatedProducts";

interface Product {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    image: string;
    images?: string[];
    category: string;
    category_uz?: string;
    category_ru?: string;
    description?: string;
    description_uz?: string;
    description_ru?: string;
    stock: number;
    sales?: number;
    sku?: string;
    groupId?: string;
    colorName?: string;
    isDeleted?: boolean;
    isOriginal?: boolean;
    stockDetails?: { [key: string]: number };
    rating?: number;
    reviewCount?: number;
    videoUrl?: string;
}

export default function ProductDetail({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { 
        addToCart, toggleWishlist, wishlist, cart, updateQuantity, 
        removeFromCart, user, language, showToast 
    } = useStore();
    const t = translations[language];

    // Core Data State
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [boughtTogether, setBoughtTogether] = useState<Product[]>([]);
    const [popularProducts, setPopularProducts] = useState<Product[]>([]);
    const [groupProducts, setGroupProducts] = useState<Product[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    
    // UI State
    const [activeImage, setActiveImage] = useState(0);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [popularLoading, setPopularLoading] = useState(false);
    const [deliverySettings, setDeliverySettings] = useState<any>(null);

    // Initial Fetch
    useEffect(() => {
        fetchProduct();
        fetchComments();
    }, [params.id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "products", params.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Product;
                setProduct(data);
                
                // Track interest and viewed
                if (user?.phone) {
                    const interestsRef = doc(db, "user_interests", user.phone);
                    setDoc(interestsRef, {
                        categories: { [data.category]: increment(1) },
                        viewedProducts: arrayUnion(params.id),
                        lastInteraction: new Date().toISOString()
                    }, { merge: true }).catch(() => {});
                }

                // Parallel fetching for performance
                Promise.all([
                    fetchRelated(data.category, data.id),
                    fetchBoughtTogether(),
                    fetchPopular(),
                    data.groupId ? fetchGroup(data.groupId) : Promise.resolve(),
                    fetchDeliverySettings(data)
                ]);

            } else { router.push("/"); }
        } catch (e) {
            console.error("Fetch Product failed", e);
        } finally { setLoading(false); }
    };

    const fetchDeliverySettings = async (productData: Product) => {
        const warehousesSnap = await getDocs(collection(db, "warehouses"));
        const warehouses = warehousesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const availableWhId = Object.keys(productData.stockDetails || {}).find(id => (productData.stockDetails as any)[id] > 0);
        const warehouse: any = warehouses.find(w => w.id === availableWhId) || warehouses[0];
        
        if (warehouse?.dbs) {
            setDeliverySettings({
                cutoff: warehouse.dbs.cutoffHour || 16,
                days: warehouse.dbs.deliveryDays || 1,
                offDays: warehouse.dbs.offDays || [],
                holidays: warehouse.dbs.holidays || []
            });
        }
    };

    const fetchRelated = async (category: string, currentId: string) => {
        const q = query(collection(db, "products"), where("category", "==", category), limit(40));
        const snap = await getDocs(q);
        const fetched = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Product))
                .filter(p => p.id !== currentId && !p.isDeleted)
                .sort(() => Math.random() - 0.5)
                .slice(0, 10);
        setRelatedProducts(fetched);
    };

    const fetchBoughtTogether = async () => {
        const q = query(collection(db, "products"), limit(10));
        const snap = await getDocs(q);
        setBoughtTogether(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== params.id));
    };

    const fetchPopular = async () => {
        setPopularLoading(true);
        const q = query(collection(db, "products"), where("isDeleted", "==", false), limit(20));
        const snap = await getDocs(q);
        const fetched = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Product))
                .sort((a, b) => (b.sales || 0) - (a.sales || 0))
                .slice(0, 20);
        setPopularProducts(fetched);
        setPopularLoading(false);
    };

    const fetchGroup = async (groupId: string) => {
        const q = query(collection(db, "products"), where("groupId", "==", groupId));
        const snap = await getDocs(q);
        setGroupProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    };

    const fetchComments = async () => {
        const q = query(collection(db, "comments"), where("productId", "==", params.id));
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetched.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setComments(fetched);
    };

    const totalStock = useMemo(() => 
        product?.stockDetails ? Object.values(product.stockDetails).reduce((a: number, b: number) => a + b, 0) : 0
    , [product]);

    const isWishlisted = product ? wishlist.some(item => item.id === product.id) : false;
    const cartItem = product ? cart.find((item) => item.id === product.id) : null;
    const allMedia = useMemo(() => [
        ...(product?.videoUrl ? [{ type: 'video', url: product.videoUrl }] : []),
        ...(product?.images && product.images.length > 0 ? product.images : [product?.image || ""]).map(img => ({ type: 'image', url: img }))
    ], [product]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-black" size={32} />
        </div>
    );

    if (!product) return null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product[language === 'uz' ? 'name_uz' : 'name_ru'] || product.name,
        "image": allMedia.filter(m => m.type === 'image').map(m => m.url),
        "description": product[language === 'uz' ? 'description_uz' : 'description_ru'] || product.description,
        "sku": product.sku || product.id,
        "brand": {
            "@type": "Brand",
            "name": "Velari"
        },
        "offers": {
            "@type": "Offer",
            "url": `https://velari.uz/products/${product.id}`,
            "priceCurrency": "UZS",
            "price": product.price,
            "availability": totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "Velari"
            }
        }
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": language === 'uz' ? "Bosh sahifa" : "Главная",
                "item": "https://velari.uz"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": product[language === 'uz' ? 'category_uz' : 'category_ru'] || product.category,
                "item": `https://velari.uz/catalog?category=${product.category}`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product[language === 'uz' ? 'name_uz' : 'name_ru'] || product.name,
                "item": `https://velari.uz/products/${product.id}`
            }
        ]
    };

    return (
        <div className="bg-white min-h-screen pb-40">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <ProductMedia 
                allMedia={allMedia}
                activeImage={activeImage}
                setActiveImage={setActiveImage}
                isWishlisted={isWishlisted}
                toggleWishlist={toggleWishlist}
                product={product}
            />

            <ProductInfo 
                product={product}
                language={language}
                t={t}
                groupProducts={groupProducts}
                totalStock={totalStock}
                getDeliveryDateText={() => getDeliveryDateText(language, deliverySettings)}
                onDescriptionOpen={() => setIsDescriptionModalOpen(true)}
            />

            <ReviewsSection 
                productId={params.id}
                product={product}
                user={user}
                language={language}
                t={t}
                comments={comments}
                fetchComments={fetchComments}
                showToast={showToast}
                router={router}
            />

            <RelatedProducts 
                relatedProducts={relatedProducts}
                boughtTogether={boughtTogether}
                popularProducts={popularProducts}
                language={language}
                cart={cart}
                wishlist={wishlist}
                addToCart={addToCart}
                toggleWishlist={toggleWishlist}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                popularLoading={popularLoading}
                t={t}
            />

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-8 max-w-md mx-auto bg-gradient-to-t from-white via-white/100 to-transparent z-40 backdrop-blur-sm">
                {cartItem ? (
                    <div className="flex items-center gap-4 animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center gap-6 bg-gray-50 border border-gray-100 px-8 py-5 rounded-[28px] shadow-sm flex-1 justify-center text-black">
                            <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="text-gray-400"><Minus size={20} strokeWidth={3} /></button>
                            <span className="text-lg font-black w-4 text-center">{cartItem.quantity}</span>
                            <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="text-gray-400"><Plus size={20} strokeWidth={3} /></button>
                        </div>
                        <Link href="/cart" className="bg-[#E4D9FF] text-[#6335ED] p-5 rounded-[28px] flex items-center gap-3 font-black text-sm pr-10 shadow-xl group">
                            <div className="p-2 bg-white rounded-2xl"><ShoppingBag size={20} strokeWidth={3} /></div>
                            {language === 'uz' ? "O'TISH" : "ПЕРЕЙТИ"}
                        </Link>
                    </div>
                ) : (
                    <button 
                        onClick={() => addToCart({ ...product, imageUrl: product.image, stock: totalStock } as any)} 
                        className="w-full py-6 bg-black text-white rounded-full font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95"
                    >
                        <Plus size={24} strokeWidth={3} /> {language === 'uz' ? "SAVATGA QO'SHISH" : "V KORZINU"}
                    </button>
                )}
            </div>

            <ProductDescriptionModal 
                isOpen={isDescriptionModalOpen}
                onClose={() => setIsDescriptionModalOpen(false)}
                product={product}
                language={language}
            />
        </div>
    );
}
