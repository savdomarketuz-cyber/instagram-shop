import { NextResponse } from 'next/server';
import { getSitemapChunks, renderUrlset, SITEMAP_XML_HEADERS } from '@/lib/sitemap-data';

// Bola sitemap: /sitemap/0.xml, /sitemap/1.xml, ...
export const revalidate = 86400; // Regenerate sitemap every 24 hours

// Build vaqtida barcha minglab mahsulotlarni tortib timeout bermasligi uchun
// bo'laklar birinchi so'rov kelganda generatsiya qilinadi va 24 soat keshlanadi (ISR)
export async function generateStaticParams() {
    return [];
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const match = /^(\d+)\.xml$/.exec(params.id);
    if (!match) {
        return new NextResponse('Not Found', { status: 404 });
    }

    const chunks = await getSitemapChunks();
    const chunk = chunks[Number(match[1])];
    if (!chunk) {
        return new NextResponse('Not Found', { status: 404 });
    }

    return new NextResponse(renderUrlset(chunk), { headers: SITEMAP_XML_HEADERS });
}
