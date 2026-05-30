"use client";

import Link from "next/link";
import { LayoutDashboard, ShoppingCart, Package, Layers, LogOut, Menu, X, Users, Image as ImageIcon, Database, Settings, Sparkles, Activity, Zap, MessageSquare, ShieldAlert, Truck, Warehouse, RotateCcw, Tag, Banknote, Wallet, BookOpen, ClipboardList, BookA, Bell, Timer, Percent, Grid, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/store";
import { AdminNotificationListener } from "@/components/AdminNotificationListener";

type MenuItem = { name: string; href: string; icon: LucideIcon };
type MenuGroup = { title: string; items: MenuItem[] };

function AdminTopNav({ groups, pathname }: { groups: MenuGroup[]; pathname: string }) {
    const [hoverGroup, setHoverGroup] = useState<string | null>(null);
    const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navRef = useRef<HTMLElement | null>(null);

    const openGroup = (title: string) => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setHoverGroup(title);
    };
    const scheduleClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setHoverGroup(null), 160);
    };
    const togglePin = (title: string) => {
        setPinnedGroup((prev) => (prev === title ? null : title));
    };

    // Tashqariga bosilsa — qotirilgan menyu yopiladi
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setPinnedGroup(null);
                setHoverGroup(null);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    return (
        <nav
            ref={navRef}
            className="hidden lg:flex items-center gap-1 sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 py-3"
        >
            {groups.map((group) => {
                const isOpen = pinnedGroup === group.title || hoverGroup === group.title;
                const hasActive = group.items.some((i) => i.href === pathname);
                return (
                    <div
                        key={group.title}
                        className="relative"
                        onMouseEnter={() => openGroup(group.title)}
                        onMouseLeave={scheduleClose}
                    >
                        <button
                            onClick={() => togglePin(group.title)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold tracking-tight transition-all ${
                                isOpen
                                    ? "bg-gray-900 text-white"
                                    : hasActive
                                    ? "text-gray-900 bg-gray-100"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                        >
                            {group.title}
                            <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => { setPinnedGroup(null); setHoverGroup(null); }}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                                active ? "bg-gray-900 text-white font-bold" : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                        >
                                            <Icon size={18} className={active ? "text-white" : "text-gray-400"} />
                                            <span className="text-sm tracking-tight">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useStore();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Admin autentifikatsiya tekshiruvi.
    // MUHIM: zustand `user` localStorage'da abadiy turadi, lekin `admin_token`
    // cookie 7 kunda tugaydi. Faqat zustandga ishonsak, cookie tugagach panel
    // ochiq ko'rinadi-yu, har bir /api/admin/* chaqiruvi jimgina 401 qaytaradi.
    // Shuning uchun haqiqiy cookie'ni serverda tekshiramiz va tugagan bo'lsa
    // qayta kirishga yo'naltiramiz (yangi cookie olinadi).
    useEffect(() => {
        if (!isMounted) return;
        let cancelled = false;

        const verify = async () => {
            const isAdmin = user?.isAdmin || user?.phone === "ADMIN" || user?.id === "ADMIN";
            if (!user || !isAdmin) {
                router.replace("/login");
                return;
            }
            try {
                const res = await fetch("/api/auth", { method: "GET", cache: "no-store" });
                if (cancelled) return;
                if (res.ok) {
                    setIsAuthorized(true);
                } else {
                    // Cookie tugagan/yaroqsiz — qayta kirish kerak
                    router.replace("/login");
                }
            } catch {
                if (!cancelled) router.replace("/login");
            }
        };

        verify();
        return () => { cancelled = true; };
    }, [user, router, isMounted]);

    const language = pathname.split('/')[1] || 'uz';
    const l = (path: string) => `/${language}${path}`;

    const menuGroups = [
        {
            title: "Asosiy",
            items: [
                { name: "Dashboard", href: l("/admin"), icon: LayoutDashboard },
                { name: "Live", href: l("/admin/live"), icon: Zap },
                { name: "Jurnal (Logs)", href: l("/admin/logs"), icon: ClipboardList },
            ],
        },
        {
            title: "Savdo",
            items: [
                { name: "Buyurtmalar", href: l("/admin/orders"), icon: ShoppingCart },
                { name: "Tark etilgan savat", href: l("/admin/carts"), icon: ShoppingCart },
                { name: "Qaytarishlar", href: l("/admin/returns"), icon: RotateCcw },
                { name: "Tezkor yetkazish", href: l("/admin/express-delivery"), icon: Truck },
            ],
        },
        {
            title: "Katalog",
            items: [
                { name: "Mahsulotlar", href: l("/admin/products"), icon: Package },
                { name: "Kategoriyalar", href: l("/admin/categories"), icon: Layers },
                { name: "Brendlar", href: l("/admin/brands"), icon: Activity },
                { name: "Qoldiqlar", href: l("/admin/inventory"), icon: Database },
                { name: "Omborlar", href: l("/admin/warehouses"), icon: Warehouse },
            ],
        },
        {
            title: "Marketing",
            items: [
                { name: "Promo Kodlar", href: l("/admin/promo-codes"), icon: Tag },
                { name: "Smart Chegirma", href: l("/admin/smart-discount"), icon: Percent },
                { name: "Cashback", href: l("/admin/cashback"), icon: Banknote },
                { name: "Hamyon", href: l("/admin/wallets"), icon: Wallet },
                { name: "Hamkorlik", href: l("/admin/affiliate"), icon: Sparkles },
                { name: "Promo Countdown", href: l("/admin/promo-countdown"), icon: Timer },
            ],
        },
        {
            title: "Kontent / Vitrina",
            items: [
                { name: "Bannerlar", href: l("/admin/banners"), icon: ImageIcon },
                { name: "Stories", href: l("/admin/stories"), icon: Sparkles },
                { name: "Kategoriya vitrina", href: l("/admin/featured-categories"), icon: Grid },
                { name: "Maqolalar", href: l("/admin/blogs"), icon: BookOpen },
            ],
        },
        {
            title: "Mijozlar",
            items: [
                { name: "Mijozlar", href: l("/admin/customers"), icon: Users },
                { name: "Chat", href: l("/admin/chats"), icon: MessageSquare },
                { name: "Xabarnomalar", href: l("/admin/notifications"), icon: Bell },
            ],
        },
        {
            title: "Tizim",
            items: [
                { name: "Sozlamalar", href: l("/admin/settings"), icon: Settings },
                { name: "Qidiruv Lug'ati", href: l("/admin/synonyms"), icon: BookA },
            ],
        },
    ];

    // Agar avtorizatsiya tekshirilmagan bo'lsa, loading ko'rsatish
    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
                <ShieldAlert className="text-gray-300" size={48} />
                <p className="text-gray-400 font-bold text-sm">Tekshirilmoqda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex">
            <AdminNotificationListener />
            {/* Sidebar for Desktop */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-black text-white transform transition-transform duration-500 ease-in-out lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-10 flex-1 overflow-y-auto scrollbar-hide">
                    <h2 className="text-3xl font-black tracking-tighter mb-12 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/5">
                            <div className="w-5 h-5 bg-black rounded-lg"></div>
                        </div>
                        <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent italic">ADMIN</span>
                    </h2>

                    <nav className="space-y-6">
                        {menuGroups.map((group) => (
                            <div key={group.title} className="space-y-1.5">
                                <p className="px-6 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                                    {group.title}
                                </p>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`flex items-center gap-4 px-6 py-3.5 rounded-[24px] transition-all duration-300 group ${isActive
                                                ? 'bg-white text-black font-black shadow-2xl shadow-white/10'
                                                : 'text-gray-500 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <Icon size={20} className={isActive ? 'text-black' : 'group-hover:scale-110 transition-transform'} />
                                            <span className="text-sm tracking-tight">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="p-10 border-t border-white/10 bg-black/50 backdrop-blur-md">
                    <Link href="/" className="flex items-center gap-4 text-gray-500 hover:text-red-400 transition-all font-bold group">
                        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-red-500/10 transition-colors">
                            <LogOut size={20} />
                        </div>
                        <span className="text-sm text-gray-400 group-hover:text-red-400 transition-colors">Tizimdan chiqish</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 min-h-screen">
                {/* Header for Mobile */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-40 lg:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-50 rounded-xl">
                        <Menu size={24} />
                    </button>
                    <h1 className="font-black tracking-tighter italic">ADMIN PANEL</h1>
                    <div className="w-10"></div>
                </header>

                {/* Desktop top bar — guruh menyulari (hover ochadi, bosilsa qotadi) */}
                <AdminTopNav groups={menuGroups} pathname={pathname} />

                <div className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-500"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}
