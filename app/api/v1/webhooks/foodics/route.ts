import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase";

// Foodics-ready webhook (disabled until keys configured).
// Foodics sends HMAC-SHA256 in X-Foodics-Signature over raw body.
export async function POST(req: NextRequest) {
  const secret = process.env.FOODICS_SIGNING_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ ok: false, error: "foodics not configured (manual mode)" }, { status: 503 });
  }
  const raw = await req.text();
  const sig = req.headers.get("x-foodics-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Acknowledge fast (<5s), process async.
  const evt = JSON.parse(raw) as { id?: string; event?: string; order?: unknown };
  const sb = supabaseServer();
  if (sb) {
    await sb.from("webhook_events").insert({
      event_id: evt.id ?? `${Date.now()}-${Math.random()}`,
      payload: evt,
      status: "received",
    });
  }
  // TODO: map evt.event -> orders upsert (NEW->received, IN_KITCHEN->preparing, READY->ready)
  return NextResponse.json({ ok: true });
}
