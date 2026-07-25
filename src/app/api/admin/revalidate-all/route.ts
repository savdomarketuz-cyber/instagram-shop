import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
    try {
        revalidatePath("/", "layout");
        revalidatePath("/uz", "layout");
        revalidatePath("/ru", "layout");
        revalidatePath("/sitemap.xml");

        return NextResponse.json({ success: true, message: "Sayt keshi to'liq yangilandi" });
    } catch (error: any) {
        console.error("Revalidate All error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
