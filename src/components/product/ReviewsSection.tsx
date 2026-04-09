"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, MessageSquare, Send, Reply, Pencil, Trash2, Smile, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { AppleEmoji } from "./AppleEmoji";
import { supabase } from "@/lib/supabase";

import { Product, User, Language, Comment } from "@/types";
import { TranslationType } from "@/lib/translations";
import { useRouter } from "next/navigation";

interface ReviewsSectionProps {
    productId: string;
    product: Product | null;
    user: User | null;
    language: Language;
    t: TranslationType;
    comments: any[]; // Some fields in comments are still dynamic from DB
    fetchComments: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    router: ReturnType<typeof useRouter>;
}

export const ReviewsSection = ({
    productId, product, user, language, t, comments, fetchComments, showToast, router
}: ReviewsSectionProps) => {
    const [activeCommentTab, setActiveCommentTab] = useState<'review' | 'question'>('review');
    const [commentText, setCommentText] = useState("");
    const [commentRating, setCommentRating] = useState(5);
    const [replyTo, setReplyTo] = useState<any | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(2);
    const [expandedCommentIds, setExpandedCommentIds] = useState<string[]>([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

    const EMOJIS = ["😂", "👍", "👎", "❤️", "🔥", "💯", "⚡", "🍌", "🏆", "💔"];

    const submitComment = async () => {
        if (!user) { router.push("/login"); return; }
        if (!user.username) {
            alert(language === 'uz' ? "Sharh qoldirish uchun profil sozlangan bo'lishi kerak (username kiritilmagan)" : "Для того чтобы оставить комментарий должен быть настроен профиль (не введено имя пользователя)");
            router.push("/account");
            return;
        }
        if (!commentText.trim()) return;

        setIsPosting(true);
        try {
            if (!replyTo && activeCommentTab === 'review' && !user.isAdmin) {
                const hasReview = comments.some(c => c.userId === (user.id || user.phone) && !c.parentId && c.type === 'review');
                if (hasReview) {
                    showToast(language === 'uz' ? "Siz ushbu mahsulotga allaqachon sharh qoldirgansiz" : "Вы уже оставили отзыв об этом товаре", 'error');
                    setIsPosting(false);
                    return;
                }

                // Supabase query for orders
                const { data: orders } = await supabase
                    .from("orders")
                    .select("items")
                    .eq("user_phone", user.phone || "");
                
                let hasPurchased = false;
                orders?.forEach(order => {
                    if (order.items?.some((item: any) => item.id === productId)) hasPurchased = true;
                });

                if (!hasPurchased) {
                    showToast(language === 'uz' ? "Sharh qoldirish uchun mahsulotni sotib olgan bo'lishingiz kerak" : "Для того чтобы оставить отзыв вы должны купить этот товар", 'info');
                    setIsPosting(false);
                    return;
                }
            }

            const newComment = {
                product_id: productId,
                user_id: user.id || user.phone,
                username: user.username,
                text: commentText,
                type: replyTo ? replyTo.type : activeCommentTab,
                parent_id: replyTo?.id || null,
                is_admin: !!(user.isAdmin || user.phone === "ADMIN"),
                rating: (!replyTo && activeCommentTab === 'review') ? commentRating : null,
            };

            const { error } = await supabase.from("comments").insert([newComment]);
            if (error) throw error;

            if (!replyTo && activeCommentTab === 'review' && product) {
                const currentCount = product.reviewCount || 0;
                const currentRating = product.rating || 0;
                const newCount = currentCount + 1;
                const newRating = ((currentRating * currentCount) + commentRating) / newCount;
                
                await supabase.from("products").update({ rating: newRating, review_count: newCount }).eq("id", productId);
            }

            setCommentText("");
            setReplyTo(null);
            showToast(language === 'uz' ? "Muvaffaqiyatli yuborildi!" : "Успешно отправлено!");
            fetchComments();
        } catch (e: any) {
            console.error("Comment error:", e);
            showToast(t.common.error, 'error');
        } finally {
            setIsPosting(false);
        }
    };

    const handleUpdateComment = async (commentId: string) => {
        if (!editingText.trim()) return;
        try {
            await supabase.from("comments").update({
                text: editingText,
                is_edited: true,
            }).eq("id", commentId);
            
            setEditingCommentId(null);
            setEditingText("");
            showToast(language === 'uz' ? "Tahrirlandi!" : "Изменено!");
            fetchComments();
        } catch (e) {
            showToast(t.common.error, 'error');
        }
    };

    const confirmDelete = async () => {
        if (!commentToDelete) return;
        try {
            await supabase.from("comments").delete().eq("id", commentToDelete);
            showToast(language === 'uz' ? "O'chirildi!" : "Удалено!");
            fetchComments();
            setCommentToDelete(null);
        } catch (e) {
            showToast(t.common.error, 'error');
            setCommentToDelete(null);
        }
    };

    const handleReaction = async (commentId: string, emoji: string) => {
        if (!user) { router.push("/login"); return; }
        const currentId = user.id || user.phone;
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        const currentReactions = { ...(comment.reactions || {}) };
        let existingEmoji: string | null = null;
        Object.entries(currentReactions).forEach(([e, users]: [string, any]) => {
            if (Array.isArray(users) && users.includes(currentId)) existingEmoji = e;
        });

        if (existingEmoji === emoji) {
            currentReactions[emoji] = currentReactions[emoji].filter((id: string) => id !== currentId);
            if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
        } else {
            if (existingEmoji) {
                currentReactions[existingEmoji] = currentReactions[existingEmoji].filter((id: string) => id !== currentId);
                if (currentReactions[existingEmoji].length === 0) delete currentReactions[existingEmoji];
            }
            currentReactions[emoji] = [...(currentReactions[emoji] || []), currentId];
        }

        try {
            await supabase.from("comments").update({ reactions: currentReactions }).eq("id", commentId);
            fetchComments();
            setActiveReactionPicker(null);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="mt-16 px-8 mb-20 text-black">
            <div className="flex border-b border-gray-100 mb-8">
                <button onClick={() => setActiveCommentTab('review')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest relative ${activeCommentTab === 'review' ? 'text-black' : 'text-gray-400'}`}>
                    {language === 'uz' ? "Sharhlar" : "Отзывы"}
                    {activeCommentTab === 'review' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
                <button onClick={() => setActiveCommentTab('question')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest relative ${activeCommentTab === 'question' ? 'text-black' : 'text-gray-400'}`}>
                    {language === 'uz' ? "Savollar" : "Вопросы"}
                    {activeCommentTab === 'question' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
            </div>

            {user ? (
                <div id="comment-input" className="bg-gray-50 p-6 rounded-[32px] mb-10 border border-gray-100 shadow-sm">
                    {replyTo && (
                        <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl mb-4 text-[10px] italic">
                            <span className="text-gray-400">Replying to @{replyTo.username}</span>
                            <button onClick={() => { setReplyTo(null); setCommentText(""); }} className="text-red-500 font-bold uppercase">Cancel</button>
                        </div>
                    )}
                    {!replyTo && activeCommentTab === 'review' && (
                        <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Baholang:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setCommentRating(star)}>
                                        <Star size={24} fill={commentRating >= star ? "#FBBF24" : "none"} className={commentRating >= star ? "text-yellow-400" : "text-gray-200"} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="relative">
                        <textarea 
                            id="comment-textarea" 
                            value={commentText} 
                            onChange={(e) => setCommentText(e.target.value)} 
                            placeholder={activeCommentTab === 'review' ? (language === 'uz' ? "Sharh qoldiring..." : "Оставить отзыв...") : (language === 'uz' ? "Savolingizni bering..." : "Задать вопрос...")} 
                            className="w-full bg-white border-2 border-transparent focus:border-black rounded-2xl p-4 pr-32 text-sm font-medium outline-none transition-all min-h-[100px] resize-none" 
                        />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <button onClick={submitComment} className="bg-black text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                                {isPosting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <Link href="/login" className="block text-center p-8 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 text-gray-400 font-bold text-sm mb-10">Tizimga kiring</Link>
            )}

            <div className="space-y-8">
                {comments
                    .filter(c => c.type === activeCommentTab && !c.parentId)
                    .slice(0, visibleCommentsCount)
                    .map(comment => (
                        <div key={comment?.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black text-xs shrink-0">
                                    {(comment?.username || comment?.userId || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-black italic flex items-center gap-2">
                                                @{comment?.username || comment?.userId || "user"} {comment?.isAdmin && <span className="bg-black text-white text-[8px] px-1.5 py-0.5 rounded uppercase not-italic tracking-tighter">Admin</span>}
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {comment?.timestamp || comment?.created_at ? new Date(comment.timestamp || comment.created_at).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                    {comment?.rating && (
                                        <div className="flex text-yellow-400 mb-2">
                                            {[...Array(Number(comment.rating || 0))].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4">{comment?.text || comment?.content || ""}</p>
                                    
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => { setReplyTo(comment); setCommentText(`@${comment.username} `); document.getElementById('comment-textarea')?.focus(); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black flex items-center gap-1"><Reply size={12} /> Javob berish</button>
                                        {user && (user.id === comment.userId || user.phone === comment.userId || user.isAdmin) && (
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.text); }} className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-600 flex items-center gap-1"><Pencil size={12} /> Tahrirlash</button>
                                                <button onClick={() => setCommentToDelete(comment.id)} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> O'chirish</button>
                                            </div>
                                        )}
                                        <button onClick={() => setActiveReactionPicker(activeReactionPicker === comment.id ? null : comment.id)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black flex items-center gap-1 ml-auto">
                                            <Smile size={12} />
                                        </button>
                                    </div>

                                    {activeReactionPicker === comment.id && (
                                        <div className="mt-4 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] rounded-[24px] p-2 border border-gray-100 animate-in fade-in zoom-in-90 slide-in-from-top-4 duration-300 z-50 w-full max-w-[320px]">
                                            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 px-1">
                                                {EMOJIS.map(emoji => (
                                                    <button key={emoji} onClick={() => handleReaction(comment.id, emoji)} className="hover:scale-125 transition-all active:scale-90 flex items-center justify-center shrink-0">
                                                        <AppleEmoji emoji={emoji} size={30} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                                        <div className="flex flex-wrap gap-3 mt-4">
                                            {Object.entries(comment.reactions).map(([emoji, users]: [string, any]) => (
                                                <button key={emoji} onClick={() => handleReaction(comment.id, emoji)} className={`flex items-center gap-1.5 transition-all active:scale-90 ${users.includes(user?.id || user?.phone || "") ? "opacity-100 scale-110" : "opacity-50"}`}>
                                                    <AppleEmoji emoji={emoji} size={22} />
                                                    <span className="text-xs font-black text-gray-500">{users.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {editingCommentId === comment.id && (
                                        <div className="mt-4 bg-white p-4 rounded-2xl border-2 border-blue-100">
                                            <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full text-sm font-medium outline-none resize-none min-h-[80px]" autoFocus />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingCommentId(null)} className="px-4 py-2 text-[10px] font-black uppercase text-gray-400">Bekor qilish</button>
                                                <button onClick={() => handleUpdateComment(comment.id)} className="px-6 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all">Saqlash</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Replies List */}
                                    <div className="mt-4 space-y-4">
                                        {comments.filter(r => r.parentId === comment.id).map(reply => (
                                            <div key={reply.id} className="ml-8 pt-4 border-l-2 border-gray-50 pl-6">
                                                <div className="flex items-center gap-2 mb-1"><h4 className="text-[11px] font-black italic">@{reply.username}</h4><span className="text-[9px] text-gray-400 font-bold ml-auto">{new Date(reply.timestamp).toLocaleDateString()}</span></div>
                                                <p className="text-sm text-gray-500 font-medium">{reply.text}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <button onClick={() => { setReplyTo(comment); setCommentText(`@${reply.username} `); document.getElementById('comment-textarea')?.focus(); }} className="text-[9px] font-black uppercase text-gray-300">Javob berish</button>
                                                    {user && (user.id === reply.userId || user.phone === reply.userId || user.isAdmin) && (
                                                        <button onClick={() => setCommentToDelete(reply.id)} className="text-[9px] font-black uppercase text-red-300">O'chirish</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                {comments.filter(c => c.type === activeCommentTab && !c.parentId).length > visibleCommentsCount && (
                    <button onClick={() => setVisibleCommentsCount(prev => prev + 5)} className="w-full py-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all flex items-center justify-center gap-2">
                        <ChevronDown size={14} strokeWidth={3} /> {language === 'uz' ? "Barchasini ko'rish" : "Посмотреть все"}
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {commentToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setCommentToDelete(null)} />
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative">
                        <Trash2 size={32} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-center mb-8">{language === 'uz' ? "Sharhni o'chirish" : "Удалить комментарий"}</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase">O'chirish</button>
                            <button onClick={() => setCommentToDelete(null)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase">Bekor qilish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
