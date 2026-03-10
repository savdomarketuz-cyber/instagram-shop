"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/store";
import { db, collection, query, where, getDocs, orderBy, addDoc, onSnapshot, limit, serverTimestamp, doc, updateDoc, setDoc } from "@/lib/firebase";
import { Send, ChevronLeft, Loader2, User, Headset, Image as ImageIcon, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
    isAdmin: boolean;
    image?: string;
    video?: string;
    sender: "user" | "admin";
}

export default function ChatPage() {
    const { user, language } = useStore();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
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

        // We use the user's phone as the chat session ID
        const sessionRef = doc(db, "support_chats", user.phone);
        const q = query(
            collection(sessionRef, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(msgs);
            setLoading(false);
            scrollToBottom();
        }, (error) => {
            console.error("Support chat error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
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
                uploadedUrl = await uploadToYandexS3(selectedFile);
                fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
                setIsUploadingMedia(false);
            }

            const sessionRef = doc(db, "support_chats", user.phone);

            // 1. Add message to subcollection
            await addDoc(collection(sessionRef, "messages"), {
                text: inputText,
                image: fileType === 'image' ? uploadedUrl : null,
                video: fileType === 'video' ? uploadedUrl : null,
                senderId: user.phone,
                sender: "user",
                timestamp: serverTimestamp(),
                isAdmin: false
            });

            // 2. Update session metadata for admin list
            const lastMsg = uploadedUrl ? (fileType === 'image' ? "🖼️ Rasm" : "🎥 Video") : inputText;
            await updateDoc(sessionRef, {
                userId: user.phone,
                username: user.username || user.phone,
                lastMessage: lastMsg,
                lastTimestamp: serverTimestamp(),
                status: 'active',
                unreadByAdmin: 1
            }).catch(async (e: any) => {
                // If document doesn't exist, create it
                if (e.code === 'not-found') {
                    await setDoc(sessionRef, {
                        userId: user.phone,
                        username: user.username || user.phone,
                        lastMessage: lastMsg,
                        lastTimestamp: serverTimestamp(),
                        status: 'active',
                        unreadByAdmin: 1
                    });
                }
            });

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

    return (
        <div className="flex flex-col h-[100dvh] bg-gray-50 max-w-md mx-auto relative overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 pt-12 flex items-center gap-4 border-b border-gray-100 shadow-sm z-10 shrink-0">
                <button onClick={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                        <Headset size={24} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest leading-none mb-1">{language === 'uz' ? "Qo'llab-quvvatlash" : "Поддержка"}</h1>
                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-tighter flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                        <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6">
                            <Headset size={40} className="text-black/10" />
                        </div>
                        <h2 className="text-lg font-black italic uppercase tracking-tighter mb-2">{language === 'uz' ? "Qanday yordam bera olamiz?" : "Чем мы можем помочь?"}</h2>
                        <p className="text-xs font-medium text-gray-400 leading-relaxed uppercase tracking-widest">
                            {language === 'uz' ? "Muammolaringiz yoki savollaringizni shu yerda yozib qoldiring. Mutaxassislarimiz tez orada javob berishadi." : "Напишите здесь ваши вопросы или проблемы. Наши специалисты ответят в ближайшее время."}
                        </p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.phone;
                        const hasMedia = msg.image || msg.video;
                        return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isMe && (
                                    <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-black/5 mb-1">
                                        <Headset size={14} />
                                    </div>
                                )}
                                <div className={`max-w-[85%] rounded-[24px] overflow-hidden shadow-sm transition-all ${isMe ? "rounded-br-none" : "rounded-bl-none border border-gray-100"}`}>
                                    <div className="relative">
                                        {msg.image && (
                                            <img src={msg.image} className="w-full max-h-96 object-cover cursor-pointer hover:opacity-95 transition-all" alt="Chat" onClick={() => window.open(msg.image, '_blank')} />
                                        )}
                                        {msg.video && (
                                            <video src={msg.video} className="w-full max-h-96 object-cover" controls playsInline muted autoPlay loop />
                                        )}

                                        {/* Overlay timestamp if media only */}
                                        {hasMedia && !msg.text && (
                                            <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg">
                                                <p className="text-[9px] font-bold text-white uppercase tracking-widest opacity-80">
                                                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {(msg.text || !hasMedia) && (
                                        <div className={`p-4 px-5 ${isMe ? "bg-black text-white" : "bg-white text-black"}`}>
                                            {msg.text && <p className="text-[13px] font-medium leading-relaxed mb-1.5">{msg.text}</p>}
                                            <div className={`flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                                <p className={`text-[8px] font-black uppercase tracking-widest opacity-40 ${isMe ? "text-white/60" : "text-gray-400"}`}>
                                                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hozirgina"}
                                                </p>
                                            </div>
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
            <div className="p-6 pb-6 bg-white border-t border-gray-100 shrink-0">
                {mediaPreview && (
                    <div className="mb-4 relative w-32 aspect-video group shadow-xl">
                        {selectedFile?.type.startsWith('video/') ? (
                            <video src={mediaPreview} className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm" muted />
                        ) : (
                            <img src={mediaPreview} className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm" alt="Preview" />
                        )}
                        <button
                            onClick={() => { setSelectedFile(null); setMediaPreview(null); }}
                            className="absolute -top-3 -right-3 bg-black text-white rounded-full p-1.5 shadow-2xl active:scale-90 border-2 border-white hover:bg-gray-800 transition-colors"
                        >
                            <ChevronLeft size={16} className="rotate-45" />
                        </button>
                        {isUploadingMedia && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-white" />
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-3 relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 bg-gray-100 text-black rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shadow-lg shadow-black/5"
                    >
                        <Paperclip size={20} />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={language === 'uz' ? "Xabaringizni yozing..." : "Напишите сообщение..."}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 pr-12 text-sm font-medium outline-none transition-all"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isSending || (!inputText.trim() && !selectedFile)}
                            className={`absolute right-2 top-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${(inputText.trim() || selectedFile) ? "bg-black text-white shadow-lg" : "text-gray-300 pointer-events-none"}`}
                        >
                            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
