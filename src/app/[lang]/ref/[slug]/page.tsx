import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

export default async function ReferralRedirect({ params }: { params: { slug: string, lang: string } }) {
    const { slug, lang } = params;

    try {
        // 1. Find the link
        const { data: link, error } = await supabaseAdmin
            .from("affiliate_referral_links")
            .select("*, products(id, name)")
            .eq("slug", slug)
            .single();

        if (error || !link) {
            redirect(`/${lang}`);
        }

        // 2. Log the click
        await supabaseAdmin
            .from("affiliate_referral_links")
            .update({ clicks: (link.clicks || 0) + 1 })
            .eq("id", link.id);

        await supabaseAdmin.from("affiliate_event_logs").insert({
            affiliate_id: link.affiliate_id,
            link_id: link.id,
            event_type: "click"
        });

        // 3. Set cookie for attribution (30 days)
        cookies().set("affiliate_id", link.affiliate_id, { maxAge: 60 * 60 * 24 * 30, path: "/" });
        cookies().set("referral_link_id", link.id, { maxAge: 60 * 60 * 24 * 30, path: "/" });

        // 4. Redirect to product page
        redirect(`/${lang}/product/${link.product_id}`);
    } catch (e) {
        redirect(`/${lang}`);
    }
}
