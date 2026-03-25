import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, User, Phone, ShoppingBag, DollarSign, Calendar, Loader2, Globe, Monitor, MapPin, X, Heart, Eye, TrendingUp, Sparkles, Clock, ShoppingCart } from "lucide-react";

interface Customer {
    id: string;
    phone: string;
    name: string;
    createdAt?: any;
    totalOrders: number;
    totalSpent: number;
    ipAddress?: string;
    locationString?: string;
    locationType?: string;
    isOnline?: boolean;
    lastSeen?: any;
    currentPath?: string;
}

export default function AdminCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerInterests, setCustomerInterests] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [allProducts, setAllProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, ordersRes, statusRes, productsRes] = await Promise.all([
                    supabase.from("users").select("*"),
                    supabase.from("orders").select("user_phone, total"),
                    supabase.from("user_status").select("*"),
                    supabase.from("products").select("id, name")
                ]);

                if (usersRes.error) throw usersRes.error;
                if (ordersRes.error) throw ordersRes.error;
                if (statusRes.error) throw statusRes.error;
                if (productsRes.error) throw productsRes.error;

                const usersData = usersRes.data;
                const ordersData = ordersRes.data;
                const statusData = statusRes.data.reduce((acc: any, s) => {
                    acc[s.id] = s;
                    return acc;
                }, {});

                const merged = usersData.map((user: any) => {
                    const userOrders = ordersData.filter(order => order.user_phone === user.phone);
                    const activity = statusData[user.phone] || {};

                    return {
                        id: user.id,
                        phone: user.phone,
                        name: user.name || "Nomsiz Mijoz",
                        createdAt: user.created_at,
                        ipAddress: activity.ip_address || user.ip_address || "Aniqlanmadi",
                        locationString: activity.location_string || "Aniqlanmadi",
                        locationType: activity.location_type || "ip",
                        isOnline: activity.is_online || false,
                        lastSeen: activity.last_seen || null,
                        currentPath: activity.current_path || "/",
                        totalOrders: userOrders.length,
                        totalSpent: userOrders.reduce((sum, order) => sum + (order.total || 0), 0)
                    };
                });

                merged.sort((a, b) => b.totalSpent - a.totalSpent);
                setCustomers(merged as Customer[]);
                setAllProducts(productsRes.data);
            } catch (error) {
                console.error("Error fetching customers data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const fetchCustomerDetails = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setLoadingDetails(true);
        try {
            const { data, error } = await supabase
                .from("user_interests")
                .select("*")
                .eq("id", customer.phone)
                .single();
            
            if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows found"

            if (data) {
                setCustomerInterests(data);
            } else {
                setCustomerInterests(null);
            }
        } catch (e) {
            console.error("Error fetching customer details:", e);
        } finally {
            setLoadingDetails(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const getProductName = (id: string) => {
        return allProducts.find(p => p.id === id)?.name || id;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-black" size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mijozlar yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">Mijozlar</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Mijozlar • {customers.length} ta umumiy</p>
                </div>

                <div className="relative w-full lg:w-96">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Ism yoki telefon orqali qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-[28px] py-5 pl-16 pr-6 font-bold shadow-sm focus:ring-4 focus:ring-black/5 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        onClick={() => fetchCustomerDetails(customer)}
                        className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-150 group-hover:rotate-12 transition-transform duration-1000">
                            <User size={120} strokeWidth={1} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 group-hover:rotate-12 transition-transform">
                                    <User size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight uppercase italic">{customer.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {customer.isOnline ? (
                                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                Online
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                                Oflayn
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 text-gray-500 font-bold text-sm bg-gray-50 p-4 rounded-2xl">
                                    <Phone size={18} className="text-black" />
                                    <span>{customer.phone}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Buyurtmalar</p>
                                        <div className="font-black text-lg italic">{customer.totalOrders} ta</div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Jami Savdo</p>
                                        <div className="font-black text-lg italic text-green-600">{customer.totalSpent.toLocaleString()} $</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Customer Details Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300 bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-2xl h-full bg-white rounded-l-[50px] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500 p-10">
                        <div className="flex justify-between items-center mb-12">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Mijoz Profili</h2>
                            <button onClick={() => setSelectedCustomer(null)} className="p-4 bg-gray-100 rounded-3xl hover:bg-black hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-12">
                            {/* General Info Card */}
                            <div className="bg-black text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                                <div className="flex items-center gap-8 relative z-10">
                                    <div className="w-24 h-24 bg-white/10 rounded-[36px] flex items-center justify-center text-3xl font-black backdrop-blur-md border border-white/10">
                                        {selectedCustomer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tight mb-2">{selectedCustomer.name}</h3>
                                        <p className="text-white/60 font-bold tracking-widest flex items-center gap-2">
                                            <Phone size={14} /> {selectedCustomer.phone}
                                        </p>
                                        <div className="inline-block mt-4 px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">
                                            {selectedCustomer.totalSpent > 500 ? "VIP Mijoz" : "Sodiq Mijoz"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Technical & Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                                    <div className="flex items-center gap-4 text-gray-400 mb-6">
                                        <Globe size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Texnik ma'lumotlar</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">IP Manzil</p>
                                            <p className="font-mono text-sm font-bold">{selectedCustomer.ipAddress}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Oxirgi marta</p>
                                            <p className="text-sm font-black italic">{selectedCustomer.currentPath === '/' ? 'Bosh sahifa' : selectedCustomer.currentPath}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                                    <div className="flex items-center gap-4 text-gray-400 mb-6">
                                        <MapPin size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Joylashuv</span>
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed mb-4">{selectedCustomer.locationString}</p>
                                    <span className="bg-black text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase">
                                        {selectedCustomer.locationType?.toUpperCase()} orqali
                                    </span>
                                </div>
                            </div>

                            {/* AI INTERESTS SECTION */}
                            <div className="bg-[#f5f0ff] p-10 rounded-[50px] border-2 border-[#7000FF]/10 relative overflow-hidden">
                                <div className="absolute top-6 right-8 text-[#7000FF] opacity-20">
                                    <Sparkles size={48} />
                                </div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8 text-[#7000FF] flex items-center gap-3">
                                    <Sparkles size={20} fill="#7000FF" />
                                    AI Raqamli Portret (Dossier)
                                </h3>

                                {loadingDetails ? (
                                    <div className="flex items-center gap-4 text-[#7000FF]">
                                        <Loader2 className="animate-spin" />
                                        <span className="text-xs font-black uppercase tracking-widest">AI Tahlil qilinmoqda...</span>
                                    </div>
                                ) : customerInterests ? (
                                    <div className="space-y-10">
                                        {/* Activity Bars */}
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Sevimli Kategoriyalar</p>
                                            <div className="space-y-4">
                                                {Object.entries(customerInterests.categories || {}).map(([cat, count]: any) => (
                                                    <div key={cat}>
                                                        <div className="flex justify-between text-xs font-black uppercase italic mb-2">
                                                            <span>{cat}</span>
                                                            <span className="text-[#7000FF]">{count} marta</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#7000FF] to-[#BD00FF] rounded-full"
                                                                style={{ width: `${Math.min(100, count * 10)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recently Viewed Tags */}
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Eye size={12} /> Oxirgi ko'rilgan mahsulotlar
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {customerInterests.viewedProducts?.slice(-6).reverse().map((id: string) => (
                                                        <div key={id} className="bg-white px-4 py-2 rounded-2xl text-[10px] font-bold border border-[#7000FF]/5 hover:bg-black hover:text-white transition-colors">
                                                            {getProductName(id)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Clock size={12} /> Oxirgi faollik
                                                </p>
                                                <div className="text-sm font-black italic">
                                                    {customerInterests.lastInteraction ? new Date(customerInterests.lastInteraction).toLocaleString('uz-UZ') : "Aniq emas"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Mijoz haqida hali yetarli AI tahlil mavjud emas.</p>
                                    </div>
                                )}
                            </div>

                            {/* Sales Summary */}
                            <div className="grid grid-cols-2 gap-8 pb-10">
                                <div className="bg-gray-50 p-8 rounded-[40px] text-center border border-gray-100">
                                    <TrendingUp className="mx-auto mb-4 text-purple-500" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Jami Xarid</p>
                                    <p className="text-2xl font-black italic underline decoration-[#7000FF]/20 underline-offset-8">{selectedCustomer.totalSpent.toLocaleString()} $</p>
                                </div>
                                <div className="bg-gray-50 p-8 rounded-[40px] text-center border border-gray-100">
                                    <ShoppingCart className="mx-auto mb-4 text-blue-500" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Savatlar</p>
                                    <p className="text-2xl font-black italic">{selectedCustomer.totalOrders} ta</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
