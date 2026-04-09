"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Link as LinkIcon, Loader2, Search, Check } from "lucide-react";
import Image from "next/image";

interface Banner {
    id: string;
    title_uz: string;
    title_ru: string;
    subtitle_uz: string;
    subtitle_ru: string;
    imageUrl_uz: string;
    imageUrl_ru: string;
    blurDataURL_uz?: string;
    blurDataURL_ru?: string;
    linkType: "product" | "category" | "none";
    linkIds: string[];
    buttonText: string;
    active: boolean;
    order: number;
    tabName_uz?: string;
    tabName_ru?: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
}

interface Category {
    id: string;
    name: string;
}

import { uploadToYandexS3 } from "@/lib/yandex-s3";

export default function AdminBanners() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [globalHeight, setGlobalHeight] = useState(450); // Default desktop height
    const [globalRadius, setGlobalRadius] = useState(40); // Default corner radius

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, lang: "uz" | "ru") => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url, blurDataURL } = await uploadToYandexS3(file);
            setNewBanner(prev => ({
                ...prev,
                [lang === "uz" ? "imageUrl_uz" : "imageUrl_ru"]: url,
                [lang === "uz" ? "blurDataURL_uz" : "blurDataURL_ru"]: blurDataURL
            }));
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert("Rasm yuklashda xatolik: " + (error.message || "Noma'lum xato"));
        } finally {
            setIsUploading(false);
        }
    };

    // Form State
    const [newBanner, setNewBanner] = useState({
        title_uz: "",
        title_ru: "",
        subtitle_uz: "",
        subtitle_ru: "",
        imageUrl_uz: "",
        imageUrl_ru: "",
        blurDataURL_uz: "",
        blurDataURL_ru: "",
        linkType: "none" as "product" | "category" | "none",
        linkIds: [] as string[],
        buttonText: "Sotib olish",
        active: true,
        order: 0,
        tabName_uz: "",
        tabName_ru: ""
    });

    const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
    const [globalBanners, setGlobalBanners] = useState<Banner[]>([]);
    const [isGlobalSaving, setIsGlobalSaving] = useState(false);

    const fetchData = async () => {
        try {
            const [bannersRes, productsRes, catsRes, settingsRes] = await Promise.all([
                supabase.from("banners").select("*").order("order", { ascending: true }),
                supabase.from("products").select("id, name, price"),
                supabase.from("categories").select("id, name"),
                supabase.from("settings").select("value").eq("id", "banners").single()
            ]);

            if (bannersRes.error) throw bannersRes.error;
            if (productsRes.error) throw productsRes.error;
            if (catsRes.error) throw catsRes.error;

            setBanners(bannersRes.data.map(b => ({
                id: b.id,
                title_uz: b.title_uz,
                title_ru: b.title_ru,
                subtitle_uz: b.subtitle_uz,
                subtitle_ru: b.subtitle_ru,
                imageUrl_uz: b.image_url_uz,
                imageUrl_ru: b.image_url_ru,
                blurDataURL_uz: b.blur_data_url_uz,
                blurDataURL_ru: b.blur_data_url_ru,
                linkType: b.link_type,
                linkIds: b.link_ids || [],
                buttonText: b.button_text,
                active: b.active,
                order: b.order,
                tabName_uz: b.tab_name_uz,
                tabName_ru: b.tab_name_ru
            })) as Banner[]);

            setProducts(productsRes.data as Product[]);
            setCategories(catsRes.data as Category[]);

            if (settingsRes.data) {
                setGlobalHeight(settingsRes.data.value.desktopHeight || 450);
                setGlobalRadius(settingsRes.data.value.borderRadius || 40);
            }
        } catch (error) {
            console.error("Fetch banners data error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setNewBanner({
            title_uz: "",
            title_ru: "",
            subtitle_uz: "",
            subtitle_ru: "",
            imageUrl_uz: "",
            imageUrl_ru: "",
            blurDataURL_uz: "",
            blurDataURL_ru: "",
            linkType: "none",
            linkIds: [],
            buttonText: "Sotib olish",
            active: true,
            order: 0,
            tabName_uz: "",
            tabName_ru: ""
        });
        setEditId(null);
        setIsAdding(false);
    };

    const openEditModal = (banner: Banner) => {
        setNewBanner({
            title_uz: banner.title_uz || "",
            title_ru: banner.title_ru || "",
            subtitle_uz: banner.subtitle_uz || "",
            subtitle_ru: banner.subtitle_ru || "",
            imageUrl_uz: banner.imageUrl_uz || "",
            imageUrl_ru: banner.imageUrl_ru || "",
            blurDataURL_uz: banner.blurDataURL_uz || "",
            blurDataURL_ru: banner.blurDataURL_ru || "",
            linkType: banner.linkType,
            linkIds: banner.linkIds || [],
            buttonText: banner.buttonText,
            active: banner.active,
            order: banner.order,
            tabName_uz: banner.tabName_uz || "",
            tabName_ru: banner.tabName_ru || ""
        });
        setEditId(banner.id);
        setIsAdding(true);
    };

    const handleSave = async () => {
        if (!newBanner.imageUrl_uz && !newBanner.imageUrl_ru) {
            alert("Iltimos, kamida bitta rasm yuklang");
            return;
        }
        try {
            const payload = {
                title_uz: newBanner.title_uz,
                title_ru: newBanner.title_ru,
                subtitle_uz: newBanner.subtitle_uz,
                subtitle_ru: newBanner.subtitle_ru,
                image_url_uz: newBanner.imageUrl_uz,
                image_url_ru: newBanner.imageUrl_ru,
                blur_data_url_uz: newBanner.blurDataURL_uz,
                blur_data_url_ru: newBanner.blurDataURL_ru,
                link_type: newBanner.linkType,
                link_ids: newBanner.linkIds,
                button_text: newBanner.buttonText,
                active: newBanner.active,
                order: editId ? newBanner.order : banners.length,
                tab_name_uz: newBanner.tabName_uz,
                tab_name_ru: newBanner.tabName_ru
            };

            if (editId) {
                const { error } = await supabase.from("banners").update(payload).eq("id", editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("banners").insert([{
                    ...payload,
                    id: crypto.randomUUID()
                }]);
                if (error) throw error;
            }
            resetForm();
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Saqlashda xatolik yuz berdi");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirilsinmi?")) return;
        try {
            const { error } = await supabase.from("banners").delete().eq("id", id);
            if (error) throw error;
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const openGlobalModal = () => {
        setGlobalBanners([...banners]);
        setIsGlobalModalOpen(true);
    };

    const handleGlobalSave = async () => {
        setIsGlobalSaving(true);
        try {
            const bannerUpdates = globalBanners.map(gb => {
                return supabase.from("banners").update({
                    order: Number(gb.order),
                    tab_name_uz: gb.tabName_uz || "",
                    tab_name_ru: gb.tabName_ru || ""
                }).eq("id", gb.id);
            });

            const settingsUpdate = supabase.from("settings").upsert({
                id: "banners",
                value: {
                    desktopHeight: globalHeight,
                    borderRadius: globalRadius
                }
            });

            await Promise.all([...bannerUpdates, settingsUpdate]);
            setIsGlobalModalOpen(false);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Xatolik!");
        } finally {
            setIsGlobalSaving(false);
        }
    };

    const toggleLinkId = (id: string) => {
        setNewBanner(prev => ({
            ...prev,
            linkIds: prev.linkIds.includes(id)
                ? prev.linkIds.filter(li => li !== id)
                : [...prev.linkIds, id]
        }));
    };

    const filteredTargets = newBanner.linkType === "product"
        ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="animate-spin text-black" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4 italic">Bannerlar</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Asosiy sahifa reklamalari</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={openGlobalModal}
                        className="bg-gray-100 text-gray-500 hover:bg-black hover:text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all"
                    >
                        Umumiy sozlamalar
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsAdding(true); }}
                        className="bg-black text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Yangi Banner
                    </button>
                </div>
            </div>

            {/* Modal Overlay */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                                {editId ? "Bannerni Tahrirlash" : "Yangi Banner"}
                            </h2>
                            <button onClick={resetForm} className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Uzbek Content */}
                                <div className="space-y-6 p-6 bg-purple-50/30 rounded-[32px] border border-purple-100/50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7000FF] mb-2">Uzbek Interfeysi</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Sarlavha (UZ)</label>
                                            <input
                                                type="text"
                                                value={newBanner.title_uz}
                                                onChange={e => setNewBanner({ ...newBanner, title_uz: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Sarlavha (UZ)"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Subtitle (UZ)</label>
                                            <input
                                                type="text"
                                                value={newBanner.subtitle_uz}
                                                onChange={e => setNewBanner({ ...newBanner, subtitle_uz: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Subtitle (UZ)"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Tab nomi (UZ)</label>
                                            <input
                                                type="text"
                                                value={newBanner.tabName_uz}
                                                onChange={e => setNewBanner({ ...newBanner, tabName_uz: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Masalan: Siz uchun"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 text-center block">Banner Rasmi (UZ)</label>
                                            {newBanner.imageUrl_uz ? (
                                                <div className="relative group rounded-3xl overflow-hidden aspect-video border-4 border-white shadow-xl">
                                                    <img src={newBanner.imageUrl_uz} alt="Preview UZ" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setNewBanner({ ...newBanner, imageUrl_uz: "" })}
                                                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative group h-[180px]">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleFileUpload(e, "uz")}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        accept="image/*"
                                                        disabled={isUploading}
                                                    />
                                                    <div className="w-full h-full bg-white/50 border-4 border-dashed border-gray-100 rounded-[30px] flex flex-col items-center justify-center gap-4 transition-all hover:border-[#7000FF] hover:bg-white">
                                                        {isUploading ? (
                                                            <Loader2 className="animate-spin text-black" size={32} />
                                                        ) : (
                                                            <ImageIcon size={32} className="text-gray-300" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Russian Content */}
                                <div className="space-y-6 p-6 bg-blue-50/30 rounded-[32px] border border-blue-100/50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Russian Interfeysi</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Название (RU)</label>
                                            <input
                                                type="text"
                                                value={newBanner.title_ru}
                                                onChange={e => setNewBanner({ ...newBanner, title_ru: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Sarlavha (RU)"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Подзаголовок (RU)</label>
                                            <input
                                                type="text"
                                                value={newBanner.subtitle_ru}
                                                onChange={e => setNewBanner({ ...newBanner, subtitle_ru: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Subtitle (RU)"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Название таба (RU)</label>
                                            <input
                                                type="text"
                                                value={newBanner.tabName_ru}
                                                onChange={e => setNewBanner({ ...newBanner, tabName_ru: e.target.value })}
                                                className="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm"
                                                placeholder="Tavsiya etc."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 text-center block">Banner Rasmi (RU)</label>
                                            {newBanner.imageUrl_ru ? (
                                                <div className="relative group rounded-3xl overflow-hidden aspect-video border-4 border-white shadow-xl">
                                                    <img src={newBanner.imageUrl_ru} alt="Preview RU" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setNewBanner({ ...newBanner, imageUrl_ru: "" })}
                                                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative group h-[180px]">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleFileUpload(e, "ru")}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        accept="image/*"
                                                        disabled={isUploading}
                                                    />
                                                    <div className="w-full h-full bg-white/50 border-4 border-dashed border-gray-100 rounded-[30px] flex flex-col items-center justify-center gap-4 transition-all hover:border-blue-600 hover:bg-white">
                                                        {isUploading ? (
                                                            <Loader2 className="animate-spin text-black" size={32} />
                                                        ) : (
                                                            <ImageIcon size={32} className="text-gray-300" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Bog'lash turi (Umumiy)</label>
                                <select
                                    value={newBanner.linkType}
                                    onChange={e => setNewBanner({ ...newBanner, linkType: e.target.value as any, linkIds: [] })}
                                    className="w-full bg-gray-50 border-none rounded-[24px] py-5 px-8 font-black uppercase tracking-widest text-[10px] appearance-none cursor-pointer hover:bg-gray-100 transition-all shadow-sm"
                                >
                                    <option value="none">Hech narsa</option>
                                    <option value="product">Mahsulotlar</option>
                                    <option value="category">Kategoriyalar</option>
                                </select>
                            </div>

                            {newBanner.linkType !== "none" && (
                                <div className="space-y-4 p-8 bg-gray-50 rounded-[40px] animate-in fade-in slide-in-from-top-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-6 px-4">
                                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
                                            <Search size={18} className="text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Qidirish..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 font-bold text-sm"
                                            />
                                        </div>
                                        <div className="bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                            {newBanner.linkIds.length} TA TANLANDI
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-4 no-scrollbar">
                                        {filteredTargets.map((target) => (
                                            <button
                                                key={target.id}
                                                onClick={() => toggleLinkId(target.id)}
                                                className={`flex items-center gap-4 p-5 rounded-[24px] transition-all border-2 text-left ${newBanner.linkIds.includes(target.id)
                                                    ? "bg-black border-black text-white shadow-2xl scale-[1.02]"
                                                    : "bg-white border-transparent hover:border-gray-200 text-gray-500 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newBanner.linkIds.includes(target.id) ? "bg-white border-white" : "border-gray-200"
                                                    }`}>
                                                    {newBanner.linkIds.includes(target.id) && <Check size={16} className="text-black stroke-[4]" />}
                                                </div>
                                                <span className="text-xs font-black tracking-tight line-clamp-2 leading-tight">{target.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                className="w-full bg-black text-white py-6 rounded-[32px] font-black uppercase tracking-widest shadow-2xl hover:shadow-black/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                <Save size={24} /> {editId ? "Yangilash" : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Settings Modal */}
            {isGlobalModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-black">
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Umumiy sozlamalar</h2>
                            <button onClick={() => setIsGlobalModalOpen(false)} className="p-3 bg-gray-50 rounded-2xl">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-10 p-8 bg-black text-white rounded-[32px] space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Global Banner Balandligi</label>
                                    <span className="text-xl font-black italic">{globalHeight}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="800"
                                    value={globalHeight}
                                    onChange={(e) => setGlobalHeight(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                                <div className="flex justify-between text-[8px] font-black opacity-40 uppercase tracking-widest">
                                    <span>100px (Yupqa)</span>
                                    <span>800px (Katta)</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Burchak Yumshoqligi (Radius)</label>
                                    <span className="text-xl font-black italic">{globalRadius}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={globalRadius}
                                    onChange={(e) => setGlobalRadius(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                                <div className="flex justify-between text-[8px] font-black opacity-40 uppercase tracking-widest">
                                    <span>0px (O'tkir)</span>
                                    <span>100px (Dumaloq)</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 no-scrollbar mb-8">
                            {globalBanners.map((gb, idx) => (
                                <div key={gb.id} className="flex items-center gap-6 p-6 bg-gray-50 rounded-[30px] border border-gray-100">
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Tab nomi (UZ)</label>
                                            <input
                                                type="text"
                                                value={gb.tabName_uz || ""}
                                                onChange={e => {
                                                    const newArr = [...globalBanners];
                                                    newArr[idx].tabName_uz = e.target.value;
                                                    setGlobalBanners(newArr);
                                                }}
                                                placeholder="Siz uchun"
                                                className="w-full bg-white rounded-xl py-2 px-4 shadow-sm font-bold text-sm outline-none text-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Tab nomi (RU)</label>
                                            <input
                                                type="text"
                                                value={gb.tabName_ru || ""}
                                                onChange={e => {
                                                    const newArr = [...globalBanners];
                                                    newArr[idx].tabName_ru = e.target.value;
                                                    setGlobalBanners(newArr);
                                                }}
                                                placeholder="Для вас"
                                                className="w-full bg-white rounded-xl py-2 px-4 shadow-sm font-bold text-sm outline-none text-black"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-16 space-y-1">
                                        <label className="text-[8px] font-black uppercase text-gray-400 ml-2">Tartib</label>
                                        <input
                                            type="number"
                                            value={gb.order}
                                            onChange={e => {
                                                const newArr = [...globalBanners];
                                                newArr[idx].order = Number(e.target.value);
                                                setGlobalBanners(newArr);
                                            }}
                                            className="w-full bg-white rounded-xl py-2 px-4 shadow-sm font-bold text-sm outline-none text-black"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleGlobalSave}
                            disabled={isGlobalSaving}
                            className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-all"
                        >
                            {isGlobalSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            O'zgarishlarni saqlash
                        </button>
                    </div>
                </div>
            )}

            {/* Banners List */}
            <div className="grid grid-cols-1 gap-8">
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="bg-white rounded-[48px] overflow-hidden border border-gray-100 shadow-xl flex flex-col lg:flex-row relative group hover:shadow-2xl transition-all duration-500"
                    >
                        {/* Dual Preview Screens */}
                        <div className="w-full lg:w-[450px] flex bg-gray-50 h-[300px] lg:h-auto border-r border-gray-100">
                            <div className="flex-1 relative group/uz overflow-hidden">
                                <img src={banner.imageUrl_uz} alt="UZ" className="w-full h-full object-cover grayscale-[0.5] group-hover/uz:grayscale-0 transition-all duration-700" />
                                <div className="absolute top-6 left-6 bg-[#7000FF] text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    UZBEK
                                </div>
                            </div>
                            <div className="flex-1 relative group/ru overflow-hidden border-l border-white/20">
                                <img src={banner.imageUrl_ru} alt="RU" className="w-full h-full object-cover grayscale-[0.5] group-hover/ru:grayscale-0 transition-all duration-700" />
                                <div className="absolute top-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    RUSSIAN
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-12 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-10">
                                    <div className="space-y-6 flex-1">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black italic tracking-tighter text-[#7000FF] uppercase line-clamp-1">{banner.title_uz}</h3>
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{banner.subtitle_uz}</p>
                                                <span className="inline-block bg-purple-50 text-[#7000FF] px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-100">TAB: {banner.tabName_uz}</span>
                                            </div>
                                            <div className="space-y-2 border-l border-gray-100 pl-8">
                                                <h3 className="text-2xl font-black italic tracking-tighter text-blue-600 uppercase line-clamp-1">{banner.title_ru}</h3>
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{banner.subtitle_ru}</p>
                                                <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100">TAB: {banner.tabName_ru}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 ml-10">
                                        <button
                                            onClick={() => openEditModal(banner)}
                                            className="p-4 bg-gray-50 text-gray-400 hover:text-black hover:bg-white border hover:border-black rounded-3xl transition-all shadow-sm"
                                        >
                                            <Edit2 size={24} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="p-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-3xl transition-all shadow-sm"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-gray-50">
                                    <div className="flex items-center gap-4 bg-black text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                                        <LinkIcon size={18} className="text-blue-400" />
                                        {banner.linkType === "product" ? (
                                            <span>{banner.linkIds?.length || 0} TA MAHSULOTGA BOG'LANGAN</span>
                                        ) : banner.linkType === "category" ? (
                                            <span>{banner.linkIds?.length || 0} TA KATEGORIYAGA BOG'LANGAN</span>
                                        ) : (
                                            <span className="opacity-40 italic">BOG'LANMAGAN</span>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border border-gray-100">
                                        Tartib: #{banner.order + 1}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="py-32 text-center bg-gray-50/50 rounded-[50px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                        <ImageIcon size={64} className="text-gray-100 mb-4" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-xs">Bannerlar mavjud emas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
