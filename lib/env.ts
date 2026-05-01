import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_PRICE_S: z.string().min(1),
  STRIPE_PRICE_M: z.string().min(1),
  STRIPE_PRICE_L: z.string().min(1),

  AUTOENHANCE_API_KEY: z.string().min(1),
  AUTOENHANCE_DEV_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  AUTOENHANCE_WEBHOOK_TOKEN: z.string().min(1),

  CRON_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),

  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)),
});

export const env = schema.parse(process.env);
