"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { getProductSlug } from "@/lib/slugify";
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, Loader2, Star, Camera, Video, MessageCircle, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { translations } from "@/lib/translations";
import { uploadToYandexS3 } from "@/lib/yandex-s3";
import { mapOrder, mapProduct } from "@/lib/mappers";
import { normalizeOrderStatus, getStatusLabel } from "@/lib/order-status";

interface Order {
    id: string;
    total: number;
    status: string;
    createdAt: any;
    items: any[];
}

export default function OrdersPage() {
    const { language, user, showToast } = useStore();
    const t = translations[language];
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [enrichedItems, setEnrichedItems] = useState<any[]>([]);
    const [isCancelling, setIsCancelling] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

    // Qaytarish (vozvrat) holatlari
    const [returnOrder, setReturnOrder] = useState<Order | null>(null);
    const [returnReason, setReturnReason] = useState("");
    const [isReturning, setIsReturning] = useState(false);
    // order_id -> eng so'nggi qaytarish so'rovi holati (badge va qayta yuborishni cheklash uchun)
    const [returnsMap, setReturnsMap] = useState<Record<string, string>>({});

    // Review states
    const [reviewProduct, setReviewProduct] = useState<any>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [reviewVideo, setReviewVideo] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (user) {
            fetchOrders();
            fetchReturns();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Foydalanuvchining qaytarish so'rovlari -> order_id bo'yicha eng so'nggi holat
    const fetchReturns = async () => {
        try {
            const res = await fetch(`/api/orders/return?phone=${encodeURIComponent(user?.phone || '')}`, {
                credentials: "include",
                cache: "no-store",
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success && Array.isArray(data.returns)) {
                // returns created_at bo'yicha kamayuvchi tartibda keladi — birinchisi eng so'nggi
                const map: Record<string, string> = {};
                for (const r of data.returns) {
                    if (!map[r.order_id]) map[r.order_id] = r.status; // eng so'nggisi
                }
                setReturnsMap(map);
            }
        } catch (error) {
            console.error("Fetch returns error:", error);
        }
    };

    useEffect(() => {
        if (selectedOrder) {
            const enrich = async () => {
                const items = [...(selectedOrder.items || [])];
                setEnrichedItems(items);

                const missingProductIds = items
                    .filter(item => !item.image && !item.imageUrl && !item.image_url)
                    .map(item => item.id);

                if (missingProductIds.length > 0) {
                    const { data: productsData } = await supabase
                        .from("products")
                        .select("id, image_url")
                        .in("id", missingProductIds);

                    if (productsData) {
                        const updatedItems = items.map(item => {
                            const product = productsData.find(p => p.id === item.id);
                            return product ? { ...item, image: product.image_url } : item;
                        });
                        setEnrichedItems(updatedItems);
                    }
                }
            };
            enrich();
        }
    }, [selectedOrder]);

    const fetchOrders = async () => {
        try {
            const response = await fetch(`/api/orders/user?phone=${encodeURIComponent(user?.phone || '')}`, {
                credentials: "include",
                cache: "no-store",
            });
            const data = await response.json().catch(() => ({}));

            if (response.ok && data.success && Array.isArray(data.orders)) {
                setOrders(data.orders.map(mapOrder));
            } else if (response.status === 401) {
                // Sessiya muddati tugagan — buyurtmalar ko'rinmasligining asosiy sababi shu bo'lishi mumkin
                showToast(language === 'uz' ? "Sessiya muddati tugadi. Iltimos, qayta kiring." : "Сессия истекла. Войдите снова.", 'info');
            } else if (response.status === 429) {
                showToast(language === 'uz' ? "Juda ko'p urinish. Biroz kuting." : "Слишком много запросов. Подождите.", 'error');
            }
        } catch (error) {
            console.error("Fetch orders error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        setOrderToCancel(orderId);
    };

    const confirmCancelOrder = async () => {
        if (!orderToCancel) return;
        const orderId = orderToCancel;
        setOrderToCancel(null);

        setIsCancelling(true);
        try {
            const statusLabel = t.common.statusCancelled;

            // API parametrlari: orderId / status / userPhone (oldin order_id/new_status/user_phone
            // yuborilgani sababli bekor qilish umuman ishlamasdi)
            const response = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    status: statusLabel,
                    userPhone: user?.phone
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || t.common.error);

            // Update local state + serverdan qayta o'qish (manba haqiqiy holat)
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: statusLabel } : o));
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: statusLabel });
            }
            fetchOrders();
        } catch (error) {
            console.error("Cancel order error:", error);
            const errorMsg = t.common.error + ". " + (language === 'uz' ? "Iltimos, qaytadan urinib ko'ring." : "Пожалуйста, попробуйте еще раз.");
            alert(errorMsg);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleSubmitReturn = async () => {
        if (!returnOrder || !user?.phone || !returnReason.trim()) return;
        setIsReturning(true);
        try {
            const response = await fetch('/api/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    order_id: returnOrder.id,
                    user_phone: user.phone,
                    items: returnOrder.items,
                    reason: returnReason.trim(),
                }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || t.common.error);

            showToast(language === 'uz' ? "Qaytarish so'rovi yuborildi" : "Запрос на возврат отправлен", 'success');
            setReturnOrder(null);
            setReturnReason("");
            // Holatni yangilash — endi buyurtmada "so'rov yuborilgan" ko'rinadi
            setReturnsMap(prev => ({ ...prev, [returnOrder.id]: 'pending' }));
            fetchReturns();
        } catch (error: any) {
            console.error("Return order error:", error);
            showToast(t.common.error + ": " + (error.message || ""), 'error');
        } finally {
            setIsReturning(false);
        }
    };

    // Qaytarish holati uchun yorliq va rang (badge)
    const returnStatusInfo = (status: string): { label: string; cls: string } => {
        switch (status) {
            case 'pending':
                return { label: language === 'uz' ? "Qaytarish so'ralgan" : "Возврат запрошен", cls: "bg-orange-100 text-orange-600" };
            case 'approved':
                return { label: language === 'uz' ? "Qaytarish tasdiqlandi" : "Возврат подтверждён", cls: "bg-blue-100 text-blue-600" };
            case 'processing':
                return { label: language === 'uz' ? "Qayta ishlanmoqda" : "В обработке", cls: "bg-indigo-100 text-indigo-600" };
            case 'completed':
                return { label: language === 'uz' ? "Qaytarish yakunlandi" : "Возврат завершён", cls: "bg-green-100 text-green-600" };
            case 'rejected':
                return { label: language === 'uz' ? "Qaytarish rad etildi" : "Возврат отклонён", cls: "bg-red-100 text-red-600" };
            default:
                return { label: status, cls: "bg-gray-100 text-gray-600" };
        }
    };

    const handleSubmitReview = async () => {
        if (!user) return;
        if (!user.username) {
            showToast(t.common.usernameRequired, 'info');
            return;
        }
        if (!reviewProduct || !reviewText.trim()) return;
        if (isUploadingMedia) {
            showToast(t.common.mediaUploading, 'info');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'insert',
                    p_user_phone: user?.phone || user?.id,
                    p_comment_data: {
                        product_id: reviewProduct.id,
                        username: user?.username || user?.phone,
                        text: reviewText,
                        rating: reviewRating,
                        type: 'review',
                        data: {
                            images: reviewImages,
                            video: reviewVideo
                        }
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Xatolik yuz berdi");

            // Update product rating
            // Rating update is now handled by the server-side DB trigger for security.

            setReviewProduct(null);
            setReviewText("");
            setReviewRating(5);
            setReviewImages([]);
            setReviewVideo("");
            showToast(t.common.reviewSaved);
        } catch (error: any) {
            console.error("Review error:", error);
            showToast(t.common.error + ": " + (error.message || ""), 'error');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return t.common.justNow;
        const d = new Date(date);
        const now = new Date();
        const diffInMs = now.getTime() - d.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMins < 1) {
            return t.common.justNow;
        }
        if (diffInMins < 60) {
            return language === 'uz' ? `${diffInMins} daqiqa avval` : `${diffInMins} мин. назад`;
        }
        if (diffInHours < 24) {
            return language === 'uz' ? `${diffInHours} soat avval` : `${diffInHours} час. назад`;
        }
        if (diffInDays <= 3) {
            return language === 'uz' ? `${diffInDays} kun avval` : `${diffInDays} дн. назад`;
        }

        return d.toLocaleString(language === 'uz' ? 'uz-UZ' : 'ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!mounted) return null;

    if (!user) {
        return (
            <div className="p-6 min-h-screen flex flex-col items-center justify-center gap-4 text-center" style={{ background: "#FAFAF6" }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ background: "#EAF3EC", color: "#2D6E3E" }}>
                    <Package size={40} />
                </div>
                <p className="text-gray-500 font-medium">
                    {t.common.loginToSeeOrders}
                </p>
                <Link href="/login" className="px-8 py-3 rounded-full font-bold shadow-lg text-white" style={{ background: "#2D6E3E" }}>
                    {t.account.login}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen pt-12 pb-24" style={{ background: "#FAFAF6" }}>
            <h1 className="text-3xl font-black mb-10 tracking-tighter italic uppercase">{t.account.orders}</h1>

            {loading ? (
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded-full w-24 mb-4"></div>
                            <div className="h-6 bg-gray-200 rounded-full w-48 mb-6"></div>
                            <div className="h-4 bg-gray-200 rounded-full w-32 mb-6"></div>
                            <div className="flex justify-between items-center pt-5 border-t border-gray-200/50">
                                <div className="h-8 bg-gray-200 rounded-full w-32"></div>
                                <div className="h-4 bg-gray-200 rounded-full w-20"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Truck size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-xs uppercase tracking-widest">
                        {t.common.noOrders}
                    </p>
                    <Link href="/" className="mt-4 text-black font-black border-b-2 border-black italic uppercase text-xs">
                        {t.cart.startShopping}
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-[22px] p-5 active:scale-[0.98] transition-all cursor-pointer"
                            style={{ background: "#fff", boxShadow: "0 2px 12px rgba(15,20,16,0.06)", border: "1px solid rgba(15,20,16,0.05)" }}
                        >
                            <div className="mb-6">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.common.orderId}</p>
                                <div className="font-bold text-gray-900 text-sm break-all">#{order.id}</div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500 mb-6">
                                <Clock size={14} />
                                <span>
                                    {formatDate(order.createdAt)} • {order.items?.length || 0} {t.cart.items}
                                </span>
                            </div>

                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <div className={`inline-block text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter ${normalizeOrderStatus(order.status) === 'delivered' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' :
                                    normalizeOrderStatus(order.status) === 'paid' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                                        normalizeOrderStatus(order.status) === 'awaiting_payment' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                                            normalizeOrderStatus(order.status) === 'cancelled' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                                                'velari-green-btn'
                                    }`}>
                                    {getStatusLabel(order.status, language)}
                                </div>
                                {returnsMap[order.id] && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter ${returnStatusInfo(returnsMap[order.id]).cls}`}>
                                        <RefreshCw size={10} /> {returnStatusInfo(returnsMap[order.id]).label}
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-5 border-t border-gray-200/50">
                                <div className="text-xl font-black italic tracking-tighter">{order.total?.toLocaleString()} so'm</div>
                                <button className="flex items-center text-[10px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">
                                    {t.common.details} <ChevronRight size={14} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end justify-center animate-in fade-in duration-300 p-4">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden pb-10">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">
                                    {t.common.orderDetail}
                                </h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: #{selectedOrder.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 active:scale-90 transition-all"
                            >
                                <ChevronRight size={24} className="rotate-90" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto max-h-[60vh] no-scrollbar">
                            {/* Items List */}
                            <div className="space-y-4 mb-10">
                                {enrichedItems.map((item: any, i: number) => (
                                    <div key={i} className="bg-gray-50/50 p-5 rounded-[32px] border border-gray-50 space-y-4 group/item">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-20 bg-white rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-200 relative">
                                                {(item.image || item.imageUrl || item.image_url) && (String(item.image || item.imageUrl || item.image_url).startsWith('http') || String(item.image || item.imageUrl || item.image_url).startsWith('/')) ? (
                                                    <Image
                                                        src={item.image || item.imageUrl || item.image_url}
                                                        alt={item[`name_${language}`] || item.name}
                                                        width={160}
                                                        height={214}
                                                        quality={60}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-[13px] uppercase italic tracking-tighter leading-tight mb-1">
                                                    {item[`name_${language}`] || item.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400">
                                                    {item.quantity} {language === 'uz' ? 'dona' : 'шт'} x {item.price.toLocaleString()} so'm
                                                </p>
                                                <div className="font-black italic text-black mt-1">
                                                    {(item.price * item.quantity).toLocaleString()} so'm
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full">
                                            <Link
                                                href={`/products/${getProductSlug(item, language)}`}
                                                className="flex-1 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                                            >
                                                {t.common.inMarket}
                                            </Link>
                                            {(normalizeOrderStatus(selectedOrder.status) === 'delivered') && (
                                                <button
                                                    onClick={() => setReviewProduct(item)}
                                                    className="flex-1 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                                                    style={{ background: "#2D6E3E" }}
                                                >
                                                    <Star size={12} fill="currentColor" />
                                                    {t.common.review}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Info Section */}
                            <div className="space-y-4 pt-10 border-t border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EAF3EC", color: "#2D6E3E" }}>
                                        <CheckCircle size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.common.status}</p>
                                        <p className="font-black text-xs italic uppercase tracking-tighter">{getStatusLabel(selectedOrder.status, language)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EAF3EC", color: "#2D6E3E" }}>
                                        <Truck size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.common.delivery} {language === 'uz' ? 'manzili' : 'адрес'}</p>
                                        <p className="font-black text-xs italic uppercase tracking-tighter line-clamp-2">{(selectedOrder as any).address || t.common.addressNotSet}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cancel Order Button — faqat jo'natilmagan/yetkazilmagan buyurtmalar */}
                            {['awaiting_payment', 'accepted', 'pending'].includes(normalizeOrderStatus(selectedOrder.status)) && (
                                <button
                                    onClick={() => handleCancelOrder(selectedOrder.id)}
                                    disabled={isCancelling}
                                    className="w-full mt-10 py-4 bg-red-50 text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 border border-red-100"
                                >
                                    {isCancelling ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <>
                                            <XCircle size={16} />
                                            {t.common.cancelOrder}
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Qaytarish (vozvrat) — faqat yetkazilgan buyurtmalar */}
                            {normalizeOrderStatus(selectedOrder.status) === 'delivered' && (() => {
                                const rStatus = returnsMap[selectedOrder.id];
                                // Aktiv so'rov bor (rad etilmagan) -> holat ko'rsatamiz, qayta yuborishga ruxsat yo'q
                                if (rStatus && rStatus !== 'rejected') {
                                    const info = returnStatusInfo(rStatus);
                                    return (
                                        <div className={`w-full mt-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 ${info.cls}`}>
                                            <RefreshCw size={16} /> {info.label}
                                        </div>
                                    );
                                }
                                // So'rov yo'q yoki rad etilgan -> qaytarishni so'rash mumkin
                                return (
                                    <button
                                        onClick={() => { setReturnOrder(selectedOrder); setReturnReason(""); }}
                                        className="w-full mt-10 py-4 bg-orange-50 text-orange-600 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-orange-500 hover:text-white transition-all active:scale-95 border border-orange-100"
                                    >
                                        <RefreshCw size={16} />
                                        {rStatus === 'rejected'
                                            ? (language === 'uz' ? "Qayta so'rov yuborish" : "Запросить снова")
                                            : (language === 'uz' ? "Mahsulotni qaytarish" : "Вернуть товар")}
                                    </button>
                                );
                            })()}

                            {/* Total */}
                            <div className="mt-10 p-8 rounded-[32px] flex justify-between items-center" style={{ background: "#2D6E3E", color: "#fff" }}>
                                <div className="text-xs font-black uppercase tracking-widest opacity-70">{t.common.total}</div>
                                <div className="text-3xl font-black italic tracking-tighter">{selectedOrder.total?.toLocaleString()} so'm</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Review Modal */}
            {reviewProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in duration-500 flex flex-col max-h-[90vh]">
                        <div className="p-10 pb-6 flex justify-between items-center">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">
                                {t.common.leaveReviewTitle}
                            </h3>
                            <button onClick={() => setReviewProduct(null)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="px-10 overflow-y-auto no-scrollbar pb-10 space-y-8">
                            {/* Product Info */}
                            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-50">
                                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-gray-100 flex-shrink-0">
                                    <img src={reviewProduct.image || reviewProduct.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <p className="font-extrabold text-[11px] uppercase tracking-tighter line-clamp-2 leading-tight">
                                    {reviewProduct[`name_${language}`] || reviewProduct.name}
                                </p>
                            </div>

                            {/* Stars */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">{t.product.rating}</p>
                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className={`p-2 transition-all duration-300 ${reviewRating >= star ? 'scale-125' : 'opacity-30 grayscale'}`}
                                        >
                                            <Star size={32} fill={reviewRating >= star ? "#fbbf24" : "none"} className={reviewRating >= star ? "text-yellow-400" : "text-gray-300"} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.common.yourOpinion}</label>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder={t.common.productOpinionPlaceholder}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-[32px] p-6 text-sm font-bold h-32 outline-none transition-all resize-none shadow-inner"
                                />
                            </div>

                            {/* Media Upload Simulation */}
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <label className={`flex-1 bg-gray-50 border border-gray-100 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-dashed hover:bg-gray-100 ${isUploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploadingMedia(true);
                                                    try {
                                                        const { url } = await uploadToYandexS3(file);
                                                        setReviewImages(prev => [...prev, url]);
                                                    } catch (err) {
                                                        showToast(language === 'uz' ? "Rasm yuklashda xatolik" : "Ошибка при загрузке изображения", 'error');
                                                    } finally {
                                                        setIsUploadingMedia(false);
                                                    }
                                                }
                                            }}
                                        />
                                        {isUploadingMedia ? <Loader2 size={18} className="text-black animate-spin" /> : <Camera size={18} className="text-gray-400" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            {isUploadingMedia ? "..." : t.common.photo}
                                        </span>
                                    </label>

                                    <label className={`flex-1 bg-gray-50 border border-gray-100 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-dashed hover:bg-gray-100 ${isUploadingMedia || reviewVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploadingMedia(true);
                                                    try {
                                                        const { url } = await uploadToYandexS3(file);
                                                        setReviewVideo(url);
                                                    } catch (err) {
                                                        showToast(language === 'uz' ? "Video yuklashda xatolik" : "Ошибка при загрузке video", 'error');
                                                    } finally {
                                                        setIsUploadingMedia(false);
                                                    }
                                                }
                                            }}
                                        />
                                        {isUploadingMedia ? <Loader2 size={18} className="text-black animate-spin" /> : <Video size={18} className="text-gray-400" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            {isUploadingMedia ? "..." : t.common.video}
                                        </span>
                                    </label>

                                </div>

                                {/* Media Preview */}
                                {(reviewImages.length > 0 || reviewVideo) && (
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {reviewImages.map((img, i) => (
                                            <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 relative shrink-0">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button onClick={() => setReviewImages(reviewImages.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5">
                                                    <XCircle size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {reviewVideo && (
                                            <div className="w-16 h-16 rounded-xl bg-black overflow-hidden relative shrink-0">
                                                <video src={reviewVideo} className="w-full h-full object-cover opacity-50" />
                                                <Play size={10} className="absolute inset-0 m-auto text-white" />
                                                <button onClick={() => setReviewVideo("")} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5">
                                                    <XCircle size={10} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview || !reviewText.trim()}
                                className="w-full py-5 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)", color: "#fff", boxShadow: "0 8px 20px rgba(45,110,62,0.28)" }}
                            >
                                {isSubmittingReview ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        {t.common.send}
                                        <MessageCircle size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation Confirmation Modal */}
            {orderToCancel && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[48px] p-10 text-center space-y-8 animate-in zoom-in duration-500 shadow-2xl">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
                            <XCircle size={40} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-tight">
                                {t.common.cancelConfirmTitle}
                            </h3>
                            <p className="text-sm font-bold text-gray-400">
                                {t.common.cancelConfirmText}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmCancelOrder}
                                className="w-full py-5 bg-red-500 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                {t.common.confirm}
                            </button>
                            <button
                                onClick={() => setOrderToCancel(null)}
                                className="w-full py-5 bg-gray-50 text-gray-400 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
                            >
                                {t.common.back}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Qaytarish (Return) Modal */}
            {returnOrder && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-[48px] p-10 space-y-8 animate-in zoom-in duration-500 shadow-2xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/10">
                                <RefreshCw size={36} />
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-tight">
                                {language === 'uz' ? "Mahsulotni qaytarish" : "Возврат товара"}
                            </h3>
                            <p className="text-sm font-bold text-gray-400">
                                {language === 'uz'
                                    ? "Qaytarish sababini yozing. So'rovingiz ko'rib chiqiladi."
                                    : "Укажите причину возврата. Ваш запрос будет рассмотрен."}
                            </p>
                        </div>

                        <textarea
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder={language === 'uz' ? "Qaytarish sababi..." : "Причина возврата..."}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-[28px] p-6 text-sm font-bold h-28 outline-none transition-all resize-none shadow-inner"
                        />

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSubmitReturn}
                                disabled={isReturning || !returnReason.trim()}
                                className="w-full py-5 bg-orange-500 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                            >
                                {isReturning ? <Loader2 className="animate-spin" size={16} /> : (language === 'uz' ? "So'rov yuborish" : "Отправить запрос")}
                            </button>
                            <button
                                onClick={() => { setReturnOrder(null); setReturnReason(""); }}
                                className="w-full py-5 bg-gray-50 text-gray-400 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
                            >
                                {t.common.back}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
