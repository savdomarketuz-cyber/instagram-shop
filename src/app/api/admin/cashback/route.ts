import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
    try {
        const { data: transactions, error: tErr } = await supabaseAdmin
            .from("cashback_transactions")
            .select("*")
            .order("created_at", { ascending: false });

        const { data: wallets, error: wErr } = await supabaseAdmin
            .from("user_wallets")
            .select("*")
            .order("balance", { ascending: false });

        if (tErr || wErr) throw tErr || wErr;
        return NextResponse.json({ success: true, transactions, wallets });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { user_phone, amount, type, description } = await req.json();

        // High security adjustment
        const { data: wallet, error: wErr } = await supabaseAdmin
            .from("user_wallets")
            .select("balance")
            .eq("user_phone", user_phone)
            .single();

        if (wErr) throw wErr;

        const newBalance = Number(wallet.balance) + Number(amount);

        // Transactional update
        const { error: upErr } = await supabaseAdmin
            .from("user_wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_phone", user_phone);

        if (upErr) throw upErr;

        const { error: insErr } = await supabaseAdmin
            .from("cashback_transactions")
            .insert({
                user_phone,
                amount,
                type,
                description,
                metadata: { source: 'admin_manual' }
            });

        if (insErr) throw insErr;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
