import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Admin sahifalarni himoyalash
 * Agar admin_token cookie yo'q bo'lsa, login-ga redirect qiladi
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Admin sahifalarini himoyalash
    if (pathname.startsWith('/admin')) {
        const adminToken = request.cookies.get('admin_token')?.value;

        if (!adminToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Token formatini tekshirish
        try {
            const decoded = Buffer.from(adminToken, 'base64').toString();
            const [adminId, timestamp] = decoded.split(':');

            // Token 24 soatdan eski bo'lsa redirect
            const tokenAge = Date.now() - parseInt(timestamp);
            if (tokenAge > 24 * 60 * 60 * 1000 || !adminId) {
                const response = NextResponse.redirect(new URL('/login', request.url));
                response.cookies.delete('admin_token');
                return response;
            }
        } catch {
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
