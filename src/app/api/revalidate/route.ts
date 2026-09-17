import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isCronAuthorized } from "@/lib/auth/basic";

const body = z.object({
  crops: z
    .array(z.string().regex(/^[a-z0-9-]{1,90}$/))
    .max(1000)
    .default([]),
  all: z.boolean().default(false),
});

/**
 * Revalidates pages after ingestion (SPEC §6.7). `Authorization: Bearer ${CRON_SECRET}`.
 * Crop hubs are revalidated per crop; nested state/market pages via the layout path.
 */
export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { crops, all } = parsed.data;
  if (all) {
    revalidatePath("/", "layout");
  } else {
    for (const crop of crops) revalidatePath(`/crops/${crop}`, "layout");
    for (const path of ["/", "/crops", "/categories/[category]", "/sitemap.xml", "/sitemaps/[file]"]) {
      revalidatePath(path, path.includes("[") ? "page" : undefined);
    }
  }
  return NextResponse.json({ revalidated: all ? "all" : crops.length, now: Date.now() });
}
