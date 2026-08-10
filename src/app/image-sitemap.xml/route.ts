import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductSlug } from '@/lib/slugify';

// Google Images / Yandex Images uchun maxsus IMAGE sitemap.
// Next 14 ning built-in sitemap.ts'i <image:image> teglarini chiqarmaydi,
// shuning uchun XML ni qo'lda generatsiya qilamiz.
export const revalidate = 86400; // 24 soatda qayta generatsiya

const BASE_URL = 'https://velari.uz';

// XML maxsus belgilarini ekranlash (& < > " ')
function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toAbsolute(img: string): string {
    if (img.startsWith('http')) return img;
    return `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
}

// AVIF ni Yandex Images yaxshi indekslamaydi. Upload pipeline har avif uchun
// webp `lg` (1080px) variantini saqlaydi (image_metadata) — Yandex ham, Google ham
// indekslaydigan format. Avif bo'lsa va webp lg mavjud bo'lsa — o'shani beramiz.
function preferIndexableUrl(img: string, meta: any): string {
    if (img.toLowerCase().endsWith('.avif')) {
        const lg = meta?.[img]?.lg;
        if (typeof lg === 'string' && lg.trim().length > 0) return lg;
    }
    return img;
}

export async function GET() {
    let urlEntries = '';

    try {
        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('id, name, name_uz, name_ru, article, image, images, image_metadata, updated_at')
            .eq('is_deleted', false);

        if (error) {
            console.error('Image sitemap: products fetch failed:', error.message);
        }

        if (products && products.length > 0) {
            for (const product of products) {
                // Mahsulotning barcha rasmlari: asosiy + galereya, dublikatsiz.
                // AVIF -> webp lg (Yandex), so'ng absolyut URL.
                const meta = product.image_metadata || {};
                const rawImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])]
                    .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
                    .map((img) => preferIndexableUrl(img, meta))
                    .map(toAbsolute);
                const images = Array.from(new Set(rawImages)).slice(0, 50); // Google: <url> ichida 1000 tagacha

                if (images.length === 0) continue;

                const slug = getProductSlug(product, 'uz');
                const loc = `${BASE_URL}/uz/products/${slug}`;

                // image:title — Yandex Images rasm-relevantligida ishlatadi (Google e'tiborsiz qoldiradi, zararsiz)
                const title = (product.name_uz || product.name || '').trim();
                const titleTag = title ? `<image:title>${xmlEscape(title)}</image:title>` : '';

                const imageTags = images
                    .map((img) => `    <image:image><image:loc>${xmlEscape(img)}</image:loc>${titleTag}</image:image>`)
                    .join('\n');

                // lastmod — qidiruv tizimlari yangilangan mahsulotlarni tezroq qayta skanerlaydi
                const lastmod = product.updated_at
                    ? `\n    <lastmod>${new Date(product.updated_at).toISOString()}</lastmod>`
                    : '';

                urlEntries += `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod}\n${imageTags}\n  </url>\n`;
            }
        }
    } catch (err) {
        console.error('Image sitemap generation failed:', err);
    }

    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
        urlEntries +
        `</urlset>\n`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
    });
}
