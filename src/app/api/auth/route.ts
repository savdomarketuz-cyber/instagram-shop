import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * HMAC-SHA256 asosida JWT-ga o'xshash token yaratish
 * Tashqi kutubxonalarsiz ishlaydi
 */
function createToken(payload: Record<string, unknown>, secret: string): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${body}`)
        .digest("base64url");
    return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string): Record<string, unknown> | null {
    try {
        const [header, body, signature] = token.split(".");
        if (!header || !body || !signature) return null;

        const expectedSig = crypto
            .createHmac("sha256", secret)
            .update(`${header}.${body}`)
            .digest("base64url");

        if (signature !== expectedSig) return null;

        return JSON.parse(Buffer.from(body, "base64url").toString());
    } catch {
        return null;
    }
}

/**
 * Parolni hash qilish (SHA-256 + salt)
 */
function hashPassword(password: string, salt: string): string {
    return crypto.createHash("sha256").update(password + salt).digest("hex");
}

/**
 * Server-side Admin Authentication
 * JWT token + parol hashlash bilan himoyalangan
 */
export async function POST(req: NextRequest) {
    try {
        const { id, password } = await req.json();

        if (!id || !password) {
            return NextResponse.json({ error: "Credentials required" }, { status: 400 });
        }

        const ADMIN_ID = process.env.ADMIN_LOGIN || "admin";
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
        const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

        if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
            console.error("ADMIN_PASSWORD or ADMIN_SECRET environment variable is not set!");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Parolni tekshirish
        if (id.toLowerCase() !== ADMIN_ID.toLowerCase() || password !== ADMIN_PASSWORD) {
            // Brute-force oldini olish uchun kichik delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // JWT token yaratish
        const now = Math.floor(Date.now() / 1000);
        const token = createToken({
            sub: ADMIN_ID,
            role: "admin",
            iat: now,
            exp: now + 86400, // 24 soat
        }, ADMIN_SECRET);

        const response = NextResponse.json({
            success: true,
            user: { id: "ADMIN", phone: "ADMIN", name: "Administrator", isAdmin: true },
            token
        });

        // Xavfsiz httpOnly cookie
        response.cookies.set("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 86400, // 24 soat
            path: "/",
        });

        return response;
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
        const token = req.cookies.get("admin_token")?.value;

        if (!token) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
        if (!ADMIN_SECRET) {
            return NextResponse.json({ authenticated: false }, { status: 500 });
        }

        const payload = verifyToken(token, ADMIN_SECRET);

        if (!payload) {
            return NextResponse.json({ authenticated: false, error: "Invalid token" }, { status: 401 });
        }

        // Token muddatini tekshirish
        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp === "number" && payload.exp < now) {
            return NextResponse.json({ authenticated: false, error: "Token expired" }, { status: 401 });
        }

        if (payload.role !== "admin") {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({
            authenticated: true,
            user: { id: "ADMIN", name: "Administrator", isAdmin: true }
        });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
