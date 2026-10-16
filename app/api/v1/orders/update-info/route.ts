import { NextRequest, NextResponse } from "next/server";
import { updateCustomerDetails } from "@/lib/store";
import { verifyOrderToken } from "@/lib/token";
import { UpdateCustomerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "بيانات غير صالحة" }, { status: 400 });
    }

    const v = verifyOrderToken(parsed.data.token);
    const target = v ? v.orderId : parsed.data.token;
    const order = await updateCustomerDetails(target, {
      name: parsed.data.name,
      phone: parsed.data.phone,
    });

    return NextResponse.json({ ok: true, order });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "فشل تحديث البيانات";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
