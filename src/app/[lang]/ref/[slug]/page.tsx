import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function ReferralRedirect({ params }: { params: { slug: string, lang: string } }) {
    const { slug, lang } = params;

    // Standart manzil — havola topilmasa shu yerga
    let target = `/${lang}`;

    try {
        const { data: link } = await supabaseAdmin
            .from("affiliate_links")
            .select("id, product_id, clicks")
            .eq("slug", slug)
            .single();

        if (link) {
            // Klik hisoblagichni oshirish (xato bo'lsa ham redirect davom etadi)
            await supabaseAdmin
                .from("affiliate_links")
                .update({ clicks: (link.clicks || 0) + 1 })
                .eq("id", link.id);

            target = `/${lang}/products/${link.product_id}?ref=${slug}`;
        }
    } catch (e) {
        // DB xatosi — target bosh sahifa bo'lib qoladi
    }

    // MUHIM: redirect() NEXT_REDIRECT exception otadi, shuning uchun
    // u try/catch TASHQARISIDA bo'lishi shart (aks holda catch ushlab,
    // foydalanuvchini noto'g'ri joyga yuboradi).
    redirect(target);
}
