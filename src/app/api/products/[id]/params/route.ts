import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/products/{productId}/params — mahsulot xususiyatlari (ommaviy, faqat o'qish).
// Faqat ko'rsatish uchun kerakli maydonlar qaytadi; yozish admin API'da (/api/admin/product-params).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const productId = params.id;
    if (!productId) {
        return NextResponse.json({ error: 'product id is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('product_param_values')
            .select('value, category_params(name, name_uz, name_ru)')
            .eq('product_id', productId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const items = (data || []).filter((d: any) => typeof d.value === 'string' && d.value.trim());
        return NextResponse.json({ data: items });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
