"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { X, MessageCircle, Loader2, Heart, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CommentsSheetProps {
    productId: string;
    onClose: () => void;
    language: "uz" | "ru";
    t: any;
}

export const CommentsSheet = ({ productId, onClose, language, t }: CommentsSheetProps) => {
    const { user, showToast } = useStore();
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const { data, error } = await supabase
                    .from("comments")
                    .select("*")
                    .eq("product_id", productId)
                    .order("created_at", { ascending: false });
                
                if (error) throw error;
                setComments(data.map(c => ({
                    id: c.id,
                    productId: c.product_id,
                    userId: c.user_id,
                    username: c.username,
                    text: c.text,
                    timestamp: c.created_at,
                    type: c.type
                })));
            } catch (error) {
                console.error("Error fetching comments:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComments();
    }, [productId]);

    const handleSubmit = async () => {
        if (!user) {
            showToast(language === 'uz' ? "Sharh yozish uchun tizimga kiring" : "Войдите, чтобы оставить комментарий", 'info');
            return;
        }
        if (!newComment.trim()) return;

        setIsPosting(true);
        try {
            const commentId = crypto.randomUUID();
            const commentData = {
                id: commentId,
                product_id: productId,
                user_id: user.phone,
                username: user.username || (language === 'uz' ? "Mijoz" : "Клиент"),
                text: newComment,
                type: 'review'
            };
            const { error } = await supabase.from("comments").insert([commentData]);
            if (error) throw error;

            setComments([{ 
                id: commentId, 
                productId: commentData.product_id,
                userId: commentData.user_id,
                username: commentData.username,
                text: commentData.text,
                timestamp: new Date().toISOString(),
                type: commentData.type 
            }, ...comments]);
            setNewComment("");
            showToast(t.common.confirm);
        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white text-black h-[70dvh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden">
                <div className="w-full h-1 flex justify-center py-3 cursor-pointer shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="font-black italic uppercase tracking-tighter text-lg">
                        {t.reels?.comments || "Comments"}
                        <span className="ml-2 text-gray-300">({comments.length})</span>
                    </h3>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <Loader2 size={32} className="animate-spin mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">{t.common.loading}</p>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                            <MessageCircle size={48} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">{t.reels?.noComments || "No comments yet"}</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4 group">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-50 overflow-hidden shrink-0">
                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-black uppercase text-gray-400">
                                        {comment.username?.charAt(0) || "U"}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black uppercase italic tracking-tighter">{comment.username}</span>
                                        <span className="text-[10px] text-gray-300 font-bold">
                                            {new Date(comment.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-gray-700 leading-relaxed font-medium">{comment.text}</p>
                                </div>
                                <button className="self-start mt-1 p-1 text-gray-300 hover:text-red-500 transition-colors">
                                    <Heart size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 pb-10 shrink-0">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2 px-4 group focus-within:ring-2 focus-within:ring-black/5 transition-all">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t.reels?.writeComment || "Write a comment..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-gray-300 py-2 text-black"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={isPosting || !newComment.trim()}
                            className="p-2 bg-black text-white rounded-xl disabled:opacity-20 transition-all active:scale-90"
                        >
                            {isPosting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
