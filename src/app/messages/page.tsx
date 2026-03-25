"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/store";
import { MessageSquare, User, Search, Loader2, Headset, Settings, LogOut, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MessagesPage() {
    const { user, language } = useStore();
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

        const fetchChats = async () => {
            try {
                // 1. Fetch Private Chats
                const { data: sessions, error } = await supabase
                    .from("private_chats")
                    .select("*")
                    .contains("participants", [user.phone])
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
        if (cleanQuery.length < 2) {
            setUserResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Search in user_status or users table
                const { data, error } = await supabase
                    .from("user_status")
                    .select("*")
                    .or(`username.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`)
                    .neq("id", user?.phone)
                    .limit(15);

                if (!error && data) {
                    setUserResults(data.map(u => ({ phone: u.id, ...u })));
                }
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, 500);

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
        <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 pt-12 flex items-center justify-between border-b border-gray-50 shrink-0 relative z-[60]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg active:scale-90 transition-all overflow-hidden border-2 border-white"
                    >
                        {user?.username?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || <User size={18} />}
                    </button>
                    <div>
                        <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">Inbox</h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">@{user?.username || 'user'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showMenu ? 'bg-black text-white rotate-90' : 'bg-gray-50 text-gray-400'}`}
                >
                    <Settings size={20} />
                </button>

                {/* Profile Modal Menu */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-full right-6 mt-2 w-64 bg-white rounded-[32px] shadow-2xl border border-gray-100 p-2 z-50 animate-in slide-in-from-top-4 duration-300">
                            <div className="p-4 bg-gray-50 rounded-[24px] mb-2 flex items-center gap-3">
                                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-sm">
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
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{language === 'uz' ? 'Profil ma\'lumotlari' : 'Данные профиля'}</span>
                                </Link>

                                <Link href="/orders" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl transition-all group">
                                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Package size={16} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{language === 'uz' ? 'Mening buyurtmalarim' : 'Мои заказы'}</span>
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
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{language === 'uz' ? 'Tizimdan chiqish' : 'Выйти из системы'}</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Search */}
            <div className="p-6 shrink-0">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === 'uz' ? "Qidirish..." : "Поиск..."}
                        className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold border-none focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar">
                {filteredChats.length === 0 && (!supportChat || !`admin support qo'llab quvvatlash`.includes(searchQuery.toLowerCase())) ? (
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
                                className="flex items-center gap-4 p-4 rounded-3xl bg-black text-white active:scale-[0.98] transition-all group mb-4 shadow-xl shadow-black/10"
                            >
                                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-all">
                                    <Headset size={28} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black italic text-sm truncate uppercase tracking-tighter">Support Service</h3>
                                            <span className="bg-white text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Admin</span>
                                        </div>
                                        <span className="text-[10px] text-white/40 font-bold uppercase">
                                            {supportChat.lastTimestamp?.toDate ? supportChat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <p className={`text-[11px] font-medium truncate ${supportChat.unreadByUser > 0 ? "text-white font-black" : "text-white/60"}`}>
                                            {supportChat.lastMessage || "Click to contact support"}
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
                            const otherPhone = chat.participants.find((p: string) => p !== user?.phone) || "";
                            const otherData = chat.participantData?.[otherPhone] || { name: "User", username: otherPhone };
                            const unread = chat.unreadCount?.[user?.phone || ""] || 0;

                            return (
                                <Link
                                    key={chat.id}
                                    href={`/messages/${otherPhone}`}
                                    className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 active:scale-[0.98] transition-all group border border-transparent hover:border-gray-100"
                                >
                                    <div className="w-14 h-14 bg-gray-100 text-black rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-black/5 group-hover:scale-105 transition-all">
                                        {otherData.username?.charAt(0).toUpperCase() || otherData.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-black italic text-sm truncate uppercase tracking-tighter">@{otherData.username}</h3>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                                                {chat.lastTimestamp?.toDate ? chat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <p className={`text-[11px] font-medium truncate ${unread > 0 ? "text-black font-black" : "text-gray-400"}`}>
                                                {chat.lastMessage || "Start a conversation"}
                                            </p>
                                            {unread > 0 && (
                                                <div className="min-w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black px-1 shadow-lg shadow-red-200">
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
                                <h2 className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{language === 'uz' ? 'Foydalanuvchilar' : 'Пользователи'}</h2>
                                {isSearching ? (
                                    <div className="flex justify-center py-6 opacity-20"><Loader2 className="animate-spin" size={24} /></div>
                                ) : userResults.length === 0 ? (
                                    <p className="px-4 text-[11px] font-bold italic text-gray-300 uppercase">Hech kim topilmadi</p>
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
                                                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-lg shadow-black/10 group-hover:scale-105 transition-all">
                                                        {u.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-black italic text-sm truncate uppercase tracking-tighter">@{u.username}</h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {u.isOnline ? <span className="text-green-500">Online</span> : "Instagram User"}
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
