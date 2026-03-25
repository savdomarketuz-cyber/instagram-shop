"use client";

import { useStore } from "@/store/store";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { mapProduct, mapComment } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import { Loader2, Plus, Minus, ShoppingBag, Heart, Star, Check, Truck, Clock, ShieldCheck, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getDeliveryDateText } from "@/lib/date-utils";
import Image from "next/image";

// Components
import { ProductMedia } from "@/components/product/ProductMedia";
import { ProductInfo } from "@/components/product/ProductInfo";
import dynamic from "next/dynamic";
const ReviewsSection = dynamic(() => import("@/components/product/ReviewsSection").then(mod => ({ default: mod.ReviewsSection })), {
    loading: () => <div className="h-40 animate-pulse bg-gray-50 rounded-3xl mx-4 my-8" />,
    ssr: false,
});
import { ProductDescriptionModal } from "@/components/product/ProductDescriptionModal";
import { RelatedProducts } from "@/components/product/RelatedProducts";

import type { Product } from "@/types";

export default function ProductClient({ params }: { params: { id: string } }) {
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
    const [categoryData, setCategoryData] = useState<any | null>(null);
    
    // UI State
    const [activeImage, setActiveImage] = useState(0);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [popularLoading, setPopularLoading] = useState(false);
    const [deliverySettings, setDeliverySettings] = useState<{ cutoff: number; days: number; offDays: string[]; holidays: string[] } | null>(null);

    // Initial Fetch
    useEffect(() => {
        fetchProduct();
        fetchComments();
    }, [params.id]);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const { data: productData, error } = await supabase
                .from("products")
                .select("*")
                .eq("id", params.id)
                .single();

            if (productData) {
                const data = mapProduct(productData);
                setProduct(data);
                
                // Track interest and viewed (Optional / Future implementation with Supabase)
                if (user?.phone) {
                   // We could use an RPC or just update user_interests table
                   supabase.rpc('track_product_view', { 
                       p_user_phone: user.phone, 
                       p_product_id: params.id,
                       p_category_id: data.category
                   });
                }

                // Parallel fetching
                const fetchCat = async () => {
                    if (data.category) {
                        const { data: catData } = await supabase.from("categories").select("*").eq("id", data.category).single();
                        if (catData) setCategoryData(catData);
                    }
                };

                Promise.all([
                    fetchRelated(data.category as string, data.id),
                    fetchBoughtTogether(),
                    fetchPopular(),
                    data.groupId ? fetchGroup(data.groupId) : Promise.resolve(),
                    fetchDeliverySettings(data),
                    fetchCat()
                ]);

            } else { router.push("/"); }
        } catch (e) {
            console.error("Fetch Product failed", e);
        } finally { setLoading(false); }
    };

    const fetchDeliverySettings = async (productData: Product) => {
        const { data: warehouses } = await supabase.from("warehouses").select("*");
        if (!warehouses) return;

        const availableWhId = Object.keys(productData.stockDetails || {}).find(id => (productData.stockDetails as Record<string, number>)[id] > 0);
        const warehouse = warehouses.find(w => w.id === availableWhId) || warehouses[0];
        
        if (warehouse?.data?.dbs) {
            const dbs = warehouse.data.dbs;
            setDeliverySettings({
                cutoff: Number(dbs.cutoffHour) || 16,
                days: Number(dbs.deliveryDays) || 1,
                offDays: Array.isArray(dbs.offDays) ? dbs.offDays : [],
                holidays: Array.isArray(dbs.holidays) ? dbs.holidays : []
            });
        }
    };

    const fetchRelated = async (category: string, currentId: string) => {
        const { data } = await supabase
            .from("products")
            .select("*")
            .eq("category_id", category)
            .eq("is_deleted", false)
            .neq("id", currentId)
            .limit(10);
        
        if (data) setRelatedProducts(data.map(mapProduct));
    };

    const fetchBoughtTogether = async () => {
        const { data } = await supabase
            .from("products")
            .select("*")
            .eq("is_deleted", false)
            .neq("id", params.id)
            .limit(10);
        
        if (data) setBoughtTogether(data.map(mapProduct));
    };

    const fetchPopular = async () => {
        const { cachedProducts, setCachedProducts } = useStore.getState();
        if (cachedProducts && cachedProducts.length > 0) {
            setPopularProducts(cachedProducts.slice(0, 20));
            return;
        }

        setPopularLoading(true);
        const { data } = await supabase
            .from("products")
            .select("*")
            .eq("is_deleted", false)
            .order("sales", { ascending: false })
            .limit(20);
        
        if (data) {
            const mapped = data.map(mapProduct);
            setPopularProducts(mapped);
            setCachedProducts(mapped);
        }
        setPopularLoading(false);
    };

    const fetchGroup = async (groupId: string) => {
        const { data } = await supabase.from("products").select("*").eq("group_id", groupId).eq("is_deleted", false);
        if (data) setGroupProducts(data.map(mapProduct));
    };

    const fetchComments = async () => {
        const { data } = await supabase
            .from("comments")
            .select("*")
            .eq("product_id", params.id)
            .order("created_at", { ascending: false });
        
        if (data) setComments(data.map(mapComment));
    };

    const totalStock = useMemo(() => 
        product?.stockDetails ? Object.values(product.stockDetails).reduce((a: number, b: number) => a + b, 0) : 0
    , [product]);

    const handleFastBuy = () => {
        if (!product) return;
        const item = {
            id: product.id,
            name: product.name,
            name_uz: product.name_uz,
            name_ru: product.name_ru,
            price: product.price,
            quantity: 1,
            imageUrl: product.image
        };
        sessionStorage.setItem('fast_buy_item', JSON.stringify(item));
        router.push('/checkout?fast=true');
    };

    const isWishlisted = product ? wishlist.some(item => item.id === product.id) : false;
    const cartItem = product ? cart.find((item) => item.id === product.id) : null;
    const allMedia = useMemo(() => [
        ...(product?.videoUrl ? [{ type: 'video', url: product.videoUrl }] : []),
        ...(product?.images && product.images.length > 0 ? product.images : [product?.image || ""]).map(img => ({ type: 'image', url: img }))
    ], [product]);

    if (loading) return (
        <div className="min-h-screen bg-white font-sans animate-pulse">
            {/* Desktop Skeleton */}
            <div className="hidden md:block max-w-[1440px] mx-auto px-10 py-12">
                <div className="h-4 bg-gray-50 rounded-full w-48 mb-10" />
                <div className="grid grid-cols-12 gap-16">
                    <div className="col-span-12 lg:col-span-7 flex gap-6 h-[700px]">
                        <div className="w-24 shrink-0 space-y-4">
                            {[...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-gray-50 rounded-2xl" />)}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-[40px]" />
                    </div>
                    <div className="col-span-12 lg:col-span-5 space-y-10">
                        <div className="bg-white p-10 rounded-[40px] border border-gray-100 space-y-6">
                            <div className="h-10 bg-gray-50 rounded-full w-3/4" />
                            <div className="h-6 bg-gray-50 rounded-full w-24" />
                            <div className="h-16 bg-gray-50 rounded-full w-1/2" />
                            <div className="h-40 bg-gray-50 rounded-[40px]" />
                            <div className="h-16 bg-gray-50 rounded-full w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden space-y-6">
                <div className="aspect-[4/5] bg-gray-50" />
                <div className="px-6 space-y-4">
                    <div className="h-8 bg-gray-50 rounded-full w-3/4" />
                    <div className="h-6 bg-gray-50 rounded-full w-1/4" />
                    <div className="h-20 bg-gray-50 rounded-3xl w-full" />
                </div>
            </div>
        </div>
    );

    if (!product) return null;

    return (
        <div className="bg-white min-h-screen text-black font-sans selection:bg-black selection:text-white">

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
                    <Link href={`/catalog?category=${product.category}`} className="hover:text-black transition-colors">
                        {categoryData ? (categoryData[language === 'uz' ? 'name_uz' : 'name_ru'] || categoryData.name) : (product[language === 'uz' ? 'category_uz' : 'category_ru'] || product.category)}
                    </Link>
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
                                        <div className="relative w-full h-full">
                                            <Image 
                                                src={media.url} 
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform" 
                                                alt={`Thumbnail ${i}`}
                                                sizes="96px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-black flex items-center justify-center text-white"><Loader2 size={16} /></div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-[40px] overflow-hidden relative group/hero shadow-2xl shadow-black/5">
                            <Image 
                                src={allMedia[activeImage]?.url} 
                                fill
                                className="object-contain p-10 animate-in fade-in zoom-in-95 duration-500" 
                                alt={product.name} 
                                priority
                                sizes="(max-width: 1024px) 100vw, 60vw"
                            />
                            <button 
                                onClick={() => toggleWishlist({ ...product, imageUrl: product.image } as any)}
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
                                        {product.price.toLocaleString()} <span className="text-2xl not-italic">so'm</span>
                                    </div>
                                    {product.oldPrice && product.oldPrice > product.price && (
                                        <div className="space-y-1">
                                            <span className="text-gray-300 line-through font-bold text-2xl block">{product.oldPrice.toLocaleString()} so'm</span>
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-xl text-xs font-black tracking-tighter">
                                                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Variants / Group Products */}
                            {groupProducts.length > 1 && (
                                <div className="bg-gray-50/50 p-10 rounded-[40px] border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">
                                        {language === 'uz' ? 'Rangni tanlang' : 'Выберите цвет'}: <span className="text-black font-black italic ml-2">{product.colorName || (language === 'uz' ? "Tanlanmagan" : "Не выбран")}</span>
                                    </p>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                                        {groupProducts.map((v) => (
                                            <Link 
                                                replace 
                                                key={v.id} 
                                                href={`/products/${v.id}`} 
                                                className={`aspect-[3/4] rounded-3xl overflow-hidden border-2 transition-all flex-shrink-0 shadow-sm relative group/v ${v.id === product.id ? "border-black scale-105 shadow-xl z-10" : "border-white opacity-60 hover:opacity-100 hover:border-gray-200"}`}
                                            >
                                                <Image 
                                                    src={v.image} 
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover/v:scale-110" 
                                                    alt={v.colorName || "Variant"} 
                                                    sizes="100px"
                                                />
                                                {v.id === product.id && (
                                                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                                                        <div className="bg-white rounded-full p-1 shadow-lg">
                                                            <Check size={12} strokeWidth={4} />
                                                        </div>
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 gap-4 mt-12">
                                <div className="flex gap-4 items-stretch">
                                    <button 
                                        onClick={handleFastBuy}
                                        className="flex-1 bg-white border-2 border-black text-black py-5 rounded-[28px] font-black text-sm uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all shadow-xl shadow-black/5"
                                    >
                                        {language === 'uz' ? "TEZKOR XARID" : "КУПИТЬ СЕЙЧАС"}
                                    </button>

                                    {cartItem ? (
                                        <div className="flex-1 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                            <div className="flex-1 bg-gray-50 h-[60px] rounded-[28px] border border-gray-100 flex items-center justify-around">
                                                <button 
                                                    onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} 
                                                    className="p-3 text-gray-400 hover:text-black transition-colors"
                                                >
                                                    <Minus size={20} strokeWidth={3} />
                                                </button>
                                                <span className="text-xl font-black italic w-8 text-center">{cartItem.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} 
                                                    className="p-3 text-gray-400 hover:text-black transition-colors"
                                                >
                                                    <Plus size={20} strokeWidth={3} />
                                                </button>
                                            </div>
                                            <Link href="/cart" className="bg-black text-white p-5 rounded-[28px] hover:scale-110 active:scale-90 transition-all shadow-xl">
                                                <ShoppingBag size={20} strokeWidth={3} />
                                            </Link>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => addToCart({ ...product, imageUrl: product.image, stock: totalStock } as any)}
                                            className="flex-1 bg-black text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20"
                                        >
                                            <Plus size={20} strokeWidth={3} /> {language === 'uz' ? "SAVATGA" : "В КОРЗИНУ"}
                                        </button>
                                    )}
                                </div>
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

            {/* Mobile Fixed Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-4 pb-8 animate-in slide-in-from-bottom duration-500">
                <div className="flex gap-3 items-stretch h-14">
                    <button 
                        onClick={handleFastBuy}
                        className="flex-1 bg-white border-2 border-black text-black rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                    >
                        {language === 'uz' ? "TEZKOR XARID" : "КУПИТЬ СЕЙЧАС"}
                    </button>

                    {cartItem ? (
                        <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 h-full rounded-2xl border border-gray-100 flex items-center justify-around">
                                <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="p-2 text-gray-400 hover:text-black"><Minus size={16} /></button>
                                <span className="text-sm font-black italic">{cartItem.quantity}</span>
                                <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="p-2 text-gray-400 hover:text-black"><Plus size={16} /></button>
                            </div>
                            <Link href="/cart" className="bg-black text-white h-full aspect-square rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                                <ShoppingBag size={20} strokeWidth={3} />
                            </Link>
                        </div>
                    ) : (
                        <button 
                            onClick={() => addToCart({ ...product, imageUrl: product.image, stock: totalStock } as any)}
                            className="flex-1 bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-black/20"
                        >
                            <Plus size={18} strokeWidth={3} /> {language === 'uz' ? "SAVATGA" : "В КОРЗИНУ"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
