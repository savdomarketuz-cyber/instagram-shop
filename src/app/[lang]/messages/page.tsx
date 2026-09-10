"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { MessageSquare, User, Search, Loader2, Headset, Settings, LogOut, Package, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { videoPreWarmer } from "@/lib/videoPreWarmer";
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
            router.push(`/${language}/login?redirect=${encodeURIComponent(window.location.pathname)}`);
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
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF6]">
                <Loader2 className="animate-spin text-[#2D6E3E]" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100svh] bg-[#FAFAF6] max-w-[480px] mx-auto relative overflow-hidden">
            {/* Header */}
            <div className="bg-[#FAFAF6]/85 backdrop-blur-2xl px-5 pt-12 pb-3 flex items-center justify-between border-b border-[rgba(15,20,16,0.06)] shrink-0 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            videoPreWarmer.triggerHaptic("light");
                            setShowMenu(!showMenu);
                        }}
                        className="ios-tap-feedback active:scale-95 transition-transform w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2D6E3E] to-[#1F5A30] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#2D6E3E]/25"
                    >
                        {user?.username?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || <User size={18} />}
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-[#111612]">Inbox</h1>
                        <p className="text-xs font-medium text-[#737D75]">@{user?.username || 'user'}</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        videoPreWarmer.triggerHaptic("light");
                        setShowMenu(!showMenu);
                    }}
                    className={`ios-icon-tap active:scale-90 transition-transform w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xs ${
                        showMenu 
                            ? "bg-[#2D6E3E] text-white border-[#2D6E3E]" 
                            : "bg-white/80 backdrop-blur-md border-[rgba(15,20,16,0.08)] text-[#737D75] hover:text-[#111612]"
                    }`}
                    aria-label="Settings"
                >
                    <Settings size={19} />
                </button>

                {/* Profile Modal Popover */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 animate-in fade-in duration-200" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-4 mt-2 w-64 bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-2xl border border-[rgba(15,20,16,0.08)] p-2.5 z-50 animate-in slide-in-from-top-3 duration-200">
                            <div className="p-3.5 bg-[#F5F7F5] rounded-2xl mb-2 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D6E3E] to-[#1F5A30] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                    {user?.username?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-xs text-[#111612] truncate leading-tight mb-0.5">{user?.name}</h3>
                                    <p className="text-[11px] font-medium text-[#737D75] truncate">{user?.phone}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Link 
                                    href="/account" 
                                    onClick={() => videoPreWarmer.triggerHaptic("light")}
                                    className="ios-tap-feedback active:scale-[0.98] transition-transform flex items-center gap-3 p-2.5 hover:bg-[#F5F7F5] rounded-xl group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <User size={15} />
                                    </div>
                                    <span className="text-xs font-semibold text-[#111612]">{t.common.profileInfo}</span>
                                </Link>

                                <Link 
                                    href="/orders" 
                                    onClick={() => videoPreWarmer.triggerHaptic("light")}
                                    className="ios-tap-feedback active:scale-[0.98] transition-transform flex items-center gap-3 p-2.5 hover:bg-[#F5F7F5] rounded-xl group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#2D6E3E] flex items-center justify-center">
                                        <Package size={15} />
                                    </div>
                                    <span className="text-xs font-semibold text-[#111612]">{t.common.myOrders}</span>
                                </Link>

                                <button
                                    onClick={() => {
                                        videoPreWarmer.triggerHaptic("light");
                                        useStore.getState().logout();
                                        router.push("/login");
                                    }}
                                    className="ios-tap-feedback active:scale-[0.98] transition-transform w-full flex items-center gap-3 p-2.5 hover:bg-rose-50 rounded-xl group text-rose-600 mt-1"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-rose-100/70 flex items-center justify-center">
                                        <LogOut size={15} />
                                    </div>
                                    <span className="text-xs font-semibold">{t.common.logoutSystem}</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Search */}
            <div className="px-4 py-2.5 shrink-0">
                <div className="relative flex items-center">
                    <Search className="absolute left-3.5 text-[#9AA29C] pointer-events-none" size={17} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.common.search}
                        className="w-full bg-white/80 backdrop-blur-md border border-[rgba(15,20,16,0.08)] focus:border-[#2D6E3E] rounded-2xl pl-10 pr-9 py-2.5 text-sm font-medium text-[#111612] outline-none transition-colors duration-150 placeholder:text-[#9AA29C] shadow-xs"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 w-5 h-5 rounded-full bg-black/5 text-[#737D75] flex items-center justify-center hover:bg-black/10 active:scale-90 transition-transform duration-150 will-change-transform"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
                {filteredChats.length === 0 && 
                 searchQuery.trim().length === 0 && 
                 (!supportChat || !`admin support qo'llab quvvatlash`.includes(searchQuery.toLowerCase())) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                        <div className="w-16 h-16 rounded-3xl bg-[#EAF3EC] text-[#2D6E3E] flex items-center justify-center mb-3 shadow-xs">
                            <MessageSquare size={28} />
                        </div>
                        <h3 className="text-base font-bold tracking-tight text-[#111612]">
                            {language === 'uz' ? "Xabarlar yo'q" : "Сообщений нет"}
                        </h3>
                        <p className="text-xs text-[#737D75] mt-1 max-w-xs">
                            {language === 'uz' ? "Barcha yangi suhbatlar va bildirishnomalar shu yerda ko'rinadi" : "Все новые чаты и уведомления будут отображаться здесь"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Admin Support Chat - Pinned at Top */}
                        {supportChat && `admin support qo'llab quvvatlash`.includes(searchQuery.toLowerCase()) && (
                            <Link
                                href="/chat"
                                onClick={() => videoPreWarmer.triggerHaptic("light")}
                                className="ios-tap-feedback active:scale-[0.98] transition-transform duration-150 will-change-transform flex items-center gap-3.5 p-3.5 rounded-[24px] text-white relative overflow-hidden shadow-md shadow-[#2D6E3E]/20 mb-2.5 border border-white/20"
                                style={{ background: "linear-gradient(135deg, #2D6E3E 0%, #1F5A30 100%)" }}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                                    <Headset size={22} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-white tracking-tight truncate">{t.common.supportService}</h3>
                                            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Admin
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-white/70 font-medium">
                                            {supportChat.lastTimestamp?.toDate ? supportChat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className={`text-xs truncate ${supportChat.unreadByUser > 0 ? "text-white font-semibold" : "text-white/80"}`}>
                                            {supportChat.lastMessage || t.common.clickToContact}
                                        </p>
                                        {supportChat.unreadByUser > 0 && (
                                            <div className="min-w-[20px] h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold px-1.5 shadow-md shadow-rose-900/30">
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
                                    onClick={() => videoPreWarmer.triggerHaptic("light")}
                                    className="ios-tap-feedback active:scale-[0.98] transition-transform duration-150 will-change-transform flex items-center gap-3.5 p-3.5 rounded-[22px] bg-white/90 backdrop-blur-md border border-[rgba(15,20,16,0.06)] shadow-xs hover:border-[#2D6E3E]/30"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-[#EAF3EC] text-[#2D6E3E] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                                        {otherData.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h3 className="font-semibold text-sm text-[#111612] truncate shrink-0">{otherData.name}</h3>
                                            <span className="text-[11px] font-medium text-[#9AA29C]">{timestamp}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs truncate leading-snug ${unread > 0 ? "font-semibold text-[#111612]" : "text-[#737D75]"}`}>
                                                {lastMsg}
                                            </p>
                                            {unread > 0 && (
                                                <div className="min-w-[20px] h-5 px-1.5 bg-[#2D6E3E] text-white rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs">
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
                            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-8">
                                <h2 className="px-2 text-xs font-semibold text-[#737D75] uppercase tracking-wider mb-2.5">{t.common.users}</h2>
                                {isSearching ? (
                                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#2D6E3E]" size={22} /></div>
                                ) : userResults.length === 0 ? (
                                    <p className="px-2 text-xs font-medium text-[#9AA29C] italic">{t.common.noUserFound}</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {userResults.map(u => {
                                            // Check if already in active chats
                                            const isInActive = chats.some(c => c.participants.includes(u.phone));
                                            if (isInActive) return null;

                                            return (
                                                <Link
                                                    key={u.phone}
                                                    href={`/messages/${u.phone}`}
                                                    onClick={() => videoPreWarmer.triggerHaptic("light")}
                                                    className="ios-tap-feedback active:scale-[0.98] transition-transform duration-150 will-change-transform flex items-center gap-3.5 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-[rgba(15,20,16,0.06)] hover:border-[#2D6E3E]/30"
                                                >
                                                    <div className="w-11 h-11 rounded-xl bg-[#EAF3EC] text-[#2D6E3E] flex items-center justify-center font-bold text-sm shrink-0">
                                                        {u.name?.charAt(0).toUpperCase() || u.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-sm text-[#111612] truncate">{u.name}</h3>
                                                        <p className="text-xs text-[#737D75] truncate">
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
