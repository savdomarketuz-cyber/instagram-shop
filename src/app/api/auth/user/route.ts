import { NextRequest, NextResponse } from "next/server";
import { db, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "@/lib/firebase";
import { hashPassword } from "@/lib/auth-utils";

/**
 * Foydalanuvchi logini (Server-side)
 * Parollarni ochiq ko'rinishdan hash-ga o'tkazish (Auto-migration)
 */
export async function POST(req: NextRequest) {
    try {
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
        }

        // 1. Foydalanuvchini topish
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const storedPassword = userData.password;

        let isAuthenticated = false;
        let needsMigration = false;

        // 2. Parolni tekshirish
        // a) Ochiq matnli eski parol (Auto-migration uchun)
        if (storedPassword === password) {
            isAuthenticated = true;
            needsMigration = true;
        } 
        // b) Hash qilingan yangi parol
        else if (storedPassword === hashPassword(password)) {
            isAuthenticated = true;
        }

        if (!isAuthenticated) {
            // Brute-force oldini olish
            await new Promise(resolve => setTimeout(resolve, 500));
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // 3. Auto-migration: Parolni hash-ga o'tkazish
        if (needsMigration) {
            await updateDoc(doc(db, "users", userDoc.id), {
                password: hashPassword(password),
                migrationDate: serverTimestamp()
            });
        }

        // 4. IP va oxirgi kirishni yangilash
        // IP-ni req-dan olishga harakat qilamiz
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(/, /)[0] : "Aniqlanmadi";

        await updateDoc(doc(db, "users", userDoc.id), {
            ipAddress: ip,
            lastLogin: serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            user: {
                id: userDoc.id,
                phone: userData.phone,
                name: userData.name || "Mijoz",
                username: userData.username || "",
                isAdmin: userData.isAdmin || false
            }
        });

    } catch (error) {
        console.error("User Auth Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
