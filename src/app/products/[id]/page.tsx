"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { db, doc, getDoc, collection, query, where, getDocs, limit, updateDoc, increment, arrayUnion, setDoc } from "@/lib/firebase";
import { translations } from "@/lib/translations";
import { Loader2, Plus, Minus, ShoppingBag, Heart, Star, Check, Truck, Clock, ShieldCheck, RefreshCw, ChevronLeft } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center bg-white font-sans">
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
        <div className="bg-white min-h-screen text-black font-sans selection:bg-black selection:text-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

            {/* Mobile View (Social Style) */}
            <div className="md:hidden" style={{ overscrollBehavior: 'none', touchAction: 'pan-x pan-y' }}>
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
            </div>

            {/* Desktop View (E-commerce Grid Style) */}
            <div className="hidden md:block max-w-[1440px] mx-auto px-10 py-12">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest mb-10 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <Link href="/" className="hover:text-black transition-colors">MAHSULOTLAR</Link>
                    <span>/</span>
                    <Link href={`/catalog?category=${product.category}`} className="hover:text-black transition-colors">{product[language === 'uz' ? 'category_uz' : 'category_ru'] || product.category}</Link>
                    <span>/</span>
                    <span className="text-black italic">{product[language === 'uz' ? 'name_uz' : 'name_ru'] || product.name}</span>
                </div>

                <div className="grid grid-cols-12 gap-16">
                    {/* Left: Gallery */}
                    <div className="col-span-12 lg:col-span-7 flex gap-6 h-[700px]">
                        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar w-24 shrink-0">
                            {allMedia.map((media, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${activeImage === i ? "border-black scale-95 shadow-xl" : "border-gray-50 opacity-60 hover:opacity-100"}`}
                                >
                                    {media.type === 'image' ? (
                                        <img src={media.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full bg-black flex items-center justify-center text-white"><Loader2 size={16} /></div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-[40px] overflow-hidden relative group/hero shadow-2xl shadow-black/5">
                            <img 
                                src={allMedia[activeImage]?.url} 
                                className="w-full h-full object-contain p-10 animate-in fade-in zoom-in-95 duration-500" 
                                alt={product.name} 
                            />
                            <button 
                                onClick={() => toggleWishlist(product)}
                                className="absolute top-8 right-8 p-5 bg-white/80 backdrop-blur-xl rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all text-black border border-white"
                            >
                                <Heart size={24} fill={isWishlisted ? "black" : "none"} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Info Panels */}
                    <div className="col-span-12 lg:col-span-5 space-y-10">
                        {/* 1. Header & Price */}
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                            <h1 className="text-4xl font-black tracking-tighter italic uppercase mb-6 leading-tight">
                                {product[language === 'uz' ? 'name_uz' : 'name_ru'] || product.name}
                            </h1>
                            <div className="flex items-center gap-2 mb-8 bg-gray-50/50 w-fit px-4 py-2 rounded-2xl">
                                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                                <span className="font-black text-sm">{product.rating || 4.9}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest ml-2">({product.reviewCount || 0} sharh)</span>
                            </div>

                            <div className="space-y-2 mb-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.common.price}</p>
                                <div className="flex items-center gap-6">
                                    <div className="text-6xl font-black italic tracking-tighter text-black">
                                        {product.price.toLocaleString()} <span className="text-2xl not-italic">$</span>
                                    </div>
                                    {product.oldPrice && product.oldPrice > product.price && (
                                        <div className="space-y-1">
                                            <span className="text-gray-300 line-through font-bold text-2xl block">{product.oldPrice.toLocaleString()} $</span>
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-xl text-xs font-black tracking-tighter">
                                                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 gap-4 mt-12">
                                {cartItem ? (
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-8 bg-gray-50 px-8 py-4 rounded-[28px] border border-gray-100 flex-1 justify-center">
                                            <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="text-gray-400 hover:text-black transition-colors"><Minus size={20} strokeWidth={3} /></button>
                                            <span className="text-2xl font-black w-8 text-center">{cartItem.quantity}</span>
                                            <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="text-gray-400 hover:text-black transition-colors"><Plus size={20} strokeWidth={3} /></button>
                                        </div>
                                        <Link href="/cart" className="bg-[#E4D9FF] text-[#6335ED] px-10 py-4 rounded-[28px] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#6335ED]/10">
                                            <ShoppingBag size={20} strokeWidth={3} /> {language === 'uz' ? "O'TISH" : "ПЕРЕЙТИ"}
                                        </Link>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => addToCart({ ...product, imageUrl: product.image, stock: totalStock } as any)}
                                        className="w-full bg-black text-white py-6 rounded-[32px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20"
                                    >
                                        <Plus size={24} strokeWidth={3} /> {language === 'uz' ? "SAVATGA QO'SHISH" : "V KORZINU"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 2. Delivery & Benefits */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-gray-50/50 p-8 rounded-[40px] border border-gray-100 flex flex-col gap-6 group hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                    <Truck size={28} className="text-black" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Etkazib berish</p>
                                    <p className="text-lg font-black italic uppercase tracking-tighter">{getDeliveryDateText(language, deliverySettings)}</p>
                                </div>
                            </div>
                            <div className="bg-[#F8FFF9] p-8 rounded-[40px] border border-green-100/50 flex flex-col gap-6 group hover:bg-white hover:shadow-xl transition-all">
                                <div className="w-16 h-16 bg-green-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-green-500/20 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-green-600/50 uppercase tracking-widest mb-2">Kafolat</p>
                                    <p className="text-lg font-black italic uppercase tracking-tighter">1 yil rasmiy kafolat</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-24 max-w-4xl">
                    <h2 className="text-3xl font-black tracking-tighter mb-8 italic uppercase">Batafsil ma'lumot</h2>
                    <div className="prose prose-lg max-w-none text-gray-600 font-medium leading-relaxed bg-gray-50 p-12 rounded-[50px] border border-gray-100">
                        {product[language === 'uz' ? 'description_uz' : 'description_ru'] || product.description}
                    </div>
                </div>
            </div>

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

            <ProductDescriptionModal 
                isOpen={isDescriptionModalOpen}
                onClose={() => setIsDescriptionModalOpen(false)}
                product={product}
                language={language}
            />
        </div>
    );
}
