import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getProductSlug } from "@/lib/slugify";

export const revalidate = 3600;

const BASE_URL = "https://velari.uz";

function esc(str: string): string {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Google price format: "274990 UZS"
function gPrice(val: number): string {
    return `${Math.round(val)} UZS`;
}

export async function GET() {
    try {
        const [{ data: products }, { data: categories }] = await Promise.all([
            supabaseAdmin
                .from("products")
                .select("id, name, name_uz, name_ru, price, old_price, image, images, description, description_ru, stock, article, model, category_id, brand_id, is_deleted, updated_at")
                .eq("is_deleted", false)
                .order("sales", { ascending: false }),
            supabaseAdmin
                .from("categories")
                .select("id, name, name_ru, name_uz, parent_id")
                .eq("is_deleted", false),
        ]);

        if (!products?.length) {
            return NextResponse.json({ error: "No products" }, { status: 500 });
        }

        // Narxsiz mahsulotlarni chiqarib tashlaymiz — Google "price not specified" xatosi beradi
        const validProducts = products.filter(p => p.price && p.price > 0 && p.image);

        const catMap = new Map((categories || []).map((c) => [c.id, c]));

        const getCategoryPath = (catId: string): string => {
            const parts: string[] = [];
            let cur = catMap.get(catId);
            while (cur) {
                parts.unshift(cur.name_ru || cur.name_uz || cur.name || "");
                cur = cur.parent_id ? catMap.get(cur.parent_id) : undefined;
            }
            return parts.join(" > ") || "Электроника";
        };

        const now = new Date().toUTCString();

        const items = validProducts.map((p) => {
            const ruSlug = getProductSlug(p, "ru");
            const link = `${BASE_URL}/ru/products/${ruSlug}`;

            const title = esc(p.name_ru || p.name_uz || p.name || "");
            const desc = esc((p.description_ru || p.description || title).substring(0, 5000));
            const brand = esc(p.brand_id || title.split(" ")[0] || "Velari");
            const catPath = esc(getCategoryPath(p.category_id));
            const mpn = esc(p.model || p.article || p.id);
            const availability = (p.stock ?? 1) > 0 ? "in stock" : "out of stock";

            // Rasmlar: asosiy + qo'shimcha (max 10)
            const allImages: string[] = [p.image, ...(p.images || [])]
                .filter(Boolean)
                .slice(0, 10);
            const [mainImage, ...extraImages] = allImages;

            const additionalImages = extraImages
                .map((img) => `      <g:additional_image_link>${esc(img)}</g:additional_image_link>`)
                .join("\n");

            const salePriceLine = p.old_price && p.old_price > p.price
                ? `      <g:sale_price>${gPrice(p.price)}</g:sale_price>\n      <g:sale_price_effective_date>2026-01-01T00:00+05:00/2030-12-31T23:59+05:00</g:sale_price_effective_date>`
                : "";

            // Chegirma bo'lsa price = eski narx, sale_price = yangi narx
            const actualPrice = p.price;
            const displayPrice = p.old_price && p.old_price > p.price
                ? gPrice(p.old_price)
                : gPrice(p.price);

            // 150 000 so'm va undan yuqori — bepul yetkazish (Toshkent)
            const shippingPrice = actualPrice >= 150000 ? "0 UZS" : "25000 UZS";

            return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${esc(mainImage)}</g:image_link>
${additionalImages ? additionalImages + "\n" : ""}\
      <g:availability>${availability}</g:availability>
      <g:price>${displayPrice}</g:price>
${salePriceLine ? salePriceLine + "\n" : ""}\
      <g:condition>new</g:condition>
      <g:brand>${brand}</g:brand>
      <g:mpn>${mpn}</g:mpn>
      <g:product_type>${catPath}</g:product_type>
      <g:shipping>
        <g:country>UZ</g:country>
        <g:price>${shippingPrice}</g:price>
      </g:shipping>
    </item>`;
        }).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Velari — Premium Electronics</title>
    <link>${BASE_URL}</link>
    <description>Velari — O'zbekistondagi premium texnika do'koni</description>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>`;

        return new NextResponse(xml, {
            status: 200,
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch (err) {
        console.error("[Google Feed]", err);
        return NextResponse.json({ error: "Feed generation failed" }, { status: 500 });
    }
}
