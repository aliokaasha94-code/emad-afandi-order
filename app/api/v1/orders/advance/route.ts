import { NextRequest, NextResponse } from "next/server";
import { AdvanceSchema } from "@/lib/validation";
import { advanceOrder } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = AdvanceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
    const row = await advanceOrder(parsed.data.orderId, parsed.data.to);
    return NextResponse.json({ ok: true, order: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    const code = msg.includes("invalid transition") ? 409 : msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
