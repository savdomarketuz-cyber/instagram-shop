import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Globe, Instagram, Send, Phone, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [shopData, setShopData] = useState({
        name: "Velari",
        phone: "+998 90 123 45 67",
        instagram: "",
        telegram: "",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from("settings")
                    .select("value")
                    .eq("id", "shop")
                    .single();
                
                if (error && error.code !== "PGRST116") throw error;
                if (data) {
                    setShopData(data.value as any);
                }
            } catch (error) {
                console.error("Fetch settings error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSaveShop = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("settings")
                .upsert({
                    id: "shop",
                    value: shopData
                });
            
            if (error) throw error;
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Saqlashda xatolik!");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-12 pb-20 max-w-4xl">
            <div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">Sozlamalar</h1>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Do'kon profili va asosiy ma'lumotlarni boshqarish</p>
            </div>

            {showSuccess && (
                <div className="fixed top-10 right-10 z-[100] bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-right duration-500 shadow-2xl">
                    <CheckCircle2 size={16} /> Muvaffaqiyatli saqlandi!
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* Shop Profile Section */}
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden p-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase">Do'kon Profili</h2>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Asosiy ma'lumotlar</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Do'kon nomi</label>
                            <input
                                type="text"
                                value={shopData.name}
                                onChange={e => setShopData({ ...shopData, name: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl px-6 py-4 font-bold outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Aloqa telefoni</label>
                            <div className="relative">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    value={shopData.phone}
                                    onChange={e => setShopData({ ...shopData, phone: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl pl-14 pr-6 py-4 font-bold outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Instagram (username)</label>
                                <div className="relative">
                                    <Instagram className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="text"
                                        value={shopData.instagram}
                                        onChange={e => setShopData({ ...shopData, instagram: e.target.value })}
                                        placeholder="user_name"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl pl-14 pr-6 py-4 font-bold outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-2 block">Telegram (username)</label>
                                <div className="relative">
                                    <Send className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        type="text"
                                        value={shopData.telegram}
                                        onChange={e => setShopData({ ...shopData, telegram: e.target.value })}
                                        placeholder="user_name"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-3xl pl-14 pr-6 py-4 font-bold outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveShop}
                            disabled={isSaving}
                            className="w-full mt-4 bg-black text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            O'zgarishlarni saqlash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
