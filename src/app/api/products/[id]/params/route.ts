import { NextResponse } from 'next/server';
import { supabaseAdminFresh } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/products/{productId}/params — mahsulot xususiyatlari (ommaviy, faqat o'qish).
// Faqat ko'rsatish uchun kerakli maydonlar qaytadi; yozish admin API'da (/api/admin/product-params).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const rawId = params?.id;
    if (!rawId) {
        return NextResponse.json({ error: 'product id is required' }, { status: 400 });
    }

    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
        let resolvedProductId = rawId;

        if (!isUUID) {
            // Resolve UUID if article or slug identifier was passed
            const { data: prod } = await supabaseAdminFresh
                .from('products')
                .select('id')
                .or(`article.eq.${rawId},id.eq.${rawId}`)
                .maybeSingle();
            if (prod?.id) {
                resolvedProductId = prod.id;
            } else {
                return NextResponse.json({ data: [] });
            }
        }

        const { data, error } = await supabaseAdminFresh
            .from('product_param_values')
            .select('value, value_uz, value_ru, category_params(name, name_uz, name_ru)')
            .eq('product_id', resolvedProductId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const items = (data || []).filter((d: any) => {
            const v = d.value || d.value_uz || d.value_ru;
            return typeof v === 'string' && v.trim().length > 0;
        });
        return NextResponse.json(
            { data: items },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
