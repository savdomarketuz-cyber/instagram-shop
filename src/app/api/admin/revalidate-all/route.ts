import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
    try {
        // Nuqtaviy xavfsiz kesh yangilash: butun sayt layout'ini emas, asosiy o'zak sahifalarni yangilaymiz
        revalidatePath("/uz");
        revalidatePath("/ru");
        revalidatePath("/uz/catalog");
        revalidatePath("/ru/catalog");
        revalidatePath("/uz/blog");
        revalidatePath("/ru/blog");
        revalidatePath("/sitemap.xml");
        revalidatePath("/image-sitemap.xml");

        return NextResponse.json({ success: true, message: "Sayt keshi xavfsiz yangilandi" });
    } catch (error: any) {
        console.error("Revalidate All error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
