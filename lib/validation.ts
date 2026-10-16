import { z } from "zod";

export const IssueTokenSchema = z.object({
  orderNumber: z.string().min(1).max(24).optional(),
  items: z.string().max(300).optional().default(""),
  branchSlug: z.string().min(2).max(60).optional().default("emad-kafrelsheikh"),
  customerName: z.string().max(60).optional().default(""),
});

export const AdvanceSchema = z.object({
  orderId: z.string().min(1).max(64),
  to: z.enum(["received", "preparing", "ready", "picked_up", "cancelled"]),
});

export const StatusQuerySchema = z.object({
  token: z.string().min(1).max(500),
});

export const OnWaySchema = z.object({
  token: z.string().min(1).max(500),
});

export const UpdateCustomerSchema = z.object({
  token: z.string().min(1).max(500),
  name: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
});
