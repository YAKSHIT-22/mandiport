"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/cache/ratelimit";
import { getDb } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email address").max(200),
  message: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters")
    .max(4000, "Keep it under 4,000 characters"),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export type ContactState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(formData);
  if (typeof raw.website === "string" && raw.website.length > 0) {
    // Pretend success to bots.
    return { status: "sent" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit("contact", ip, [
    { limit: 3, windowSeconds: 600 },
    { limit: 10, windowSeconds: 86_400 },
  ]);
  if (!limit.ok)
    return { status: "error", message: "You have sent several messages recently. Please try again later." };

  await getDb()
    .insert(contactMessages)
    .values({ name: parsed.data.name, email: parsed.data.email, message: parsed.data.message });
  return { status: "sent" };
}
