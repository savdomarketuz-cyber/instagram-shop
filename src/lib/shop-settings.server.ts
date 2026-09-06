// 🔒 SERVER ONLY: Bu fayl FAQAT server-side (Server Components, API routes) da ishlatiladi.
// Client Component larda IMPORT QILMANG!
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ShopSettings, DEFAULT_SHOP_SETTINGS } from "@/lib/shop-settings";

/**
 * Server tomonida do'kon sozlamalarini DB dan xavfsiz o'qish (Next.js SSR / API)
 */
export async function getShopSettingsServer(): Promise<ShopSettings> {
    try {
        const { data, error } = await supabaseAdmin
            .from("settings")
            .select("data")
            .eq("id", "shop")
            .maybeSingle();

        if (error || !data?.data) {
            return { ...DEFAULT_SHOP_SETTINGS };
        }

        return {
            ...DEFAULT_SHOP_SETTINGS,
            ...data.data,
        };
    } catch {
        return { ...DEFAULT_SHOP_SETTINGS };
    }
}
