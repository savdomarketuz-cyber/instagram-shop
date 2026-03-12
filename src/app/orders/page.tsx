"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { db, collection, query, where, getDocs, orderBy, getDoc, doc, updateDoc, addDoc } from "@/lib/firebase";
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, Loader2, Star, Camera, Video, MessageCircle, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { translations } from "@/lib/translations";
import { uploadToYandexS3 } from "@/lib/yandex-s3";

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
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedOrder) {
            const enrich = async () => {
                const items = [...(selectedOrder.items || [])];
                setEnrichedItems(items);

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item.image && !item.imageUrl) {
                        const pDoc = await getDoc(doc(db, "products", item.id));
                        if (pDoc.exists()) {
                            items[i] = { ...item, image: pDoc.data().image };
                            setEnrichedItems([...items]);
                        }
                    }
                }
            };
            enrich();
        }
    }, [selectedOrder]);

    const fetchOrders = async () => {
        try {
            // Simplified query to avoid index requirement
            const q = query(
                collection(db, "orders"),
                where("userPhone", "==", user?.phone)
            );
            const querySnapshot = await getDocs(q);
            const fetchedOrders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];

            // Client-side sorting by date
            fetchedOrders.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
            });

            setOrders(fetchedOrders);
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
            const orderRef = doc(db, "orders", orderId);
            const statusLabel = language === 'uz' ? "Bekor qilingan" : "Отменен";
            await updateDoc(orderRef, {
                status: statusLabel
            });

            // Update local state
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: statusLabel } : o));
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: statusLabel });
            }
        } catch (error) {
            console.error("Cancel order error:", error);
            const errorMsg = language === 'uz'
                ? "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
                : "Произошла ошибка. Пожалуйста, попробуйте еще раз.";
            alert(errorMsg);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!user) return;
        if (!user.username) {
            showToast(language === 'uz' ? "Sharh qoldirish uchun profil sozlangan bo'lishi kerak (username kiritilmagan)" : "Для того чтобы оставить комментарий должен быть настроен профиль (не введено имя пользователя)", 'info');
            return;
        }
        if (!reviewProduct || !reviewText.trim()) return;
        if (isUploadingMedia) {
            showToast(language === 'uz' ? "Media yuklanmoqda, iltimos kuting..." : "Медиа загружается, пожалуйста подождите...", 'info');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const newComment = {
                productId: reviewProduct.id,
                userId: user?.phone,
                username: user?.username || user?.phone,
                text: reviewText,
                rating: reviewRating,
                type: 'review',
                parentId: null,
                timestamp: new Date().toISOString(),
                ...(reviewImages.length > 0 ? { images: reviewImages } : {}),
                ...(reviewVideo ? { video: reviewVideo } : {})
            };

            await addDoc(collection(db, "comments"), newComment);

            // Update product rating - wrap in its own try-catch as it might fail due to rules
            try {
                const productRef = doc(db, "products", reviewProduct.id);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const prod = productSnap.data();
                    const currentCount = prod.reviewCount || 0;
                    const currentRating = prod.rating || 0;
                    const newCount = currentCount + 1;
                    const newRating = ((currentRating * currentCount) + reviewRating) / newCount;

                    await updateDoc(productRef, {
                        rating: newRating,
                        reviewCount: newCount
                    });
                }
            } catch (ratingError) {
                console.warn("Rating update failed (likely permission rules):", ratingError);
            }

            setReviewProduct(null);
            setReviewText("");
            setReviewRating(5);
            setReviewImages([]);
            setReviewVideo("");
            showToast(language === 'uz' ? "Sharh muvaffaqiyatli saqlandi!" : "Отзыв успешно сохранен!");
        } catch (error: any) {
            console.error("Review error:", error);
            showToast((language === 'uz' ? "Xatolik: " : "Ошибка: ") + (error.message || ""), 'error');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (!mounted) return null;

    if (!user) {
        return (
            <div className="p-6 bg-white min-h-screen flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                    <Package size={40} />
                </div>
                <p className="text-gray-500 font-medium">
                    {language === 'uz' ? 'Buyurtmalarni ko\'rish uchun tizimga kiring' : 'Войдите в систему, чтобы просмотреть заказы'}
                </p>
                <Link href="/login" className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg">
                    {t.account.login}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white min-h-screen pt-12 pb-24">
            <h1 className="text-3xl font-black mb-10 tracking-tighter italic uppercase">{t.account.orders}</h1>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Truck size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-xs uppercase tracking-widest">
                        {language === 'uz' ? 'Sizda hali buyurtmalar yo\'q' : 'У вас пока нет заказов'}
                    </p>
                    <Link href="/" className="mt-4 text-black font-black border-b-2 border-black italic uppercase text-xs">
                        {language === 'uz' ? 'Xaridni boshlash' : 'Начать покупки'}
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-gray-50 rounded-[32px] p-6 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{language === 'uz' ? 'Buyurtma ID' : 'ID заказа'}</p>
                                    <div className="font-bold text-gray-900 text-sm">#{order.id}</div>
                                </div>
                                <div className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-tighter ${order.status === 'Yetkazildi' || order.status === 'Доставлено' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' :
                                    order.status === 'To\'landi' || order.status === 'Оплачено' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                                        order.status.includes('To\'lov') || order.status.includes('Оплат') ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                                            order.status === 'Bekor qilingan' || order.status === 'Отменен' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                                                'bg-black text-white shadow-lg shadow-black/10'
                                    }`}>
                                    {order.status}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-bold text-gray-500 mb-6">
                                <Clock size={14} />
                                <span>
                                    {order.createdAt?.toDate?.().toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'ru-RU') || (language === 'uz' ? "Hozirgina" : "Только что")} • {order.items?.length || 0} {t.cart.items}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-5 border-t border-gray-200/50">
                                <div className="text-xl font-black italic tracking-tighter">{order.total?.toLocaleString()} so'm</div>
                                <button className="flex items-center text-[10px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">
                                    {language === 'uz' ? 'Batafsil' : 'Подробнее'} <ChevronRight size={14} className="ml-1" />
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
                                    {language === 'uz' ? 'Buyurtma Tafsiloti' : 'Детали заказа'}
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
                                                href={`/products/${item.id}`}
                                                className="flex-1 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                                            >
                                                {language === 'uz' ? 'Marketda' : 'В маркет'}
                                            </Link>
                                            {(selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Доставлено') && (
                                                <button
                                                    onClick={() => setReviewProduct(item)}
                                                    className="flex-1 py-3 bg-black text-white border border-black rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-black/10"
                                                >
                                                    <Star size={12} fill="currentColor" />
                                                    {language === 'uz' ? 'Sharh' : 'Отзыв'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Info Section */}
                            <div className="space-y-4 pt-10 border-t border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                                        <CheckCircle size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === 'uz' ? 'Holati' : 'Статус'}</p>
                                        <p className="font-black text-xs italic uppercase tracking-tighter">{selectedOrder.status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                                        <Truck size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.common.delivery} {language === 'uz' ? 'manzili' : 'адрес'}</p>
                                        <p className="font-black text-xs italic uppercase tracking-tighter line-clamp-2">{(selectedOrder as any).address || (language === 'uz' ? "Manzil ko'rsatilmagan" : "Адрес не указан")}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cancel Order Button */}
                            {['Kutulmoqda', 'To\'lov kutilmoqda', 'To\'lov tekshirilmoqda', 'Ожидание', 'Ожидание оплаты'].some(s => selectedOrder.status.includes(s)) && (
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
                                            {language === 'uz' ? 'Buyurtmani bekor qilish' : 'Отменить заказ'}
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Total */}
                            <div className="mt-10 p-8 bg-black text-white rounded-[32px] flex justify-between items-center shadow-2xl shadow-black/20">
                                <div className="text-xs font-black uppercase tracking-widest opacity-60">{t.common.total}</div>
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
                                {language === 'uz' ? 'Sharh qoldirish' : 'Оставить отзыв'}
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
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">{language === 'uz' ? 'Baholang' : 'Оцените'}</p>
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
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{language === 'uz' ? 'Fikringiz' : 'Ваш отзыв'}</label>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder={language === 'uz' ? "Mahsulot haqida nima deysiz?" : "Что вы думаете о товаре?"}
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
                                                        const url = await uploadToYandexS3(file);
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
                                            {isUploadingMedia ? (language === 'uz' ? "..." : "...") : (language === 'uz' ? 'Rasm' : 'Фото')}
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
                                                        const url = await uploadToYandexS3(file);
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
                                            {isUploadingMedia ? (language === 'uz' ? "..." : "...") : (language === 'uz' ? 'Video' : 'Видео')}
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
                                className="w-full py-5 bg-black text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmittingReview ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        {language === 'uz' ? 'Yuborish' : 'Отправить'}
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
                                {language === 'uz' ? 'Buyurtmani bekor qilish' : 'Отмена заказа'}
                            </h3>
                            <p className="text-sm font-bold text-gray-400">
                                {language === 'uz' 
                                    ? "Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi." 
                                    : "Вы действительно хотите отменить этот заказ? Это действие нельзя отменить."}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmCancelOrder}
                                className="w-full py-5 bg-red-500 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                {language === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}
                            </button>
                            <button
                                onClick={() => setOrderToCancel(null)}
                                className="w-full py-5 bg-gray-50 text-gray-400 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
                            >
                                {language === 'uz' ? 'Orqaga' : 'Назад'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
