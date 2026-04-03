"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/store";
import { Send, ChevronLeft, Loader2, Paperclip, MoreVertical } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function P2PChatPage() {
    const { user, language } = useStore();
    const router = useRouter();
    const params = useParams();
    const targetPhoneRaw = params.id as string;
    const targetPhone = decodeURIComponent(targetPhoneRaw);
    
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [targetUserData, setTargetUserData] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const roomId = user && targetPhone ? [user.phone.replace(/\D/g, ''), targetPhone.replace(/\D/g, '')].sort().join("_") : "";

    useEffect(() => {
        if (!mounted) return;
        if (!user || !targetPhone) {
            router.push("/login");
            return;
        }

        const fetchTargetInfo = async () => {
            // First try Users table
            const { data: userData } = await supabase.from("users").select("*").eq("phone", targetPhone).single();
            const { data: statusData } = await supabase.from("user_status").select("*").eq("id", targetPhone).single();
            
            setTargetUserData({
                name: userData?.name || "User",
                username: userData?.username || targetPhone.slice(-4),
                phone: targetPhone,
                isOnline: statusData?.is_online || false
            });
        };
        fetchTargetInfo();

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from("private_messages")
                .select("*")
                .eq("chat_id", roomId)
                .order("created_at", { ascending: true });
            
            if (error) throw error;
            setMessages(data || []);
            setLoading(false);
            scrollToBottom();
        };
        fetchMessages();

        // Real-time (Robust: Using unique room channel and client-side check)
        const channel = supabase
            .channel(`p2p_${roomId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'private_messages'
            }, (payload) => {
                console.log("⚡️ Live message event:", payload.new);
                if (payload.new.chat_id === roomId) {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new];
                    });
                    scrollToBottom();
                }
            })
            .subscribe((status) => {
                console.log("📡 Subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, targetPhone, roomId, router, mounted]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!user || !roomId || (!inputText.trim() && !selectedFile)) return;

        const { uploadToYandexS3 } = require("@/lib/yandex-s3");
        setIsSending(true);
        const tempId = crypto.randomUUID();
        const msgText = inputText;

        try {
            // Optimistic update: Show message immediately
            const optimisticMsg = {
                id: tempId,
                chat_id: roomId,
                text: msgText,
                sender_id: user.phone,
                created_at: new Date().toISOString(),
                isPending: true
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setInputText("");
            scrollToBottom();

            let uploadedUrl = "";
            let fileType = "";

            if (selectedFile) {
                uploadedUrl = await uploadToYandexS3(selectedFile);
                fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
                
                // Update optimistic message with media
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, image: fileType === 'image' ? uploadedUrl : null, video: fileType === 'video' ? uploadedUrl : null } : m));
            }

            const { data: existingChat } = await supabase.from("private_chats").select("id, unread_count").eq("id", roomId).single();
            const otherPhoneClean = targetPhone.replace(/\D/g, '');
            const myPhoneClean = user.phone.replace(/\D/g, '');
            
            if (!existingChat) {
                await supabase.from("private_chats").insert([{
                    id: roomId,
                    participants: [myPhoneClean, otherPhoneClean],
                    participant_data: {
                        [myPhoneClean]: { name: user.name || "User", username: user.username || user.phone },
                        [otherPhoneClean]: { name: targetUserData?.name || "User", username: targetUserData?.username || otherPhoneClean }
                    },
                    unread_count: { [otherPhoneClean]: 1, [myPhoneClean]: 0 }
                }]);
            }

            // Real DB Insert
            const { data: realMsg, error } = await supabase.from("private_messages").insert([{
                id: crypto.randomUUID(),
                chat_id: roomId,
                text: msgText,
                image: fileType === 'image' ? uploadedUrl : null,
                video: fileType === 'video' ? uploadedUrl : null,
                sender_id: user.phone
            }]).select().single();

            if (realMsg) {
                // Replace optimistic with real
                setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
            }

            const lastMsg = uploadedUrl ? (fileType === 'image' ? "🖼️ Foto" : "🎥 Video") : msgText;
            const currentOtherUnread = existingChat?.unread_count?.[otherPhoneClean] || 0;
            
            await supabase.from("private_chats").update({
                last_message: lastMsg,
                last_timestamp: new Date().toISOString(),
                unread_count: { ...existingChat?.unread_count, [otherPhoneClean]: currentOtherUnread + 1 }
            }).eq("id", roomId);

            setSelectedFile(null);
            setMediaPreview(null);
            scrollToBottom();
        } catch (error) {
            console.error("Error sending message:", error);
            // Rollback optimistic on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
            setIsUploadingMedia(false);
        }
    };

    if (!mounted || (loading && !messages.length)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-[#f0f2f5] max-w-md mx-auto relative overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl p-4 pt-12 flex items-center gap-4 border-b border-gray-100 shadow-sm z-10 shrink-0">
                <button onClick={() => router.back()} className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-all text-gray-500">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center shadow-lg shadow-black/10 shrink-0 font-black text-xs">
                        {targetUserData?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[14px] font-black italic uppercase tracking-tight truncate leading-none mb-0.5">{targetUserData?.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            {targetUserData?.isOnline ? (
                                <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online</>
                            ) : `@{${targetUserData?.username}}`}
                        </p>
                    </div>
                </div>
                <button className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><MoreVertical size={20} /></button>
            </div>

            {/* Chat Area - Telegram Style Background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <div className="py-4 text-center">
                    <span className="bg-black/5 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-gray-500 px-3 py-1 rounded-full">Xavfsiz muloqot boshlandi</span>
                </div>
                {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.phone;
                    const hasMedia = msg.image || msg.video;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                            <div className={`max-w-[80%] rounded-[20px] shadow-sm relative group ${isMe ? "bg-black text-white rounded-br-none" : "bg-white text-black rounded-bl-none border border-gray-100"}`}>
                                {msg.image && (
                                    <div className="p-1 pb-0">
                                        <img src={msg.image} className="rounded-[16px] w-full max-h-80 object-cover" alt="Media" onClick={() => window.open(msg.image, '_blank')} />
                                    </div>
                                )}
                                {msg.video && (
                                    <div className="p-1 pb-0">
                                        <video src={msg.video} className="rounded-[16px] w-full max-h-80 object-cover" controls playsInline />
                                    </div>
                                )}
                                <div className="p-3 px-4 relative min-w-[80px]">
                                    {msg.text && <p className="text-[13px] font-medium leading-relaxed pr-6">{msg.text}</p>}
                                    <div className={`absolute bottom-1.5 right-2 flex items-center gap-1 ${msg.text ? "" : "bg-black/20 backdrop-blur-md px-1.5 py-0.5 rounded-lg"}`}>
                                        <span className={`text-[8px] font-bold uppercase tracking-tighter ${isMe ? "text-white/60" : "text-gray-400"}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && <div className="w-3 h-3 flex items-center justify-center opacity-60">✓✓</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-3 pb-8 bg-white/80 backdrop-blur-xl border-t border-gray-100 shrink-0">
                {mediaPreview && (
                    <div className="mb-3 relative w-24 aspect-square group animate-in slide-in-from-bottom-2">
                        <img src={mediaPreview} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-xl" alt="Preview" />
                        <button onClick={() => { setSelectedFile(null); setMediaPreview(null); }} className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 shadow-lg border border-white">
                            <ChevronLeft size={14} className="rotate-45" />
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-11 h-11 text-gray-400 hover:text-black transition-colors flex items-center justify-center shrink-0">
                        <Paperclip size={22} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setSelectedFile(file);
                            setMediaPreview(URL.createObjectURL(file));
                        }
                    }} className="hidden" accept="image/*,video/*" />
                    <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 flex items-center gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Xabar..."
                            className="bg-transparent flex-1 text-sm font-medium outline-none"
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={isSending || (!inputText.trim() && !selectedFile)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${inputText.trim() || selectedFile ? "bg-black text-white shadow-lg scale-100" : "text-gray-300 scale-90"}`}
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
