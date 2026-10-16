import { NextRequest, NextResponse } from "next/server";
import { listActive } from "@/lib/store";

export async function GET(req: NextRequest) {
  const branch = req.nextUrl.searchParams.get("branch") ?? "emad-kafrelsheikh";
  const rows = await listActive(branch, 60);
  return NextResponse.json({ ok: true, branch, count: rows.length, orders: rows });
}
