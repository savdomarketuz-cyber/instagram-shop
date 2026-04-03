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

    // --- IRON BANK VAULT PROTECTION ---
    if (pathname.startsWith('/admin')) {
        const adminVaultToken = request.cookies.get('admin_vault_token')?.value;
        const vaultSecret = request.nextUrl.searchParams.get('vault');
        const GLOBAL_VAULT_KEY = process.env.ADMIN_VAULT_KEY || 'TEMIR_BANK_2026';

        // 1. Secret Entry check
        if (vaultSecret === GLOBAL_VAULT_KEY) {
            const response = NextResponse.next();
            response.cookies.set('admin_vault_token', 'VAULT_OPEN_SESS_' + Date.now(), { 
                httpOnly: true, 
                secure: true, 
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 // 24 hours
            });
            return response;
        }

        // 2. Secret Session check
        if (!adminVaultToken) {
            // Stealth mode: silent redirect to home
            return NextResponse.redirect(new URL('/', request.url));
        }

        // 3. Original Admin JWT check
        const adminToken = request.cookies.get('admin_token')?.value;
        if (!adminToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
        const payload = await verifyTokenEdge(adminToken, ADMIN_SECRET);

        if (!payload || payload.role !== 'admin') {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('admin_token');
            return response;
        }

        // --- BRUTE FORCE CHECK (Future) ---
        // (Could add IP blocking here if database was locally accessible)
    }

    // Security headers for all routes
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none';");
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

    return response;

    return response;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|robots.txt|sitemap.xml|firebase-messaging-sw.js|yandex_).*)',
    ],
};
