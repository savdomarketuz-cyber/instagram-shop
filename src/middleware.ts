import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Runtime mos JWT verification
 * Web Crypto API orqali HMAC-SHA256 tekshirish
 */
async function verifyTokenEdge(token: string, secret: string): Promise<Record<string, unknown> | null> {
    try {
        const [header, body, signature] = token.split('.');
        if (!header || !body || !signature) return null;

        // Web Crypto API — Edge Runtime uchun mos
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const data = encoder.encode(`${header}.${body}`);
        const sig = await crypto.subtle.sign('HMAC', key, data);
        const sigArray = new Uint8Array(sig);
        let binary = '';
        for (let i = 0; i < sigArray.byteLength; i++) {
            binary += String.fromCharCode(sigArray[i]);
        }
        
        // Base64url formatga aylantirish
        const expectedSig = btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        if (signature !== expectedSig) return null;

        // Body'ni decode qilish
        const bodyStr = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(bodyStr);
    } catch {
        return null;
    }
}

/**
 * Next.js Middleware — Admin sahifalarni JWT bilan himoyalash
 * Edge Runtime compatible (Web Crypto API)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Admin sahifalarini himoyalash
    if (pathname.startsWith('/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value;

        if (!adminToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // JWT tokenni tekshirish (Edge Runtime mos)
        const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
        if (!ADMIN_SECRET) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }

        const payload = await verifyTokenEdge(adminToken, ADMIN_SECRET);

        if (!payload) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }

        // Token muddatini tekshirish
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp === 'number' && payload.exp < now) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }

        // Role tekshirish
        if (payload.role !== 'admin') {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }
    }

    // Security headers for all routes
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

    return response;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|firebase-messaging-sw.js|yandex_).*)',
    ],
};
