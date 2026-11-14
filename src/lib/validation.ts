import { z } from "zod";
import { CURRENCY_CODES } from "./currencies";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const createExpenseSchema = z.object({
  groupId: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(200),
  amountCents: z.number().int().positive("Enter a valid amount"),
  currency: z
    .enum(CURRENCY_CODES, { error: "Pick a supported currency" })
    .default("EUR"),
  fxRate: z.number().finite().positive().max(10000).optional(),
  splitType: z.enum(["equal", "exact", "percent"]),
  participantIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one participant"),
  values: z.record(z.string(), z.number().int()).default({}),
});
