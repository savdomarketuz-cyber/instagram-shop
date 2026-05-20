"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { MessageSquare, User, Search, Loader2, Headset, Settings, LogOut, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import { translations } from "@/lib/translations";

export default function MessagesPage() {
    const { user, language } = useStore();
    const t = translations[language];
    const router = useRouter();
    const [chats, setChats] = useState<any[]>([]);
    const [supportChat, setSupportChat] = useState<any>(null);
    const [userResults, setUserResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [mounted, setMounted] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!user) {
            router.push("/login");
            return;
        }
        const myPhoneClean = user.phone.replace(/\D/g, '');

        const fetchChats = async () => {
            try {
                // 1. Fetch Private Chats
                const { data: sessions, error } = await supabase
                    .from("private_chats")
                    .select("*")
                    .contains("participants", [myPhoneClean])
                    .order("last_timestamp", { ascending: false });
                
                if (error) throw error;
                setChats(sessions || []);

                // 2. Fetch Support Chat
                const { data: support } = await supabase
                    .from("support_chats")
                    .select("*")
                    .eq("id", user.phone)
                    .single();
                
                if (support) setSupportChat(support);
                
                setLoading(false);
            } catch (e) {
                console.error("Chat fetch error:", e);
                setLoading(false);
            }
        };

        fetchChats();

        // Real-time subscriptions
        const privateChannel = supabase
            .channel('private_chats_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'private_chats',
                filter: `participants=cs.{${user.phone}}` 
            }, () => fetchChats())
            .subscribe();

        const supportChannel = supabase
            .channel('support_chats_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'support_chats',
                filter: `id=eq.${user.phone}`
            }, (payload) => setSupportChat(payload.new))
            .subscribe();

        return () => {
            supabase.removeChannel(privateChannel);
            supabase.removeChannel(supportChannel);
        };
    }, [user, router, mounted]);

    // Global User Search Logic
    useEffect(() => {
        const cleanQuery = searchQuery.trim().toLowerCase();
        if (cleanQuery.length < 1) {
            setUserResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(`/api/users/search?q=${cleanQuery}`);
                const data = await response.json();
                if (data.success) {
                    setUserResults(data.users);
                }
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, user?.phone]);

    const filteredChats = chats.filter((chat: any) => {
        const otherParticipantPhone = chat.participants.find((p: string) => p !== user?.phone);
        const otherData = chat.participantData?.[otherParticipantPhone || ""];
        const searchStr = `${otherData?.name} ${otherData?.username} ${otherParticipantPhone}`.toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase());
    });

    if (!mounted || (loading && chats.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100svh", background: "#FAFAF6", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "rgba(250,250,246,0.92)", backdropFilter: "blur(20px)", padding: "54px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(15,20,16,0.06)", flexShrink: 0, position: "relative", zIndex: 60 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        style={{ width: 40, height: 40, borderRadius: 20, background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,110,62,0.28)" }}
                    >
                        {user?.username?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || <User size={18} />}
                    </button>
                    <div>
                        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0F1410", letterSpacing: -0.3 }}>Inbox</h1>
                        <p style={{ fontSize: 11, color: "#9AA29C", fontWeight: 500 }}>@{user?.username || 'user'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowMenu(!showMenu)}
                    style={{ width: 40, height: 40, borderRadius: 14, background: showMenu ? "#2D6E3E" : "#fff", color: showMenu ? "#fff" : "#9AA29C", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,20,16,0.06)" }}
                >
                    <Settings size={20} />
                </button>

                {/* Profile Modal Menu */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-6 mt-2 w-64 bg-white rounded-[32px] shadow-2xl border border-gray-100 p-2 z-50 animate-in slide-in-from-top-4 duration-300">
                            <div className="p-4 bg-gray-50 rounded-[24px] mb-2 flex items-center gap-3">
                                <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black italic text-xs uppercase truncate leading-none mb-1">{user?.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">{user?.phone}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Link href="/account" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all group">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <User size={16} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{t.common.profileInfo}</span>
                                </Link>

                                <Link href="/orders" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all group">
                                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Package size={16} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{t.common.myOrders}</span>
                                </Link>

                                <button
                                    onClick={() => {
                                        useStore.getState().logout();
                                        router.push("/login");
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-2xl transition-all group text-red-500 mt-2"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <LogOut size={16} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{t.common.logoutSystem}</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Search */}
            <div style={{ padding: "12px 16px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                    <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#C7CDC8", pointerEvents: "none" }} size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.common.search}
                        style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(15,20,16,0.06)", borderRadius: 16, padding: "12px 14px 12px 44px", fontSize: 14, fontWeight: 500, color: "#0F1410", outline: "none", boxSizing: "border-box", transition: "border-color 200ms" }}
                        onFocus={e => (e.target.style.borderColor = "#2D6E3E")}
                        onBlur={e => (e.target.style.borderColor = "rgba(15,20,16,0.06)")}
                    />
                </div>
            </div>

            {/* Chat List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px" }} className="no-scrollbar">
                {filteredChats.length === 0 && 
                 searchQuery.trim().length === 0 && 
                 (!supportChat || !`admin support qo'llab quvvatlash`.includes(searchQuery.toLowerCase())) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                        <MessageSquare size={80} strokeWidth={1} />
                        <p className="mt-4 font-black uppercase tracking-widest text-xs italic">No messages found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Admin Support Chat - Fixed at Top */}
                        {supportChat && `admin support qo'llab quvvatlash`.includes(searchQuery.toLowerCase()) && (
                            <Link
                                href="/chat"
                                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 20, background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)", color: "#fff", textDecoration: "none", marginBottom: 8, boxShadow: "0 8px 20px rgba(45,110,62,0.22)" }}
                            >
                                <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Headset size={24} color="#fff" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black italic text-sm truncate uppercase tracking-tighter">{t.common.supportService}</h3>
                                            <span className="bg-white text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Admin</span>
                                        </div>
                                        <span className="text-[10px] text-white/40 font-bold uppercase">
                                            {supportChat.lastTimestamp?.toDate ? supportChat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <p className={`text-[11px] font-medium truncate ${supportChat.unreadByUser > 0 ? "text-white font-black" : "text-white/60"}`}>
                                            {supportChat.lastMessage || t.common.clickToContact}
                                        </p>
                                        {supportChat.unreadByUser > 0 && (
                                            <div className="min-w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black px-1 shadow-lg shadow-red-200">
                                                {supportChat.unreadByUser}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        )}

                        {filteredChats.map((chat: any) => {
                            const myPhoneClean = user?.phone?.replace(/\D/g, '') || "";
                            const otherPhone = chat.participants.find((p: string) => p.replace(/\D/g, '') !== myPhoneClean) || "";
                            const otherData = chat.participant_data?.[otherPhone] || { name: "User", username: otherPhone };
                            const unread = chat.unread_count?.[myPhoneClean] || 0;

                            const lastMsg = chat.last_message || t.common.startConversation;
                            const timestamp = chat.last_timestamp ? new Date(chat.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                            return (
                                <Link
                                    key={chat.id}
                                    href={`/messages/${otherPhone}`}
                                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 18, textDecoration: "none", background: "#fff", marginBottom: 6 }}
                                >
                                    <div style={{ width: 46, height: 46, borderRadius: 16, background: "#EAF3EC", color: "#2D6E3E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                                        {otherData.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="font-black italic text-sm truncate uppercase tracking-tighter shrink-0">{otherData.name}</h3>
                                            <span className="text-[10px] font-bold text-gray-400">{timestamp}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-bold text-gray-500 truncate leading-none mb-0.5 opacity-60 uppercase tracking-widest">{lastMsg}</p>
                                            {unread > 0 && (
                                                <div style={{ minWidth: 20, height: 20, padding: "0 6px", background: "#2D6E3E", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    {unread}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}

                        {/* Global Search Results (Users to start new chat with) */}
                        {searchQuery.trim().length >= 2 && (
                            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                <h2 className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{t.common.users}</h2>
                                {isSearching ? (
                                    <div className="flex justify-center py-6 opacity-20"><Loader2 className="animate-spin" size={24} /></div>
                                ) : userResults.length === 0 ? (
                                    <p className="px-4 text-[11px] font-bold italic text-gray-300 uppercase">{t.common.noUserFound}</p>
                                ) : (
                                    <div className="space-y-1">
                                        {userResults.map(u => {
                                            // Check if already in active chats
                                            const isInActive = chats.some(c => c.participants.includes(u.phone));
                                            if (isInActive) return null;

                                            return (
                                                <Link
                                                    key={u.phone}
                                                    href={`/messages/${u.phone}`}
                                                    className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 active:scale-[0.98] transition-all group"
                                                >
                                                    <div style={{ width: 48, height: 48, borderRadius: 16, background: "#EAF3EC", color: "#2D6E3E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                                                        {u.name?.charAt(0).toUpperCase() || u.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-black italic text-sm truncate uppercase tracking-tighter">{u.name}</h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                                            {u.username ? `@${u.username}` : u.phone}
                                                        </p>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
