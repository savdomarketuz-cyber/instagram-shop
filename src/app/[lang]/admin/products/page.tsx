"use client";

import { useStore } from "@/store/store";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { mapProduct } from "@/lib/mappers";
import {
    LayoutGrid,
    List,
    Plus,
    Search,
    Trash2,
    Edit,
    ChevronDown,
    Loader2,
    Package,
    AlertCircle,
    X,
    Image as ImageIcon,
    FileSpreadsheet,
    Download,
    ChevronLeft,
    ChevronRight,
    Video,
    DollarSign,
    Sparkles
} from "lucide-react";

interface Category {
    id: string;
    label: string;
}

interface DBCategory {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    parent_id?: string;
    is_deleted?: boolean;
}

interface Product {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    category: string;
    category_uz?: string;
    category_ru?: string;
    stock: number;
    image: string; // Primary thumbnail
    images: string[]; // All images array
    description: string;
    description_uz?: string;
    description_ru?: string;
    tag?: string;
    sku: string;
    groupId?: string;
    colorName?: string;
    sales?: number;
    isDeleted?: boolean;
    article?: string;
    isOriginal?: boolean;
    // UI temporary field
    images_string?: string;
    brand?: string;
    height?: string;
    width?: string;
    length?: string;
    weight?: string;
    barcode?: string;
    videoUrl?: string;
    cashback_type?: "global" | "percent" | "fixed";
    cashback_value?: number;
    model?: string;
    image_metadata?: Record<string, { alt_uz?: string; alt_ru?: string; blurDataURL?: string }>;
}

import { uploadToYandexS3, uploadFromUrlToYandexS3 } from "@/lib/yandex-s3";

