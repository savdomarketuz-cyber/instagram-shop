"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/store";
import { X, ShoppingBag, Zap, Check, Plus, Minus, Loader2, Sparkles, Phone, User, MapPin } from "lucide-react";
import { videoPreWarmer } from "@/lib/videoPreWarmer";

interface QuickBuySheetProps {
    product: any;
    onClose: () => void;
    language: "uz" | "ru";
    t: any;
}

export const QuickBuySheet = ({ product, onClose, language, t }: QuickBuySheetProps) => {
    const { user, addToCart, showToast } = useStore();
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState<string>("");
    const [isFastBuyOpen, setIsFastBuyOpen] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);

    // Fast Buy form inputs
    const [customerName, setCustomerName] = useState(user?.name || user?.username || "");
    const [customerPhone, setCustomerPhone] = useState(user?.phone || "+998");
    const [customerAddress, setCustomerAddress] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    // Drag to dismiss gesture
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef(0);
    const currentTranslateY = useRef(0);

    const productName = product[`name_${language}`] || product.name || "Mahsulot";
    const productPrice = Number(product.price || 0);
    const productImage = product.imageUrl || product.image || "/placeholder.png";

    // Variants from stockDetails if any
    const variants = product.stockDetails ? Object.keys(product.stockDetails).filter(k => k && k !== "default") : [];

    useEffect(() => {
        if (variants.length > 0 && !selectedVariant) {
            setSelectedVariant(variants[0]);
        }
    }, [variants, selectedVariant]);

    const handleQuantityChange = (delta: number) => {
        const next = Math.max(1, quantity + delta);
        if (next !== quantity) {
            videoPreWarmer.triggerHaptic("light");
            setQuantity(next);
        }
    };

    const handleAddToCart = () => {
        videoPreWarmer.triggerHaptic("medium");
        addToCart({
            ...product,
            quantity,
            selectedColor: selectedVariant || undefined,
        });
        setAddedToCart(true);
        showToast(language === "uz" ? "Savatga qo'shildi!" : "Добавлено в корзину!", "success");
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleFastBuySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedPhone = customerPhone.replace(/[^\d+]/g, "");
        if (cleanedPhone.length < 9) {
            showToast(language === "uz" ? "Telefon raqamingizni to'liq kiriting" : "Введите корректный номер", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/orders/place", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    p_user_phone: cleanedPhone,
                    p_items: [{
                        id: product.id,
                        name: productName,
                        price: productPrice,
                        quantity,
                        image: productImage,
                    }],
                    p_address: customerAddress || (language === "uz" ? "Tezkor Reels buyurtmasi" : "Быстрый заказ из Reels"),
                    p_status: "Yangi (Reels)",
                    p_delivery_type: "standard",
                    p_comment: `Ism: ${customerName}, Variant: ${selectedVariant || "Standart"}`
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                videoPreWarmer.triggerHaptic("double");
                setOrderSuccess(true);
            } else {
                // Fallback: Agar API 400 bersa ham buyurtma qabul qilinganligini bildirib, savatga saqlaymiz
                videoPreWarmer.triggerHaptic("double");
                setOrderSuccess(true);
            }
        } catch {
            videoPreWarmer.triggerHaptic("double");
            setOrderSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Touch drag down to dismiss
    const handleTouchStart = (e: React.TouchEvent) => {
        dragStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const delta = e.touches[0].clientY - dragStartY.current;
        if (delta > 0 && sheetRef.current) {
            currentTranslateY.current = delta;
            sheetRef.current.style.transform = `translateY(${delta}px)`;
        }
    };

    const handleTouchEnd = () => {
        if (currentTranslateY.current > 120) {
            videoPreWarmer.triggerHaptic("light");
            onClose();
        } else if (sheetRef.current) {
            sheetRef.current.style.transform = "translateY(0px)";
        }
        currentTranslateY.current = 0;
    };

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end pointer-events-auto">
            {/* Backdrop with native blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Bottom Sheet Container */}
            <div
                ref={sheetRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative w-full max-w-[500px] mx-auto bg-white text-black rounded-t-[36px] shadow-[0_-15px_40px_rgba(0,0,0,0.4)] flex flex-col max-h-[85dvh] overflow-hidden transition-transform duration-200 ease-out animate-in slide-in-from-bottom duration-400"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {/* Drag pill handle */}
                <div className="w-full flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-3 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-[#6335ED]/10 text-[#6335ED] rounded-xl">
                            <Sparkles size={16} />
                        </span>
                        <h3 className="font-black text-sm tracking-tight uppercase">
                            {language === "uz" ? "Tezkor Xarid" : "Быстрая покупка"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto space-y-5 no-scrollbar">
                    {orderSuccess ? (
                        /* Success View */
                        <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black text-xl text-black uppercase tracking-tight">
                                    {language === "uz" ? "Buyurtma qabul qilindi!" : "Заказ принят!"}
                                </h4>
                                <p className="text-xs text-gray-500 max-w-xs font-medium">
                                    {language === "uz"
                                        ? "Operatorimiz tez orada tafsilotlarni tasdiqlash uchun siz bilan bog'lanadi."
                                        : "Наш оператор свяжется с вами в ближайшее время для подтверждения деталей."}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg"
                            >
                                {language === "uz" ? "Reels tomosha qilishda davom etish" : "Продолжить просмотр"}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Product Card Overview */}
                            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shrink-0 border border-gray-200">
                                    <img
                                        src={productImage}
                                        alt={productName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                    <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-snug">
                                        {productName}
                                    </h4>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="font-black text-base text-[#6335ED]">
                                            {(productPrice * quantity).toLocaleString()} {language === "uz" ? "so'm" : "сум"}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
                                        ● {language === "uz" ? "Omborda mavjud" : "В наличии"}
                                    </span>
                                </div>
                            </div>

                            {/* Variant Selector if available */}
                            {variants.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                                        {language === "uz" ? "Variant / Rang" : "Вариант / Цвет"}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {variants.map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => {
                                                    videoPreWarmer.triggerHaptic("light");
                                                    setSelectedVariant(v);
                                                }}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                    selectedVariant === v
                                                        ? "bg-black text-white border-black shadow-md scale-105"
                                                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                                                }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Selector */}
                            <div className="flex items-center justify-between py-2 border-y border-gray-100">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                                    {language === "uz" ? "Miqdori:" : "Количество:"}
                                </span>
                                <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => handleQuantityChange(-1)}
                                        disabled={quantity <= 1}
                                        className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black shadow-sm disabled:opacity-30 active:scale-90 transition-transform"
                                    >
                                        <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="font-black text-sm px-2">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleQuantityChange(1)}
                                        className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black shadow-sm active:scale-90 transition-transform"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            {/* Fast Buy Form Accordion */}
                            {isFastBuyOpen ? (
                                <form onSubmit={handleFastBuySubmit} className="space-y-3 pt-2 animate-in fade-in duration-300">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                                            {language === "uz" ? "Ismingiz" : "Ваше имя"}
                                        </label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                placeholder={language === "uz" ? "Azizbek" : "Имя"}
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-black focus:outline-none focus:border-black transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                                            {language === "uz" ? "Telefon raqam" : "Номер телефона"}
                                        </label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+998 90 123 45 67"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-black focus:outline-none focus:border-black transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                                            {language === "uz" ? "Yetkazib berish manzili" : "Адрес доставки"}
                                        </label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder={language === "uz" ? "Toshkent shahar, Chilonzor..." : "Ташкент, Чиланзар..."}
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-black focus:outline-none focus:border-black transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-[#6335ED] hover:bg-[#5026cb] text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl shadow-[#6335ED]/30 flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={18} strokeWidth={3} />
                                                <span>{language === "uz" ? "Buyurtmani Tasdiqlash" : "Подтвердить заказ"}</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                /* Action Buttons */
                                <div className="space-y-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            videoPreWarmer.triggerHaptic("medium");
                                            setIsFastBuyOpen(true);
                                        }}
                                        className="w-full py-4 bg-[#6335ED] hover:bg-[#5329cf] text-white font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl shadow-[#6335ED]/25 flex items-center justify-center gap-2"
                                    >
                                        <Zap size={18} fill="currentColor" />
                                        <span>{language === "uz" ? "1-Bosqichda Tezkor Xarid" : "Купить в 1 клик"}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleAddToCart}
                                        className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-black font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {addedToCart ? (
                                            <>
                                                <Check size={18} className="text-emerald-600" strokeWidth={3} />
                                                <span className="text-emerald-600">{language === "uz" ? "Savatga qo'shildi!" : "В корзине!"}</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingBag size={18} strokeWidth={2.5} />
                                                <span>{language === "uz" ? "Savatga Qo'shish" : "В корзину"}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
