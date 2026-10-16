import fs from "fs";
import path from "path";
import { supabaseServer } from "./supabase";
import { hashToken, shortId, type OrderStatus } from "./token";

export interface OrderRow {
  id: string;
  branch_slug: string;
  order_number: string;
  items: string;
  customer_name?: string;
  customer_phone?: string;
  customer_on_way?: boolean;
  on_way_at?: string | null;
  status: OrderStatus;
  created_at: string;
  ready_at: string | null;
  token_hash: string | null;
}

const DATA_FILE = path.join(process.cwd(), "data", "orders.json");

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

// In-memory cache + file sync fallback
const mem = new Map<string, OrderRow>();
const memByHash = new Map<string, string>();
const memByNumber = new Map<string, string>();

function loadFromFile() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const list = JSON.parse(raw) as OrderRow[];
      for (const row of list) {
        mem.set(row.id, row);
        if (row.token_hash) memByHash.set(row.token_hash, row.id);
        if (row.order_number) memByNumber.set(row.order_number, row.id);
      }
    }
  } catch {
    // ignore
  }
}

function saveToFile() {
  try {
    ensureDataDir();
    const list = Array.from(mem.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

// Initial load
loadFromFile();

export function useSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function createOrder(input: {
  orderNumber: string;
  items: string;
  branchSlug: string;
  rawToken: string;
  id?: string;
  customerName?: string;
}): Promise<OrderRow> {
  const sb = supabaseServer();
  const id = input.id ?? shortId();
  const tHash = hashToken(input.rawToken);
  const row: OrderRow = {
    id,
    branch_slug: input.branchSlug,
    order_number: input.orderNumber,
    items: input.items,
    customer_name: input.customerName || "",
    customer_on_way: false,
    on_way_at: null,
    status: "received",
    created_at: new Date().toISOString(),
    ready_at: null,
    token_hash: tHash,
  };

  if (sb && useSupabase()) {
    try {
      const { error } = await sb.from("orders").insert({
        id: row.id,
        branch_slug: row.branch_slug,
        order_number: row.order_number,
        items: row.items,
        status: row.status,
        token_hash: row.token_hash,
      });
      if (!error) return row;
    } catch {
      // fallback to memory
    }
  }

  mem.set(id, row);
  if (row.token_hash) memByHash.set(row.token_hash, id);
  if (row.order_number) memByNumber.set(row.order_number, id);
  saveToFile();
  return row;
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const sb = supabaseServer();
  if (sb && useSupabase()) {
    try {
      const { data, error } = await sb.from("orders").select("*").eq("id", id).single();
      if (!error && data) return data as OrderRow;
    } catch {
      // fallback
    }
  }
  return mem.get(id) ?? null;
}

export async function getOrderByTokenHash(h: string): Promise<OrderRow | null> {
  const sb = supabaseServer();
  if (sb && useSupabase()) {
    try {
      const { data, error } = await sb.from("orders").select("*").eq("token_hash", h).single();
      if (!error && data) return data as OrderRow;
    } catch {
      // fallback
    }
  }
  const id = memByHash.get(h);
  if (!id) return null;
  return mem.get(id) ?? null;
}

export async function getOrderByNumber(num: string, branch = "emad-kafrelsheikh"): Promise<OrderRow | null> {
  const id = memByNumber.get(num);
  if (id && mem.has(id)) return mem.get(id)!;
  // search by order_number directly
  for (const r of mem.values()) {
    if (r.order_number === num && r.branch_slug === branch && r.status !== "picked_up" && r.status !== "cancelled") {
      return r;
    }
  }
  return null;
}

export async function listActive(branchSlug: string, limit = 60): Promise<OrderRow[]> {
  const sb = supabaseServer();
  if (sb && useSupabase()) {
    try {
      const { data } = await sb
        .from("orders")
        .select("*")
        .eq("branch_slug", branchSlug)
        .in("status", ["received", "preparing", "ready"])
        .order("created_at", { ascending: true })
        .limit(limit);
      if (data) return data as OrderRow[];
    } catch {
      // fallback
    }
  }

  return [...mem.values()]
    .filter((o) => o.branch_slug === branchSlug && ["received", "preparing", "ready"].includes(o.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, limit);
}

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  received: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["ready", "picked_up", "cancelled"], // allow ready -> ready for recall chime
  picked_up: [],
  cancelled: [],
};

export async function advanceOrder(orderId: string, to: OrderStatus): Promise<OrderRow> {
  let cur = await getOrderById(orderId);
  if (!cur) {
    // try finding by number
    cur = await getOrderByNumber(orderId);
  }
  if (!cur) throw new Error("order not found");
  if (!ALLOWED[cur.status].includes(to)) throw new Error(`invalid transition ${cur.status} -> ${to}`);

  const sb = supabaseServer();
  const patch: Partial<OrderRow> = {
    status: to,
    ready_at: to === "ready" ? new Date().toISOString() : cur.ready_at,
  };

  if (sb && useSupabase()) {
    try {
      await sb.from("orders").update(patch).eq("id", cur.id);
    } catch {
      // ignore
    }
  }

  const next = { ...cur, ...patch } as OrderRow;
  mem.set(cur.id, next);
  saveToFile();
  return next;
}

export async function setCustomerOnWay(orderIdOrToken: string): Promise<OrderRow> {
  let cur = await getOrderById(orderIdOrToken);
  if (!cur) {
    cur = await getOrderByTokenHash(hashToken(orderIdOrToken));
  }
  if (!cur) {
    cur = await getOrderByNumber(orderIdOrToken);
  }
  if (!cur) throw new Error("order not found");

  const next: OrderRow = {
    ...cur,
    customer_on_way: true,
    on_way_at: new Date().toISOString(),
  };

  mem.set(cur.id, next);
  saveToFile();
  return next;
}

export async function updateCustomerDetails(
  orderIdOrToken: string,
  details: { name?: string; phone?: string }
): Promise<OrderRow> {
  let cur = await getOrderById(orderIdOrToken);
  if (!cur) {
    cur = await getOrderByTokenHash(hashToken(orderIdOrToken));
  }
  if (!cur) {
    cur = await getOrderByNumber(orderIdOrToken);
  }
  if (!cur) throw new Error("order not found");

  const next: OrderRow = {
    ...cur,
    customer_name: details.name !== undefined ? details.name : cur.customer_name,
    customer_phone: details.phone !== undefined ? details.phone : cur.customer_phone,
  };

  mem.set(cur.id, next);
  saveToFile();
  return next;
}

export function countAhead(order: OrderRow): number {
  let count = 0;
  for (const o of mem.values()) {
    if (
      o.branch_slug === order.branch_slug &&
      o.id !== order.id &&
      ["received", "preparing"].includes(o.status) &&
      o.created_at < order.created_at
    ) {
      count++;
    }
  }
  return count;
}
