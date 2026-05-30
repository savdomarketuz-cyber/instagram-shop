/**
 * Admin client helper — barcha admin o'qish/yozish operatsiyalarini
 * /api/admin/crud orqali supabaseAdmin (service role) bilan bajaradi.
 * Bu RLS ni chetlab o'tadi va xatolarni jimgina yutib yubormaydi.
 */

type OrderBy = { column: string; ascending?: boolean };

async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.error || `Admin API xatolik (${res.status})`);
    }
    return json;
}

export async function adminSelect<T = any>(
    table: string,
    opts: {
        columns?: string;
        match?: { column: string; value: any };
        in?: { column: string; values: any[] };
        orderBy?: OrderBy;
        limit?: number;
        single?: boolean;
    } = {}
): Promise<T> {
    const json = await call({
        table,
        action: "select",
        payload: { columns: opts.columns, single: opts.single },
        matchConfig: opts.match,
        inConfig: opts.in,
        orderBy: opts.orderBy,
        limit: opts.limit,
    });
    return json.data as T;
}

export async function adminInsert<T = any>(table: string, payload: any): Promise<T> {
    const json = await call({ table, action: "insert", payload });
    return json.data as T;
}

export async function adminUpdate<T = any>(
    table: string,
    payload: any,
    match: { column: string; value: any }
): Promise<T> {
    const json = await call({ table, action: "update", payload, matchConfig: match });
    return json.data as T;
}

export async function adminUpsert<T = any>(table: string, payload: any, onConflict?: string): Promise<T> {
    const json = await call({ table, action: "upsert", payload, onConflict });
    return json.data as T;
}

export async function adminDelete(table: string, match: { column: string; value: any }): Promise<void> {
    await call({ table, action: "delete", matchConfig: match });
}

export async function adminRpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const json = await call({ action: "rpc", fn, args });
    return json.data as T;
}
