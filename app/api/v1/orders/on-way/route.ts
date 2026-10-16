import { NextRequest, NextResponse } from "next/server";
import { setCustomerOnWay } from "@/lib/store";
import { verifyOrderToken } from "@/lib/token";
import { OnWaySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = OnWaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "كود الطلب مطلوب" }, { status: 400 });
    }

    const v = verifyOrderToken(parsed.data.token);
    const target = v ? v.orderId : parsed.data.token;
    const order = await setCustomerOnWay(target);

    return NextResponse.json({ ok: true, order });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "فشل تسجيل وصول العميل";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
