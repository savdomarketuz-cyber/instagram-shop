"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/store";
import { supabase } from "@/lib/supabase";
import { Send, ChevronLeft, Loader2, User, Headset, Image as ImageIcon, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { mapMessage } from "@/lib/mappers";

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
    isAdmin: boolean;
    image?: string;
    video?: string;
    senderType: string;
}

export default function ChatPage() {
    const { user, language } = useStore();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { uploadToYandexS3 } = require("@/lib/yandex-s3");

    useEffect(() => {
        if (!mounted) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const fetchMessages = async () => {
            const response = await fetch(`/api/chat?chat_id=${user.phone}`);
            const data = await response.json();
            if (data.success) setMessages(data.messages.map(mapMessage));
            setLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('public:support_messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'support_messages',
                filter: `chat_id=eq.${user.phone}`
            }, (payload) => {
                const newMessage = mapMessage(payload.new);
                setMessages((prev) => [...prev, newMessage]);
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, mounted, router]);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async () => {
        if (!user || (!inputText.trim() && !selectedFile)) return;

        setIsSending(true);
        try {
            let uploadedUrl = "";
            let fileType = "";

            if (selectedFile) {
                setIsUploadingMedia(true);
                const { url } = await uploadToYandexS3(selectedFile);
                uploadedUrl = url;
                fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
                setIsUploadingMedia(false);
            }


            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.phone,
                    text: inputText,
                    image: fileType === 'image' ? uploadedUrl : null,
                    video: fileType === 'video' ? uploadedUrl : null,
                    sender_id: user.phone,
                    sender_type: "user"
                })
            });

            if (!response.ok) throw new Error("Xabar yuborishda xatolik");

            setInputText("");
            setSelectedFile(null);
            setMediaPreview(null);
            scrollToBottom();
        } catch (error) {
            console.error("Error sending message:", error);
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

    const GREEN = "#2D6E3E";
    const GREEN_DEEP = "#1F5A30";
    const GREEN_TINT = "#EAF3EC";

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#FAFAF6", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "rgba(250,250,246,0.92)", backdropFilter: "blur(20px)", padding: "54px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: "0.5px solid rgba(15,20,16,0.06)", flexShrink: 0, zIndex: 10 }}>
                <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, background: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,20,16,0.06)", cursor: "pointer", flexShrink: 0 }}>
                    <ChevronLeft size={20} color="#0F1410" />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Headset size={22} color={GREEN} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 15, fontWeight: 700, color: "#0F1410", letterSpacing: -0.2, marginBottom: 2 }}>{language === 'uz' ? "Qo'llab-quvvatlash" : "Поддержка"}</h1>
                        <p style={{ fontSize: 11, color: GREEN, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 3, background: GREEN, display: "inline-block" }} />
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }} className="no-scrollbar">
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 32px" }}>
                        <div style={{ width: 80, height: 80, borderRadius: 28, background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                            <Headset size={36} color={GREEN} />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F1410", letterSpacing: -0.3, marginBottom: 8 }}>{language === 'uz' ? "Qanday yordam bera olamiz?" : "Чем мы можем помочь?"}</h2>
                        <p style={{ fontSize: 13, color: "#9AA29C", lineHeight: 1.5, maxWidth: 260 }}>
                            {language === 'uz' ? "Muammolaringiz yoki savollaringizni shu yerda yozib qoldiring." : "Напишите здесь ваши вопросы или проблемы."}
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === user?.phone;
                        const hasMedia = msg.image || msg.video;
                        return (
                            <div key={msg.id} style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                                {!isMe && (
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: GREEN_TINT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                                        <Headset size={14} color={GREEN} />
                                    </div>
                                )}
                                <div style={{ maxWidth: "82%", borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px", overflow: "hidden", boxShadow: "0 2px 8px rgba(15,20,16,0.06)" }}>
                                    {msg.image && <img src={msg.image} style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block", cursor: "pointer" }} alt="Chat" onClick={() => window.open(msg.image, '_blank')} />}
                                    {msg.video && <video src={msg.video} style={{ width: "100%", maxHeight: 280, objectFit: "cover" }} controls playsInline muted />}
                                    {(msg.text || !hasMedia) && (
                                        <div style={{ padding: "10px 14px", background: isMe ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DEEP} 100%)` : "#fff" }}>
                                            {msg.text && <p style={{ fontSize: 14, fontWeight: 500, color: isMe ? "#fff" : "#0F1410", lineHeight: 1.45, marginBottom: 4 }}>{msg.text}</p>}
                                            <p style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.6)" : "#9AA29C", textAlign: isMe ? "right" : "left" }}>
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "•••"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
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
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 44, height: 44, borderRadius: 14, background: GREEN_TINT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Paperclip size={18} color={GREEN} />
                    </button>
                    <div style={{ flex: 1, position: "relative" }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={language === 'uz' ? "Xabaringizni yozing..." : "Напишите сообщение..."}
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
