import { NextResponse } from "next/server";
import { sendOrderNotification } from "@/lib/telegram";

export async function POST(req: Request) {
    try {
        const { orderId, method } = await req.json();
        await sendOrderNotification(orderId, method);
        return NextResponse.json({ success: true });
    } catch(e) {
        return NextResponse.json({ success: false });
    }
}
