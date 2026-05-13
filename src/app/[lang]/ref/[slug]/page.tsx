import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function ReferralRedirect({ params }: { params: { slug: string, lang: string } }) {
    const { slug, lang } = params;

    try {
        // 1. Find the link
        const { data: link, error } = await supabaseAdmin
            .from("affiliate_links")
            .select("*, products(id, name)")
            .eq("slug", slug)
            .single();

        if (error || !link) {
            redirect(`/${lang}`);
        }

        // 2. Log the click (increment clicks counter)
        await supabaseAdmin
            .from("affiliate_links")
            .update({ clicks: (link.clicks || 0) + 1 })
            .eq("id", link.id);

        // 3. Redirect to product page with ?ref=SLUG so ProductClient saves to affiliate_data cookie
        redirect(`/${lang}/products/${link.product_id}?ref=${slug}`);
    } catch (e) {
        redirect(`/${lang}`);
    }
}
