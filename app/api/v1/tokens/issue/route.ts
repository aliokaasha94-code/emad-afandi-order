import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { IssueTokenSchema } from "@/lib/validation";
import { createOrder } from "@/lib/store";
import { newOrderNumber, shortId, signOrderToken } from "@/lib/token";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = IssueTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "بيانات غير صحيحة", details: parsed.error.format() }, { status: 400 });
    }

    const orderNumber = parsed.data.orderNumber?.trim() || newOrderNumber();
    const id = shortId();
    const token = signOrderToken(id);

    const row = await createOrder({
      id,
      orderNumber,
      items: parsed.data.items ?? "",
      branchSlug: parsed.data.branchSlug ?? "emad-kafrelsheikh",
      customerName: parsed.data.customerName ?? "",
      rawToken: token,
    });

    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "192.168.0.28:3000";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`).replace(/\/$/, "");

    const trackUrl = `${appUrl}/t/${token}`;
    const qrDataUrl = await QRCode.toDataURL(trackUrl, {
      width: 380,
      margin: 1,
      color: {
        dark: "#121517",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      ok: true,
      order: row,
      token,
      trackUrl,
      qrDataUrl,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "حدث خطأ أثناء إنشاء الطلب";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