export default function AdminProducts() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [importLog, setImportLog] = useState<string[]>([]);
    const [rawCategories, setRawCategories] = useState<DBCategory[]>([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [categoryLabels, setCategoryLabels] = useState<{ [key: string]: string }>({});
    const [productSelectionPath, setProductSelectionPath] = useState<string[]>([]);
    const [aiStatus, setAiStatus] = useState<Record<string, { processed: number, total: number, active: boolean }>>({});
    const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
    const [brandLabels, setBrandLabels] = useState<{ [key: string]: string }>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url, blurDataURL, lowResUrl } = await uploadToYandexS3(file);
            
            if (isGallery) {
                setNewProduct(prev => ({
                    ...prev,
                    images: [...(prev.images || []), url],
                    images_string: prev.images_string ? `${prev.images_string};${url}` : url,
                    image_metadata: {
                        ...(prev.image_metadata || {}),
                        [url]: {
                            ...(prev.image_metadata?.[url] || {}),
                            blurDataURL,
                            lowResUrl
                        }
                    }

                }));
            } else {
                setNewProduct(prev => ({
                    ...prev,
                    image: url,
                    images: prev.images?.length ? prev.images : [url],
                    image_metadata: {
                        ...(prev.image_metadata || {}),
                        [url]: {
                            ...(prev.image_metadata?.[url] || {}),
                            blurDataURL,
                            lowResUrl
                        }

                    }
                }));
            }
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert("Rasm yuklashda xatolik: " + (error.message || "Noma'lum xato"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url } = await uploadToYandexS3(file);
            setNewProduct(prev => ({
                ...prev,
                videoUrl: url
            }));
        } catch (error: any) {
            console.error("Video upload failed:", error);
            alert("Video yuklashda xatolik: " + (error.message || "Noma'lum xato"));
        } finally {
            setIsUploading(false);
        }
    };

    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        name: "",
        name_uz: "",
        name_ru: "",
        price: 0,
        oldPrice: 0,
        category: "",
        image: "",
        images: [],
        description: "",
        description_uz: "",
        description_ru: "",
        tag: "",
        sku: "",
        groupId: "",
        colorName: "",
        article: "",
        isDeleted: false,
        isOriginal: false,
        images_string: "",
        brand: "",
        height: "",
        width: "",
        length: "",
        weight: "",
        barcode: "",
        videoUrl: "",
        cashback_type: "global",
        cashback_value: 0,
        model: ""
    });

    useEffect(() => {
        fetchData(1, true);
    }, []);

    const getPathForCategory = (catId: string): string[] => {
        const path: string[] = [];
        let curr = rawCategories.find((c: DBCategory) => c.id === catId);
        while (curr) {
            path.unshift(curr.id);
            const pId = curr.parent_id;
            curr = pId && pId !== "none" ? rawCategories.find((p: DBCategory) => p.id === pId) : undefined;
        }
        return path;
    };

    const fetchData = async (page = 1, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            console.log(`Fetching products (page ${page})...`);
            
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from("products")
                .select("*", { count: "exact" });

            // Tab filter (Trash vs Active)
            query = query.eq("is_deleted", activeTab === "trash");

            // Apply search filter on server side if possible
            if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`);
            }

            const { data: pData, count, error: pError } = await query
                .order("created_at", { ascending: false })
                .range(from, to);
            
            if (pError) throw pError;

            if (pData) {
                setProducts(pData.map(mapProduct) as any);
                if (count !== null) setTotalCount(count);
            }

            // Categories usually aren't as many, but if you have > 1000, we'll need to paginate them too later
            const { data: allCats, error: cError } = await supabase.from("categories").select("*");
            if (cError) throw cError;
            if (!allCats) return;
            setRawCategories(allCats);

            const activeCats = allCats.filter((cat: any) => {
                if (cat.is_deleted) return false;
                const pId = cat.parent_id;
                if (pId && pId !== "none") {
                    const parent = allCats.find((p: any) => p.id === pId);
                    if (!parent || parent.is_deleted) return false;
                }
                return true;
            });

            const getRecursiveLabel = (cat: DBCategory): string => {
                const pId = cat.parent_id;
                if (pId && pId !== "none") {
                    const parent = allCats.find((p: any) => p.id === pId);
                    if (parent) {
                        return `${getRecursiveLabel(parent)} > ${cat.name}`;
                    }
                }
                return cat.name;
            };

            const cData = activeCats.map((cat: any) => ({
                id: cat.id,
                label: getRecursiveLabel(cat)
            }));

            const labelsMap: { [key: string]: string } = {};
            cData.forEach(c => { labelsMap[c.id] = c.label; });
            setCategoryLabels(labelsMap);

            setCategories(cData);

            // Fetch Brands
            const { data: bList } = await supabase
                .from("brands")
                .select("*")
                .eq("is_deleted", false)
                .order("name");
            
            if (bList) {
                setBrands(bList);
                const bLabels: { [key: string]: string } = {};
                bList.forEach(b => { bLabels[b.id] = b.name; });
                setBrandLabels(bLabels);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const generateArticle = () => {
        const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
        let result = "ART-";
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const downloadExcelTemplate = async () => {
        // Dynamically load XLSX from CDN
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
        script.onload = () => {
            const XLSX = (window as any).XLSX;

            // Sheet 1: Template Headers
            const data1 = [[
                "Nomi (UZ)*", "Nomi (RU)*", "Narxi*", "Eski Narxi", "Kategoriya ID*", "Rasm URL 1*", "Boshqa Rasmlar (nuqta-vergul bilan ajratilgan)", "Tavsif (UZ)", "Tavsif (RU)", "SKU", "Guruh ID", "Rang", "Brend ID", "Bar-kod", "Balandlik", "Kenglik", "Uzunlik", "Og'irlik (gr)", "Video URL", "Model"
            ]];
            const ws1 = XLSX.utils.aoa_to_sheet(data1);

            // Sheet 2: Category Map
            const data2 = [["ID", "Nomi (Ierarxiya)"]];
            categories.forEach(c => {
                data2.push([c.id, c.label]);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(data2);

            // Sheet 3: Brand Map
            const data3 = [["ID", "Brend Nomi"]];
            brands.forEach(b => {
                data3.push([b.id, b.name]);
            });
            const ws3 = XLSX.utils.aoa_to_sheet(data3);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws1, "Mahsulotlar");
            XLSX.utils.book_append_sheet(wb, ws2, "Kategoriyalar ID");
            XLSX.utils.book_append_sheet(wb, ws3, "Brendlar ID");

            XLSX.writeFile(wb, "mahsulotlar_shabloni.xlsx");
        };
        document.head.appendChild(script);
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportLog(["Fayl o'qilmoqda..."]);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                if (!(window as any).XLSX) {
                    await new Promise((resolve) => {
                        const script = document.createElement("script");
                        script.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
                        script.onload = resolve;
                        document.head.appendChild(script);
                    });
                }
                const XLSX = (window as any).XLSX;
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length < 2) {
                    throw new Error("Fayl bo'sh yoki sarlavhalar noto'g'ri");
                }

                const rows = data.slice(1); // Skip headers
                const productsToInsert: any[] = [];
                let count = 0;

                for (const row of rows) {
                    if (!row[0]) continue; // Skip empty rows

                    const rawImages = row[6] ? String(row[6]).split(';').map(s => s.trim()).filter(s => s !== "") : [String(row[5])];

                    setImportLog(prev => [...prev, `${row[0]} rasmlari yuklanmoqda...`]);

                    const proxiedResults = await Promise.all(
                        rawImages.map(url => uploadFromUrlToYandexS3(url))
                    );

                    const proxiedImages = proxiedResults.map(r => r.url);
                    const localMeta: any = {};
                    proxiedResults.forEach(r => {
                        if (r.blurDataURL) {
                            localMeta[r.url] = { blurDataURL: r.blurDataURL };
                        }
                    });

                    const productData = {
                        id: crypto.randomUUID(),
                        name: String(row[0]),
                        name_uz: String(row[0]),
                        name_ru: String(row[1] || row[0]),
                        price: Number(row[2]) || 0,
                        old_price: Number(row[3]) || 0,
                        category_id: String(row[4]),
                        image: proxiedImages[0] || "",
                        images: proxiedImages,
                        image_metadata: localMeta,
                        description: String(row[7] || ""),
                        description_uz: String(row[7] || ""),
                        description_ru: String(row[8] || ""),
                        sku: String(row[9] || ""),
                        group_id: String(row[10] || ""),
                        color_name: String(row[11] || ""),
                        brand_id: String(row[12] || ""),
                        article: generateArticle(),
                        barcode: String(row[13] || ""),
                        height: String(row[14] || ""),
                        width: String(row[15] || ""),
                        length: String(row[16] || ""),
                        weight: String(row[17] || ""),
                        video_url: String(row[18] || ""),
                        model: String(row[19] || ""),
                        is_deleted: false,
                        sales: 0
                    };

                    productsToInsert.push(productData);
                    count++;
                }

                if (productsToInsert.length > 0) {
                    const { error } = await supabase.from("products").insert(productsToInsert);
                    if (error) throw error;
                    
                    // Notify Search Engines in Bulk for the new products
                    const newIds = productsToInsert.map(p => p.id);
                    fetch('/api/admin/notify-search', {
                        method: 'POST',
                        body: JSON.stringify({ productIds: newIds })
                    }).catch(err => console.error("Bulk search notification failed:", err));

                    setImportLog(prev => [...prev, `${count} ta mahsulot muvaffaqiyatli yuklandi!`]);
                    fetchData();
                } else {
                    setImportLog(prev => [...prev, "Yuklash uchun mahsulot topilmadi."]);
                }
            } catch (error: any) {
                console.error("Excel import error:", error);
                setImportLog([`Xatolik: ${error.message}`]);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleAiVision = async () => {
        const imageUrl = newProduct.image || (newProduct.images && newProduct.images[0]);
        if (!imageUrl) {
            alert("AI tahlili uchun kamida bitta rasm yuklang!");
            return;
        }

        setIsActionLoading(true);
        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate_from_image",
                    context: { image: imageUrl }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const res = data.result;
            if (res) {
                setNewProduct(prev => ({
                    ...prev,
                    name_uz: res.name_uz || prev.name_uz,
                    name_ru: res.name_ru || prev.name_ru,
                    name: res.name_uz || prev.name,
                    description_uz: res.description_uz || prev.description_uz,
                    description_ru: res.description_ru || prev.description_ru,
                    brand: res.brand || prev.brand
                }));
                alert("AI tahlili muvaffaqiyatli yakunlandi!");
            }
        } catch (error: any) {
            console.error("AI Vision error:", error);
            alert("AI xatoligi: " + error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const triggerAiAnalysis = async (productId: string) => {
        if (!productId) return;
        
        try {
            setAiStatus(prev => ({ ...prev, [productId]: { processed: 0, total: 0, active: true } }));
            
            let remaining = 1;
            let retryCount = 0;
            const MAX_RETRIES = 3;

            while (remaining > 0) {
                const response = await fetch('/api/admin/ai/analyze-images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                    keepalive: true
                });

                if (response.status === 429) {
                    console.warn("AI Rate limit hit, waiting 10s...");
                    await new Promise(r => setTimeout(r, 10000));
                    continue; 
                }

                if (!response.ok) {
                    retryCount++;
                    if (retryCount <= MAX_RETRIES) {
                        console.log(`Retry attempt ${retryCount} for product ${productId}...`);
                        await new Promise(r => setTimeout(r, 2000 * retryCount));
                        continue;
                    }
                    console.error("AI Analysis failed after max retries.");
                    break;
                }

                const data = await response.json();
                if (!data.success) {
                    console.error("Single image AI fail:", data.error);
                    break;
                }
                
                retryCount = 0; 
                remaining = data.remaining || 0;
                setAiStatus(prev => ({
                    ...prev,
                    [productId]: { 
                        processed: data.total - (data.remaining || 0), 
                        total: data.total, 
                        active: (data.remaining || 0) > 0 
                    }
                }));

                if (remaining === 0) break;
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.error("AI Auto Trigger failed", err);
        } finally {
            setAiStatus(prev => ({ ...prev, [productId]: { ...prev[productId], active: false } }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Proxy external images to S3
            const imagesArrayRaw = newProduct.images_string
                ? newProduct.images_string.split(';').map(u => u.trim()).filter(u => u !== "").slice(0, 30)
                : (newProduct.image ? [newProduct.image] : []);

            const proxiedResults = await Promise.all(
                imagesArrayRaw.map(url => uploadFromUrlToYandexS3(url))
            );

            const imagesArray = proxiedResults.map(r => r.url);
            
            // Merge blurDataURLs into existing metadata
            const updatedMeta = { ...(newProduct.image_metadata || {}) };
            proxiedResults.forEach(r => {
                if (r.blurDataURL) {
                    updatedMeta[r.url] = {
                        ...updatedMeta[r.url],
                        blurDataURL: r.blurDataURL
                    };
                }
            });

            const finalData: any = {
                name: newProduct.name,
                name_uz: newProduct.name_uz,
                name_ru: newProduct.name_ru,
                image: imagesArray[0] || "",
                images: imagesArray,
                image_metadata: updatedMeta,
                price: Number(newProduct.price),
                old_price: newProduct.oldPrice ? Number(newProduct.oldPrice) : 0,
                stock: newProduct.stock ?? 0,
                category_id: newProduct.category,
                description: newProduct.description,
                description_uz: newProduct.description_uz,
                description_ru: newProduct.description_ru,
                sku: newProduct.sku?.trim() || "",
                group_id: newProduct.groupId?.trim() || "",
                color_name: newProduct.colorName?.trim() || "",
                brand_id: newProduct.brand?.trim() || "",
                height: newProduct.height?.trim() || "",
                width: newProduct.width?.trim() || "",
                length: newProduct.length?.trim() || "",
                weight: newProduct.weight?.trim() || "",
                barcode: newProduct.barcode?.trim() || "",
                video_url: newProduct.videoUrl?.trim() || "",
                article: newProduct.article || generateArticle(),
                is_deleted: newProduct.isDeleted || false,
                is_original: newProduct.isOriginal || false,
                cashback_type: newProduct.cashback_type || 'global',
                cashback_value: newProduct.cashback_value || 0,
                model: newProduct.model || ""
            };

            let finalId = newProduct.id;
            if (newProduct.id) {
                const { error } = await supabase.from("products").update(finalData).eq("id", newProduct.id);
                if (error) throw error;
            } else {
                finalId = crypto.randomUUID();
                const { error } = await supabase.from("products").insert([{
                    ...finalData,
                    id: finalId,
                    sales: 0
                }]);
                if (error) throw error;
            }

            // Trigger Recursive AI Background Worker for Image SEO
            if (finalId) {
                triggerAiAnalysis(finalId).catch(err => console.error("Auto AI trigger failed:", err));
                fetch('/api/admin/notify-search', {
                    method: 'POST',
                    body: JSON.stringify({ productId: finalId })
                }).catch(err => console.error("Search notification failed:", err));
            }

            setIsModalOpen(false);
            setProductSelectionPath([]);
            setNewProduct({ name: "", name_uz: "", name_ru: "", price: 0, oldPrice: 0, category: "", image: "", images: [], description: "", description_uz: "", description_ru: "", tag: "", sku: "", groupId: "", colorName: "", article: "", isDeleted: false, isOriginal: false, images_string: "", brand: "", height: "", width: "", length: "", weight: "", barcode: "", videoUrl: "", cashback_type: "global", cashback_value: 0, model: "" });
            fetchData();
        } catch (error) {
            console.error("Error saving product:", error);
        } finally {
            setIsSaving(false);
        }
    };
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0 || isBulkActionLoading) return;
        const confirmMsg = activeTab === "active"
            ? `${selectedIds.length} ta mahsulotni savatga (Trash) olib o'tmoqchimisiz?`
            : `${selectedIds.length} ta mahsulotni butunlay o'chirib yubormoqchimisiz?`;

        if (!window.confirm(confirmMsg)) return;

        setIsBulkActionLoading(true);
        try {
            if (activeTab === "active") {
                const { error } = await supabase
                    .from("products")
                    .update({ is_deleted: true })
                    .in("id", selectedIds);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("products")
                    .delete()
                    .in("id", selectedIds);
                if (error) throw error;
            }
            setSelectedIds([]);
            await fetchData(false);
        } catch (error: any) {
            console.error("Bulk delete error:", error);
            alert("Xatolik: " + error.message);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkProxyImages = async () => {
        if (selectedIds.length === 0 || isBulkActionLoading) return;
        if (!window.confirm(`${selectedIds.length} ta mahsulot rasmlarini bizning serverga ko'chirmoqchimisiz? (Bu biroz vaqt olishi mumkin)`)) return;

        setIsBulkActionLoading(true);
        try {
            for (const id of selectedIds) {
                const p = products.find(prod => prod.id === id);
                if (!p) continue;

                const imagesArrayRaw = p.images?.length ? p.images : (p.image ? [p.image] : []);
                const proxiedImages = await Promise.all(
                    imagesArrayRaw.map(url => uploadFromUrlToYandexS3(url))
                );

                await supabase.from("products").update({
                    image: proxiedImages[0] || "",
                    images: proxiedImages
                }).eq("id", id);
            }
            setSelectedIds([]);
            await fetchData(false);
            alert("Muvaffaqiyatli yakunlandi!");
        } catch (error: any) {
            console.error("Bulk proxy error:", error);
            alert("Xatolik: " + error.message);
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const moveToTrash = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!id || isActionLoading) return;

        try {
            if (window.confirm("Mahsulotni savatga (Trash) olib o'tmoqchimisiz?")) {
                setIsActionLoading(true);
                await supabase.from("products").update({ is_deleted: true }).eq("id", id);
                await fetchData(false);
            }
        } catch (error: any) {
            console.error("Error moving to trash:", error);
            alert("Xatolik (Trash): " + error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const restoreProduct = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!id || isActionLoading) return;

        try {
            if (window.confirm("Mahsulotni tiklamoqchimisiz?")) {
                setIsActionLoading(true);
                await supabase.from("products").update({ is_deleted: false }).eq("id", id);
                await fetchData(false);
            }
        } catch (error: any) {
            console.error("Error restoring product:", error);
            alert("Xatolik (Tiklash): " + error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReindexAll = async () => {
        if (!window.confirm("Barcha mahsulotlarni qidiruv tizimlariga qayta yubormoqchimisiz?")) return;
        setIsActionLoading(true);
        try {
            const { data } = await supabase.from("products").select("id").eq("is_deleted", false);
            if (!data) return;
            const ids = data.map(p => p.id);
            // Process in chunks of 100 to avoid timeout
            for (let i = 0; i < ids.length; i += 100) {
                const chunk = ids.slice(i, i + 100);
                await fetch('/api/admin/notify-search', {
                    method: 'POST',
                    body: JSON.stringify({ productIds: chunk })
                });
            }
            alert("Barcha mahsulotlar indeksatsiyaga yuborildi!");
        } catch (error) {
            console.error("Reindex All failed:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const deletePermanent = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!id || isActionLoading) return;

        try {
            if (window.confirm("DIQQAT! Mahsulot butunlay o'chiriladi. Ushbu amalni qaytarib bo'lmaydi. Rozimisiz?")) {
                setIsActionLoading(true);
                await supabase.from("products").delete().eq("id", id);
                await fetchData(false);
            }
        } catch (error: any) {
            console.error("Error deleting permanently:", error);
            alert("Xatolik (O'chirish): " + error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Fetch data when page, search or tab changes
    useEffect(() => {
        fetchData(currentPage, false);
    }, [currentPage, activeTab, itemsPerPage]);

    // Reset to page 1 and fetch when search term changes
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                fetchData(1, false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(paginatedProducts.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    return (
        <div className="p-8 text-black">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Mahsulotlar boshqaruvi</h1>
                    <p className="text-gray-400 text-sm font-medium">Barcha mahsulotlarni ko'rish, qo'shish va tahrirlash</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                        <button
                            onClick={() => setActiveTab("active")}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}
                        >
                            Barchasi ({products.filter(p => !p.isDeleted).length})
                        </button>
                        <button
                            onClick={() => setActiveTab("trash")}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "trash" ? "bg-red-500 text-white shadow-lg" : "text-gray-400 hover:text-red-500"}`}
                        >
                            <Trash2 size={14} />
                            Trash ({products.filter(p => p.isDeleted).length})
                        </button>
                    </div>
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="bg-green-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-green-600 transition-all shadow-xl active:scale-95"
                    >
                        <FileSpreadsheet size={20} />
                        Excel Import
                    </button>
                    <button
                        onClick={handleReindexAll}
                        disabled={isActionLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-900/20"
                    >
                        {isActionLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        Indekslash
                    </button>
                    <button
                        onClick={() => {
                            setNewProduct({ name: "", name_uz: "", name_ru: "", price: 0, oldPrice: 0, category: "", image: "", images: [], description: "", description_uz: "", description_ru: "", tag: "", sku: "", groupId: "", colorName: "", article: "", isDeleted: false, isOriginal: false, images_string: "", brand: "", height: "", width: "", length: "", weight: "", barcode: "", videoUrl: "", model: "" });
                            setProductSelectionPath([]);
                            setIsModalOpen(true);
                        }}
                        className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-gray-900 transition-all shadow-xl active:scale-95"
                    >
                        <Plus size={20} />
                        Yangi mahsulot
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 mb-6 bg-black text-white p-4 rounded-[32px] animate-in slide-in-from-top-4 duration-300 shadow-2xl">
                    <span className="ml-4 font-black uppercase tracking-widest text-[10px]">{selectedIds.length} ta tanlandi</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                    <div className="flex items-center gap-3">
                        {activeTab === "active" && (
                            <button
                                onClick={handleBulkProxyImages}
                                disabled={isBulkActionLoading}
                                className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isBulkActionLoading ? <Loader2 className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                                Rasmlarni ko'chirish
                            </button>
                        )}
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkActionLoading}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isBulkActionLoading ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                            {activeTab === "active" ? "Savatchaga" : "O'chirish"}
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Nomi yoki kategoriyasi bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-black outline-none shadow-sm transition-all"
                    />
                </div>
                <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                    <button
                        onClick={() => setView("grid")}
                        className={`p-3 rounded-xl transition-all ${view === "grid" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={`p-3 rounded-xl transition-all ${view === "list" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="font-black uppercase tracking-widest text-xs">Yuklanmoqda...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400 border-2 border-dashed border-gray-100 rounded-[40px]">
                    <AlertCircle className="mb-4" size={48} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-xs">Mahsulotlar topilmadi</p>
                </div>
            ) : (
                <>
                    {/* Select All Bar */}
                    <div className="flex items-center gap-4 mb-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                        <div className="flex items-center gap-3 ml-4">
                            <input
                                type="checkbox"
                                checked={products.length > 0 && products.every(p => selectedIds.includes(p.id))}
                                onChange={handleSelectAll}
                                className="w-6 h-6 rounded-lg border-2 border-gray-200 checked:bg-black checked:border-black transition-all cursor-pointer"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Barchasini tanlash</span>
                        </div>
                    </div>

                    {view === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {products.map((p) => (
                                <div key={p.id} className={`bg-white rounded-[40px] overflow-hidden group border border-gray-50 shadow-sm hover:shadow-2xl transition-all duration-500 text-black relative ${selectedIds.includes(p.id) ? 'ring-2 ring-black' : ''}`}>
                                    <div className="absolute top-4 left-4 z-40">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => {
                                                setSelectedIds(prev =>
                                                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                );
                                            }}
                                            className="w-6 h-6 rounded-lg border-2 border-gray-200 checked:bg-black checked:border-black transition-all cursor-pointer"
                                        />
                                    </div>
                                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                                        <Image
                                            src={(p.image && (p.image.startsWith('http') || p.image.startsWith('/'))) ? p.image : "/placeholder.png"}
                                            alt={p.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            unoptimized
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute top-4 right-4 flex flex-col gap-3 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                            {activeTab === "active" ? (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const imagesStr = p.images ? p.images.join('; ') : p.image;
                                                            setNewProduct({ ...p, images_string: imagesStr });
                                                            setProductSelectionPath(getPathForCategory(p.category));
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-4 bg-white/90 backdrop-blur-md text-black rounded-2xl shadow-xl hover:bg-white transition-all border border-gray-100 active:scale-90"
                                                    >
                                                        <Edit size={20} />
                                                    </button>
                                                    <button
                                                        disabled={isActionLoading}
                                                        onClick={(e) => moveToTrash(p.id, e)}
                                                        className={`p-4 bg-white/90 backdrop-blur-md text-red-500 rounded-2xl shadow-xl hover:bg-white transition-all border border-gray-100 active:scale-90 ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {isActionLoading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => restoreProduct(p.id, e)}
                                                        className="p-4 bg-white/90 backdrop-blur-md text-green-600 rounded-2xl shadow-xl hover:bg-white transition-all border border-gray-100 active:scale-90"
                                                        title="Tiklash"
                                                    >
                                                        <Package size={20} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => deletePermanent(p.id, e)}
                                                        className="p-4 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-600 transition-all active:scale-90"
                                                        title="Butunlay o'chirish"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2">
                                            <ImageIcon size={10} />
                                            {p.images?.length || 1} rasm
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black text-[#7000FF] uppercase tracking-widest truncate max-w-[150px] bg-[#7000FF]/5 px-2 py-0.5 rounded-md">
                                                {categoryLabels[p.category] || p.category}
                                            </p>
                                            {p.article && <span className="text-[8px] font-black bg-gray-100 px-2 py-0.5 rounded text-gray-400">#{p.article}</span>}
                                        </div>
                                        <div className="flex flex-col mb-1 overflow-hidden">
                                            {(p.brand && brandLabels[p.brand]) && <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">{brandLabels[p.brand]}</span>}
                                            <h3 className="font-black text-gray-900 group-hover:text-black transition-colors truncate">{p.name}</h3>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col">
                                                {p.oldPrice && p.oldPrice > 0 && (
                                                    <span className="text-xs text-gray-400 line-through font-bold">{p.oldPrice.toLocaleString()} so'm</span>
                                                )}
                                                <span className="text-xl font-black italic tracking-tighter">{p.price.toLocaleString()} so'm</span>
                                            </div>
                                            <div className="text-right">
                                                {/* Stock hidden as per request - now managed via warehouses */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mahsulot</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategoriya</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Narx</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {products.map((p) => (
                                        <tr key={p.id} className={`group hover:bg-gray-50/50 transition-colors ${selectedIds.includes(p.id) ? 'bg-gray-50' : ''}`}>
                                            <td className="px-4 py-5 w-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(p.id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev =>
                                                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                        );
                                                    }}
                                                    className="w-5 h-5 rounded border-2 border-gray-200 checked:bg-black checked:border-black transition-all cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 relative">
                                                        <Image
                                                            src={(p.image && (p.image.startsWith('http') || p.image.startsWith('/'))) ? p.image : "/placeholder.png"}
                                                            alt={p.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            {(p.brand && brandLabels[p.brand]) && <span className="text-[8px] font-black text-[#7000FF] bg-[#7000FF]/5 px-1.5 py-0.5 rounded uppercase tracking-widest">{brandLabels[p.brand]}</span>}
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.images?.length || 1} TA RASM</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-tighter max-w-[200px] truncate">
                                                {categoryLabels[p.category] || p.category}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    {p.oldPrice && p.oldPrice > 0 && <span className="text-[10px] text-gray-400 line-through">{p.oldPrice.toLocaleString()} so'm</span>}
                                                    <span className="font-black text-sm italic">{p.price.toLocaleString()} so'm</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-end gap-3">
                                                    {activeTab === "active" ? (
                                                        <>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); triggerAiAnalysis(p.id); }} 
                                                                disabled={aiStatus[p.id]?.active}
                                                                className={`p-3 rounded-xl hover:shadow-lg transition-all ${aiStatus[p.id]?.active ? 'bg-black text-white animate-pulse' : 'text-gray-400 hover:text-black hover:bg-white'}`}
                                                                title="AI Tahlil"
                                                            >
                                                                <Sparkles size={18} />
                                                            </button>
                                                            <button onClick={() => {
                                                                const imagesStr = p.images ? p.images.join('; ') : p.image;
                                                                setNewProduct({ ...p, images_string: imagesStr });
                                                                setProductSelectionPath(getPathForCategory(p.category));
                                                                setIsModalOpen(true);
                                                            }} className="p-3 text-gray-400 hover:text-black hover:bg-white rounded-xl hover:shadow-lg transition-all"><Edit size={18} /></button>
                                                            <button onClick={(e) => moveToTrash(p.id, e)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl hover:shadow-lg transition-all"><Trash2 size={18} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => restoreProduct(p.id, e)} className="p-3 text-green-600 hover:bg-white rounded-xl hover:shadow-lg transition-all" title="Tiklash"><Package size={18} /></button>
                                                            <button onClick={(e) => deletePermanent(p.id, e)} className="p-3 text-red-500 hover:bg-white rounded-xl hover:shadow-lg transition-all" title="Butunlay o'chirish"><Trash2 size={18} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Pagination & Limits */}
                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ko'rsatish soni</span>
                            <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                {[20, 50, 100].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => setItemsPerPage(limit)}
                                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${itemsPerPage === limit ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-black'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-black rounded-xl border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pNum = i + 1;
                                        if (
                                            pNum === 1 ||
                                            pNum === totalPages ||
                                            (pNum >= currentPage - 1 && pNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pNum}
                                                    onClick={() => setCurrentPage(pNum)}
                                                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pNum ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                                                >
                                                    {pNum}
                                                </button>
                                            );
                                        }
                                        if (pNum === currentPage - 2 || pNum === currentPage + 2) {
                                            return <span key={pNum} className="text-gray-300">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-black rounded-xl border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}

                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Sahifa {currentPage} / {totalPages}
                        </div>
                    </div>
                </>
            )}

            {/* Excel Import Modal */}
            {isExcelModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl overflow-hidden rounded-[40px] shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-green-50/50 text-black">
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Excel orqali yuklash</h2>
                                <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Ma'lumotlarni ommaviy qo'shish</p>
                            </div>
                            <button onClick={() => { setIsExcelModalOpen(false); setImportLog([]); }} className="p-4 hover:bg-white rounded-full transition-all shadow-sm"><X size={20} /></button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-green-100 rounded-[40px] bg-green-50/20 text-center">
                                <FileSpreadsheet size={64} className="text-green-500 mb-6" strokeWidth={1} />
                                <h3 className="text-xl font-black mb-2">Excel faylni tanlang</h3>
                                <p className="text-sm text-gray-400 mb-8 max-w-sm font-medium">Faqat .xlsx shabloni bo'yicha tayyorlangan fayllarni yuklang</p>

                                <div className="flex flex-col w-full gap-4">
                                    <button
                                        onClick={downloadExcelTemplate}
                                        className="flex items-center justify-center gap-3 w-full bg-white border-2 border-green-500 text-green-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-50 transition-all active:scale-95 shadow-lg shadow-green-500/10"
                                    >
                                        <Download size={18} />
                                        Shablonni yuklab olish
                                    </button>

                                    <label className="flex items-center justify-center gap-3 w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95 cursor-pointer shadow-xl shadow-green-500/20">
                                        <Plus size={18} strokeWidth={3} />
                                        Faylni tanlash
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                            onChange={handleExcelImport}
                                            disabled={isImporting}
                                        />
                                    </label>
                                </div>
                            </div>

                            {importLog.length > 0 && (
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-h-60 overflow-y-auto">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Yuklash jurnali
                                    </h4>
                                    <div className="space-y-2">
                                        {importLog.map((log, i) => (
                                            <p key={i} className={`text-xs font-bold ${log.startsWith('Xatolik') ? 'text-red-500' : 'text-gray-600'}`}>{log}</p>
                                        ))}
                                    </div>
                                    {isImporting && (
                                        <div className="flex items-center gap-3 mt-4 text-green-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                                            <Loader2 className="animate-spin" size={14} />
                                            Yuklanmoqda...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 text-black">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{newProduct.id ? "Tahrirlash" : "Yangi mahsulot"}</h2>
                                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Barcha ma'lumotlarni kiriting</p>
                                </div>
                                {newProduct.id && aiStatus[newProduct.id]?.active && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-2xl animate-pulse">
                                        <Sparkles size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            AI Tahlil: {aiStatus[newProduct.id].processed} / {aiStatus[newProduct.id].total}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setProductSelectionPath([]); }} className="p-4 hover:bg-white rounded-full transition-all shadow-sm"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 overflow-y-auto max-h-[calc(90vh-180px)] text-black">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 relative">
                                            <div className="flex justify-between items-center mr-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Nomi (UZ)</label>
                                                <button
                                                    type="button"
                                                    onClick={handleAiVision}
                                                    disabled={isActionLoading || !newProduct.image}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-30 shadow-xl shadow-black/10"
                                                >
                                                    {isActionLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                    Vision AI
                                                </button>
                                            </div>
                                            <input
                                                required
                                                value={newProduct.name_uz}
                                                onChange={e => setNewProduct({ ...newProduct, name_uz: e.target.value, name: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none shadow-sm"
                                                placeholder="Masalan: iPhone 15 Pro"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 italic">Mahsulot Brendi</label>
                                            <div className="relative">
                                                <select
                                                    value={newProduct.brand || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })}
                                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none appearance-none cursor-pointer shadow-sm text-black"
                                                >
                                                    <option value="">Brendni tanlang...</option>
                                                    {brands.map(brand => (
                                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Название (RU)</label>
                                        <input
                                            required
                                            value={newProduct.name_ru}
                                            onChange={e => setNewProduct({ ...newProduct, name_ru: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 italic">Bar-kod (EAN)</label>
                                            <input
                                                value={newProduct.barcode || ""}
                                                onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                                className="w-full bg-blue-50/30 border-none rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                                placeholder="Masalan: 697..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 italic">Og'irlik (gr)</label>
                                            <input
                                                value={newProduct.weight || ""}
                                                onChange={e => setNewProduct({ ...newProduct, weight: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                                placeholder="Masalan: 500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 italic">Model</label>
                                        <input
                                            value={newProduct.model || ""}
                                            onChange={e => setNewProduct({ ...newProduct, model: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                            placeholder="Masalan: VGR-V937"
                                        />
                                    </div>

                                    <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2 italic">Gabaritlar (O'lchamlar)</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-gray-300 uppercase ml-2">Balandlik</span>
                                                <input
                                                    value={newProduct.height || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, height: e.target.value })}
                                                    className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                                    placeholder="h"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-gray-300 uppercase ml-2">Kenglik</span>
                                                <input
                                                    value={newProduct.width || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, width: e.target.value })}
                                                    className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                                    placeholder="w"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black text-gray-300 uppercase ml-2">Uzunlik</span>
                                                <input
                                                    value={newProduct.length || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, length: e.target.value })}
                                                    className="w-full bg-white border-none rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-black outline-none shadow-sm text-black"
                                                    placeholder="l"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hozirgi Narx (so'm)</label>
                                            <input
                                                required
                                                type="number"
                                                value={newProduct.price}
                                                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Eski Narx (so'm)</label>
                                            <input
                                                type="number"
                                                value={newProduct.oldPrice || ""}
                                                onChange={(e) => setNewProduct({ ...newProduct, oldPrice: e.target.value ? Number(e.target.value) : 0 })}
                                                placeholder="0 bo'lsa ko'rinmaydi"
                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Cashback Sub-Section */}
                                    <div className="bg-emerald-50/40 p-8 rounded-[40px] border border-emerald-100 space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <DollarSign size={16} />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Cashback Sozlamalari</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Hisoblash turi</label>
                                                <select
                                                    value={newProduct.cashback_type || "global"}
                                                    onChange={e => setNewProduct({ ...newProduct, cashback_type: e.target.value as any })}
                                                    className="w-full bg-white border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-black"
                                                >
                                                    <option value="global">Global (% )</option>
                                                    <option value="percent">Maxsus % (Foiz)</option>
                                                    <option value="fixed">Maxsus Summa (Fixed)</option>
                                                </select>
                                            </div>
                                            {newProduct.cashback_type !== 'global' && (
                                                <div className="space-y-2 animate-in zoom-in-95 duration-300">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                                                        {newProduct.cashback_type === 'percent' ? 'Foiz (%)' : 'Summa (so\'m)'}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={newProduct.cashback_value || ""}
                                                            onChange={e => setNewProduct({ ...newProduct, cashback_value: Number(e.target.value) })}
                                                            className="w-full bg-white border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-black pr-10"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                                                            {newProduct.cashback_type === 'percent' ? '%' : '∑'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Tovar Toifasi (Uzum Market uslubida)</label>

                                        <div className="space-y-3">
                                            {/* Level 1 dropdown */}
                                            <div className="relative">
                                                <select
                                                    value={productSelectionPath[0] || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setProductSelectionPath(val ? [val] : []);
                                                        setNewProduct({ ...newProduct, category: val });
                                                    }}
                                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none appearance-none cursor-pointer shadow-sm"
                                                >
                                                    <option value="">Toifani tanlang...</option>
                                                    {rawCategories
                                                        .filter(c => (!c.parent_id || c.parent_id === "none") && !c.is_deleted)
                                                        .map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name_uz || cat.name}</option>
                                                        ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={18} />
                                            </div>

                                            {/* Subsequent Levels */}
                                            {productSelectionPath.map((selectedId, idx) => {
                                                const children = rawCategories.filter(c => c.parent_id === selectedId && !c.is_deleted);
                                                if (children.length === 0) return null;

                                                return (
                                                    <div key={idx} className="pl-4 border-l-2 border-gray-100 space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                                        <div className="relative">
                                                            <select
                                                                value={productSelectionPath[idx + 1] || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const newPath = productSelectionPath.slice(0, idx + 1);
                                                                    if (val) {
                                                                        newPath.push(val);
                                                                        setNewProduct({ ...newProduct, category: val });
                                                                    } else {
                                                                        setNewProduct({ ...newProduct, category: selectedId });
                                                                    }
                                                                    setProductSelectionPath(newPath);
                                                                }}
                                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none appearance-none cursor-pointer shadow-sm"
                                                            >
                                                                <option value="">Ichki toifani tanlang...</option>
                                                                {children.map(cat => (
                                                                    <option key={cat.id} value={cat.id}>{cat.name_uz || cat.name}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={18} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center justify-between shadow-sm">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Original Sifat</h4>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 italic">"Original" belgisini ko'rsatish</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setNewProduct({ ...newProduct, isOriginal: !newProduct.isOriginal })}
                                            className={`w-14 h-8 rounded-full transition-all relative flex items-center ${newProduct.isOriginal ? "bg-green-500" : "bg-gray-200"}`}
                                        >
                                            <div className={`absolute w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${newProduct.isOriginal ? "left-[28px]" : "left-1"}`} />
                                        </button>
                                    </div>
                                    <div className="pt-4 border-t border-gray-50 mt-6 bg-gray-50/50 p-6 rounded-[32px] space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-4">Guruhlash va SKU (Unikal)</h4>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mahsulot SKU kod</label>
                                            <input
                                                required
                                                type="text"
                                                value={newProduct.sku}
                                                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                                placeholder="Masalan: VGR-706-BLUE"
                                                className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Guruh SKU (GroupId) - 100 tagacha</label>
                                            <input
                                                type="text"
                                                value={newProduct.groupId}
                                                onChange={(e) => setNewProduct({ ...newProduct, groupId: e.target.value })}
                                                placeholder="Masalan: VGR-706-GROUP"
                                                className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Rang yoki Variant nomi</label>
                                            <input
                                                type="text"
                                                value={newProduct.colorName}
                                                onChange={(e) => setNewProduct({ ...newProduct, colorName: e.target.value })}
                                                placeholder="Masalan: Och ko'k"
                                                className="w-full bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                                <span>Video havola (URL)</span>
                                                {isUploading && <Loader2 className="animate-spin text-black" size={14} />}
                                            </label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={newProduct.videoUrl}
                                                    onChange={(e) => setNewProduct({ ...newProduct, videoUrl: e.target.value })}
                                                    placeholder="URL yoki Kompyuterdan yuklang"
                                                    className="flex-1 bg-white border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                                                />
                                                <label className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer shadow-sm ${isUploading ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-black'}`}>
                                                    <Video size={18} className={isUploading ? 'text-gray-300' : 'text-gray-500'} />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={handleVideoUpload}
                                                        accept="video/*"
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                            </div>
                                            {newProduct.videoUrl && (
                                                <p className="text-[7px] font-black text-green-500 uppercase mt-2 tracking-widest italic flex items-center gap-1">
                                                    <div className="w-1 h-1 bg-green-500 rounded-full" /> Video biriktirildi
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                            <span>Mahsulot Rasmlari (Max 30)</span>
                                            <span className="text-gray-300 italic">{newProduct.images?.length || 0} / 30</span>
                                        </label>

                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {newProduct.images?.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-gray-50 bg-white shadow-sm">
                                                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newImages = [...(newProduct.images || [])];
                                                            newImages.splice(idx, 1);
                                                            setNewProduct({
                                                                ...newProduct,
                                                                images: newImages,
                                                                image: newImages[0] || "",
                                                                images_string: newImages.join(';')
                                                            });
                                                        }}
                                                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                    {idx === 0 && (
                                                        <div className="absolute top-2 left-2 bg-black text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-lg">Asosiy</div>
                                                    )}
                                                </div>
                                            ))}
                                            {(!newProduct.images || newProduct.images.length < 30) && (
                                                <div className={`relative aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-black transition-all group ${isUploading ? 'bg-gray-50' : 'bg-white cursor-pointer'}`}>
                                                    {isUploading ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Loader2 className="animate-spin text-black" size={20} />
                                                            <span className="text-[6px] font-black text-gray-400 uppercase">Yuklanmoqda</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Plus size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                                                            <span className="text-[7px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Yangi qo'shish</span>
                                                            <input
                                                                type="file"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                onChange={(e) => handleFileUpload(e, true)}
                                                                accept="image/*"
                                                                disabled={isUploading}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tavsif (UZ)</label>
                                            <textarea
                                                rows={4}
                                                value={newProduct.description_uz}
                                                onChange={(e) => setNewProduct({ ...newProduct, description_uz: e.target.value, description: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm resize-none"
                                                placeholder="Batafsil ma'lumot (UZ)..."
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Описание (RU)</label>
                                            <textarea
                                                rows={4}
                                                value={newProduct.description_ru}
                                                onChange={(e) => setNewProduct({ ...newProduct, description_ru: e.target.value })}
                                                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm resize-none"
                                                placeholder="Описание товара (RU)..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setProductSelectionPath([]); }}
                                    className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-black hover:bg-gray-50 transition-all"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-black text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-900 transition-all shadow-2xl disabled:opacity-50 flex items-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="animate-spin text-white" size={18} /> : (newProduct.id ? "Yangilash" : "Saqlash")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
