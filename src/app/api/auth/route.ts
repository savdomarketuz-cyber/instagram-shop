import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side Admin Authentication
 * Hech qanday parol client-side kodda saqlanmaydi
 */
export async function POST(req: NextRequest) {
    try {
        const { id, password } = await req.json();

        if (!id || !password) {
            return NextResponse.json({ error: "Credentials required" }, { status: 400 });
        }

        // Admin credentials faqat server-side environment variable-da
        const ADMIN_ID = process.env.ADMIN_LOGIN || "admin";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

        if (!ADMIN_PASSWORD) {
            console.error("ADMIN_PASSWORD environment variable is not set!");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        if (id.toLowerCase() === ADMIN_ID.toLowerCase() && password === ADMIN_PASSWORD) {
            // Generate a simple auth token (in production use JWT)
            const token = Buffer.from(`${ADMIN_ID}:${Date.now()}:${process.env.ADMIN_SECRET || 'velari-secret'}`).toString('base64');

            const response = NextResponse.json({
                success: true,
                user: { id: "ADMIN", phone: "ADMIN", name: "Administrator", isAdmin: true },
                token
            });

            // Set httpOnly cookie for admin session
            response.cookies.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // 24 hours
                path: '/'
            });

            return response;
        }

        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    } catch (error) {
        console.error("Auth error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Admin session verification
 */
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('admin_token')?.value;

        if (!token) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        // Decode and verify token
        const decoded = Buffer.from(token, 'base64').toString();
        const [adminId, timestamp, secret] = decoded.split(':');

        const ADMIN_ID = process.env.ADMIN_LOGIN || "admin";
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'velari-secret';

        if (adminId !== ADMIN_ID || secret !== ADMIN_SECRET) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        // Check if token is not older than 24 hours
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 24 * 60 * 60 * 1000) {
            return NextResponse.json({ authenticated: false, error: "Token expired" }, { status: 401 });
        }

        return NextResponse.json({ authenticated: true, user: { id: "ADMIN", name: "Administrator", isAdmin: true } });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
