import { createHmac, randomBytes, createHash, timingSafeEqual } from "crypto";

export type OrderStatus = "received" | "preparing" | "ready" | "picked_up" | "cancelled";

export const STATUS_AR: Record<OrderStatus, string> = {
  received: "استلمنا طلبك",
  preparing: "قيد التحضير",
  ready: "طلبك جاهز!",
  picked_up: "تم الاستلام",
  cancelled: "ملغي",
};

export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "ready",
  ready: "picked_up",
  picked_up: null,
  cancelled: null,
};

function getSecret(): string {
  return process.env.QR_SECRET ?? "emad-effendi-order-ready-secret-key-32chars-min";
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

/** Create signed token: payloadB64.sigB64 where payload = {oid, exp} */
export function signOrderToken(orderId: string, ttlSeconds = 4 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = JSON.stringify({ oid: orderId, exp });
  const pB64 = b64urlEncode(Buffer.from(payload, "utf8"));
  const sig = createHmac("sha256", getSecret()).update(pB64).digest();
  return `${pB64}.${b64urlEncode(sig)}`;
}

export function verifyOrderToken(token: string): { orderId: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length === 2) {
      const [pB64, sB64] = parts;
      const expected = createHmac("sha256", getSecret()).update(pB64).digest();
      const got = b64urlDecode(sB64);
      if (got.length === expected.length && timingSafeEqual(got, expected)) {
        const payload = JSON.parse(b64urlDecode(pB64).toString("utf8")) as { oid: string; exp: number };
        if (payload.oid && payload.exp && payload.exp * 1000 >= Date.now()) {
          return { orderId: payload.oid, exp: payload.exp };
        }
      }
    }
    // Fallback: Support direct order IDs or numbers (e.g. /t/1 or /t/24)
    if (token && token.length <= 64) {
      return { orderId: token, exp: Math.floor(Date.now() / 1000) + 14400 };
    }
    return null;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newOrderNumber(prefix = ""): string {
  const n = Math.floor(1 + Math.random() * 99);
  return prefix ? `${prefix}-${n}` : String(n);
}

export function shortId(): string {
  return randomBytes(6).toString("hex");
}
