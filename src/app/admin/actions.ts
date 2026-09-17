"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/admin-action";
import { getDb } from "@/lib/db";
import { commodities, cropMapping } from "@/lib/db/schema";

const categoryInput = z.object({
  commodityId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
});

export async function confirmCategory(formData: FormData) {
  await assertAdmin();
  const input = categoryInput.parse(Object.fromEntries(formData));
  await getDb()
    .update(commodities)
    .set({ categoryId: input.categoryId, categoryConfirmed: true })
    .where(eq(commodities.id, input.commodityId));
  revalidatePath("/admin/categories");
}

/** Confirms every commodity whose suggested category matches, in one click. */
export async function confirmAllSuggested(formData: FormData) {
  await assertAdmin();
  const categoryId = z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .parse(formData.get("categoryId") ?? undefined);
  const tier = z.coerce
    .number()
    .int()
    .min(1)
    .max(3)
    .optional()
    .parse(formData.get("tier") ?? undefined);
  await getDb()
    .update(commodities)
    .set({ categoryConfirmed: true })
    .where(
      and(
        eq(commodities.categoryConfirmed, false),
        sql`${commodities.categoryId} is not null`,
        categoryId ? eq(commodities.categoryId, categoryId) : undefined,
        tier ? eq(commodities.tier, tier) : undefined,
      ),
    );
  revalidatePath("/admin/categories");
}

const mappingInput = z.object({
  mappingId: z.coerce.number().int().positive(),
  decision: z.enum(["verify", "reject", "reset"]),
  // HS codes are 2–8 digits; entered by a human only (SPEC §6.6).
  hsCode: z
    .string()
    .trim()
    .regex(/^(\d{2}|\d{4}|\d{6}|\d{8})?$/, "HS code must be 2, 4, 6 or 8 digits")
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function reviewMapping(formData: FormData) {
  await assertAdmin();
  const input = mappingInput.parse(Object.fromEntries(formData));
  const status =
    input.decision === "verify" ? "verified" : input.decision === "reject" ? "rejected" : "suggested";
  await getDb()
    .update(cropMapping)
    .set({
      status,
      verified: status === "verified",
      hsCode: input.hsCode ? input.hsCode : null,
      ...(input.notes ? { notes: input.notes } : {}),
    })
    .where(and(eq(cropMapping.id, input.mappingId)));
  revalidatePath("/admin/mappings");
}
