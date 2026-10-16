import { NextRequest, NextResponse } from "next/server";
import { hashToken, verifyOrderToken } from "@/lib/token";
import { countAhead, getOrderById, getOrderByNumber, getOrderByTokenHash } from "@/lib/store";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ ok: false, error: "كود الطلب مطلوب" }, { status: 400 });

  const v = verifyOrderToken(token);
  if (!v) return NextResponse.json({ ok: false, error: "رابط الطلب غير صحيح أو منتهي الصلاحية" }, { status: 401 });

  // 1. Try Supabase RPC if available
  try {
    const sb = supabaseServer();
    if (sb && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { data, error } = await sb.rpc("get_order_status", { p_token_hash: hashToken(token) });
      if (!error && data && data.ok) return NextResponse.json(data);
    }
  } catch {
    // fall through to local store
  }

  // 2. Local lookup by hash, then by ID, then by order_number
  let row = await getOrderByTokenHash(hashToken(token));
  if (!row) row = await getOrderById(v.orderId);
  if (!row) row = await getOrderByNumber(v.orderId);

  if (!row) {
    return NextResponse.json({ ok: false, error: "لم يتم العثور على الطلب" }, { status: 404 });
  }

  const ahead = countAhead(row);

  return NextResponse.json({
    ok: true,
    id: row.id,
    order_number: row.order_number,
    items: row.items,
    customer_name: row.customer_name || "",
    customer_on_way: Boolean(row.customer_on_way),
    status: row.status,
    queue_ahead: ahead,
    created_at: row.created_at,
    ready_at: row.ready_at,
  });
}
