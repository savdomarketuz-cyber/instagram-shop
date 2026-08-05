import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductSlug } from '@/lib/slugify';

export const revalidate = 3600; // 1 soatda kesh yangilanadi

const BASE_URL = 'https://velari.uz';

function escapeCdata(text: string = ''): string {
  return text.replace(/\]\]>/g, ']]&gt;');
}

export async function GET() {
  try {
    const { data: brands } = await supabaseAdmin.from('brands').select('id, name');
    const brandMap: Record<string, string> = {};
    (brands || []).forEach((b) => {
      brandMap[b.id] = b.name;
    });

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, name_uz, name_ru, price, old_price, stock, image, images, description, description_uz, description_ru, sku, model, brand_id, category_id')
      .eq('is_deleted', false);

    if (error) {
      console.error('Meta catalog feed error:', error.message);
      return new Response('Database error', { status: 500 });
    }

    let itemsXml = '';

    for (const p of products || []) {
      const title = p.name_uz || p.name || p.name_ru || 'Mahsulot';
      const description = p.description_uz || p.description || p.description_ru || title;
      const slug = getProductSlug(p);
      const link = `${BASE_URL}/uz/products/${slug}`;
      const mainImage = p.image || (Array.isArray(p.images) && p.images[0]) || '';
      
      if (!mainImage) continue; // Meta requires main image

      const brand = brandMap[p.brand_id] || 'Velari';
      const isAvailable = (p.stock || 0) > 0 ? 'in stock' : 'out of stock';
      
      const priceVal = p.price || 0;
      const oldPriceVal = p.old_price && p.old_price > priceVal ? p.old_price : null;

      let priceXml = `<g:price>${oldPriceVal ? oldPriceVal : priceVal} UZS</g:price>`;
      if (oldPriceVal) {
        priceXml += `\n        <g:sale_price>${priceVal} UZS</g:sale_price>`;
      }

      // Secondary images (up to 10)
      let addImgsXml = '';
      if (Array.isArray(p.images)) {
        const extraImgs = p.images.filter((img: string) => img && img !== mainImage).slice(0, 10);
        extraImgs.forEach((img: string) => {
          addImgsXml += `\n        <g:additional_image_link>${img}</g:additional_image_link>`;
        });
      }

      itemsXml += `
    <item>
      <g:id>${p.sku || p.id}</g:id>
      <g:title><![CDATA[${escapeCdata(title)}]]></g:title>
      <g:description><![CDATA[${escapeCdata(description.substring(0, 4900))}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${mainImage}</g:image_link>${addImgsXml}
      <g:brand><![CDATA[${escapeCdata(brand)}]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>${isAvailable}</g:availability>
      ${priceXml}
    </item>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Velari Market Meta Product Feed</title>
    <link>${BASE_URL}</link>
    <description>Velari Market Products Catalog Feed for Meta Facebook/Instagram Commerce</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err: any) {
    console.error('Meta catalog route error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
