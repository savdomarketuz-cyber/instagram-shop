import { supabaseAdmin } from "@/lib/supabase-admin";
import { mapProduct } from "@/lib/mappers";
import { notFound } from "next/navigation";
import StoreClient from "./StoreClient";

export const dynamic = "force-dynamic"; // qoldiqlar o'zgaruvchan

const PRODUCT_COLS =
    "id,name,name_uz,name_ru,price,old_price,image,images,image_metadata,sales,rating,review_count,stock,stock_details,category_id,brand_id,video_url,model,color_name,group_id,is_original,article,created_at";

export default async function StorePage({ params }: { params: { lang: string; id: string } }) {
    const lang = params.lang === "ru" ? "ru" : "uz";

    const { data: wh } = await supabaseAdmin
        .from("warehouses")
        .select("id,name,logo,address,active")
        .eq("id", params.id)
        .single();

    if (!wh || wh.active === false) notFound();

    const { data: rows } = await supabaseAdmin
        .from("products")
        .select(PRODUCT_COLS)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(500);

    const products = (rows || [])
        .filter((p: any) => Number((p.stock_details || {})[params.id]) > 0)
        .map(mapProduct);

    return (
        <StoreClient
            warehouse={{ id: wh.id, name: wh.name, logo: wh.logo || null, address: wh.address || null }}
            products={products}
            language={lang}
        />
    );
}
