"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/store";
import { Send, ChevronLeft, Loader2, Paperclip, MoreVertical } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GREEN = "#2D6E3E";
const GREEN_DEEP = "#1F5A30";
const GREEN_TINT = "#EAF3EC";

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

        // Mark as Read
        const markAsRead = async () => {
            const myPhoneClean = user.phone.replace(/\D/g, '');
            const { data: chat } = await supabase.from("private_chats").select("unread_count").eq("id", roomId).single();
            if (chat) {
                const newUnread = { ...(chat.unread_count || {}), [myPhoneClean]: 0 };
                await supabase.from("private_chats").update({ unread_count: newUnread }).eq("id", roomId);
            }
        };
        markAsRead();

        const channel = supabase
            .channel(`p2p_${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'private_messages'
            }, (payload) => {
                if (payload.new.chat_id === roomId) {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new];
                    });
                    scrollToBottom();
                }
            })
            .subscribe();

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
                const { url } = await uploadToYandexS3(selectedFile);
                uploadedUrl = url;
                fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
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

            const { data: realMsg } = await supabase.from("private_messages").insert([{
                id: crypto.randomUUID(),
                chat_id: roomId,
                text: msgText,
                image: fileType === 'image' ? uploadedUrl : null,
                video: fileType === 'video' ? uploadedUrl : null,
                sender_id: user.phone
            }]).select().single();

            if (realMsg) {
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
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
            setIsUploadingMedia(false);
        }
    };

    const handleDeleteMessage = async (msgId: string, forEveryone: boolean) => {
        try {
            if (forEveryone) {
                await supabase.from("private_messages").delete().eq("id", msgId);
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } else {
                setMessages(prev => prev.filter(m => m.id !== msgId));
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const handleDeleteChat = async () => {
        const confirm = window.confirm("Haqiqatdan ham ushbu suhbatni butunlay o'chirmoqchimisiz?");
        if (!confirm) return;
        try {
            await supabase.from("private_messages").delete().eq("chat_id", roomId);
            await supabase.from("private_chats").delete().eq("id", roomId);
            router.push("/messages");
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    if (!mounted || (loading && !messages.length)) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF6" }}>
                <Loader2 style={{ color: GREEN }} size={32} className="animate-spin" />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#FAFAF6", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "rgba(250,250,246,0.92)", backdropFilter: "blur(20px)", padding: "54px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: "0.5px solid rgba(15,20,16,0.06)", flexShrink: 0, zIndex: 10 }}>
                <button
                    onClick={() => router.back()}
                    style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", cursor: "pointer", flexShrink: 0 }}
                >
                    <ChevronLeft size={20} color="#0F1410" />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: GREEN_TINT, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {targetUserData?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ fontSize: 15, fontWeight: 700, color: "#0F1410", letterSpacing: -0.2, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {targetUserData?.name}
                        </h1>
                        <p style={{ fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, color: targetUserData?.isOnline ? GREEN : "#9AA29C" }}>
                            {targetUserData?.isOnline ? (
                                <><span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN, display: "inline-block" }} />Online</>
                            ) : `@${targetUserData?.username}`}
                        </p>
                    </div>
                </div>

                <div style={{ position: "relative" }} className="group/menu">
                    <button
                        style={{ width: 40, height: 40, borderRadius: 14, background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,20,16,0.06)" }}
                        className="group/btn"
                    >
                        <MoreVertical size={18} color="#9AA29C" />
                    </button>
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(15,20,16,0.12)", minWidth: 180, zIndex: 20, padding: 8 }} className="opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all">
                        <button
                            onClick={handleDeleteChat}
                            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12, border: "none", background: "none", cursor: "pointer", color: "#FF3B30", fontSize: 13, fontWeight: 700 }}
                        >
                            {language === 'uz' ? "Suhbatni o'chirish" : "Удалить чат"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }} className="no-scrollbar">
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <span style={{ background: "rgba(15,20,16,0.05)", backdropFilter: "blur(8px)", fontSize: 10, fontWeight: 700, color: "#9AA29C", padding: "4px 14px", borderRadius: 20, letterSpacing: 0.5 }}>
                        {language === 'uz' ? "Xavfsiz muloqot boshlandi" : "Защищённый чат начат"}
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.phone;
                    const hasMedia = msg.image || msg.video;
                    return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 2 }} className="group/msg">
                            <div style={{ maxWidth: "82%", borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px", overflow: "hidden", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", position: "relative" }}>
                                {msg.image && (
                                    <img src={msg.image} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block", cursor: "pointer" }} alt="Media" onClick={() => window.open(msg.image, '_blank')} />
                                )}
                                {msg.video && (
                                    <video src={msg.video} style={{ width: "100%", maxHeight: 280, objectFit: "cover" }} controls playsInline />
                                )}
                                <div style={{ padding: "10px 14px", background: isMe ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)` : "#fff" }}>
                                    {msg.text && (
                                        <p style={{ fontSize: 14, fontWeight: 500, color: isMe ? "#fff" : "#0F1410", lineHeight: 1.45, marginBottom: 4 }}>{msg.text}</p>
                                    )}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                        <span style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : "#9AA29C" }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>✓✓</span>}
                                    </div>
                                </div>

                                {/* Context menu */}
                                <div style={{ position: "absolute", top: -8, ...(isMe ? { left: -36 } : { right: -36 }) }} className="opacity-0 group-hover/msg:opacity-100 transition-all">
                                    <div className="relative group/opt">
                                        <button style={{ width: 28, height: 28, borderRadius: 14, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,20,16,0.1)" }}>
                                            <MoreVertical size={12} color="#9AA29C" />
                                        </button>
                                        <div style={{ position: "absolute", ...(isMe ? { right: 0 } : { left: 0 }), top: "calc(100% + 4px)", background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,20,16,0.12)", minWidth: 120, zIndex: 20, padding: 6 }} className="opacity-0 pointer-events-none group-hover/opt:opacity-100 group-hover/opt:pointer-events-auto transition-all">
                                            <button onClick={() => handleDeleteMessage(msg.id, false)} style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#0F1410", textAlign: "left" }}>
                                                {language === 'uz' ? "Mendan" : "У меня"}
                                            </button>
                                            {isMe && (
                                                <button onClick={() => handleDeleteMessage(msg.id, true)} style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#FF3B30", textAlign: "left" }}>
                                                    {language === 'uz' ? "Hamma uchun" : "Для всех"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} style={{ height: 4 }} />
            </div>

            {/* Input Area */}
            <div style={{ padding: "12px 16px 24px", background: "rgba(250,250,246,0.92)", backdropFilter: "blur(20px)", borderTop: "0.5px solid rgba(15,20,16,0.06)", flexShrink: 0 }}>
                {mediaPreview && (
                    <div style={{ marginBottom: 10, position: "relative", width: 120 }}>
                        {selectedFile?.type.startsWith('video/') ? (
                            <video src={mediaPreview} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 12 }} muted />
                        ) : (
                            <img src={mediaPreview} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 12 }} alt="Preview" />
                        )}
                        <button onClick={() => { setSelectedFile(null); setMediaPreview(null); }} style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: 12, background: "#FF3B30", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        {isUploadingMedia && <div style={{ position: "absolute", inset: 0, background: "rgba(15,20,16,0.5)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={20} color="#fff" className="animate-spin" /></div>}
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedFile(file); setMediaPreview(URL.createObjectURL(file)); }
                    }} className="hidden" accept="image/*,video/*" />
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, borderRadius: 14, background: GREEN_TINT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Paperclip size={18} color={GREEN} />
                    </button>
                    <div style={{ flex: 1, position: "relative" }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={language === 'uz' ? "Xabar yozing..." : "Напишите сообщение..."}
                            style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(15,20,16,0.06)", borderRadius: 20, padding: "12px 48px 12px 18px", fontSize: 14, fontWeight: 500, color: "#0F1410", outline: "none", boxSizing: "border-box" }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isSending || (!inputText.trim() && !selectedFile)}
                            style={{ position: "absolute", right: 6, top: 6, width: 34, height: 34, borderRadius: 14, background: (inputText.trim() || selectedFile) ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)` : "#F5F5F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 200ms ease" }}
                        >
                            {isSending ? <Loader2 size={14} color="#fff" className="animate-spin" /> : <Send size={14} color={(inputText.trim() || selectedFile) ? "#fff" : "#9AA29C"} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
