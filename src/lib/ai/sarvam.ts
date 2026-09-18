import { z } from "zod";
import { getEnv } from "@/env";

/**
 * Sarvam AI translation, behind FEATURE_TRANSLATION (SPEC §8.8). Endpoint and fields per
 * Sarvam's docs: POST https://api.sarvam.ai/translate with an `api-subscription-key` header
 * and { input, source_language_code, target_language_code, model }.
 * VERIFY with a live key before enabling: no key was available while building this.
 */

const ENDPOINT = "https://api.sarvam.ai/translate";
/** Sarvam's per-request input limit for the translate endpoint. */
const MAX_INPUT_CHARS = 1000;

const responseSchema = z.object({ translated_text: z.string() });

export class TranslationUnavailableError extends Error {
  override name = "TranslationUnavailableError";
}

/** Splits on blank lines so each chunk stays under the input limit. */
export function chunkForTranslation(text: string, limit = MAX_INPUT_CHARS): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n{2,}/)) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    // A single paragraph longer than the limit is split on sentence ends.
    if (paragraph.length <= limit) {
      current = paragraph;
    } else {
      let rest = paragraph;
      while (rest.length > limit) {
        const cut = rest.lastIndexOf(". ", limit);
        const at = cut > limit * 0.5 ? cut + 1 : limit;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function translateToHindi(text: string): Promise<string> {
  const env = getEnv();
  if (!env.FEATURE_TRANSLATION || !env.SARVAM_API_KEY)
    throw new TranslationUnavailableError("Translation is not enabled.");

  const parts: string[] = [];
  for (const chunk of chunkForTranslation(text)) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "api-subscription-key": env.SARVAM_API_KEY },
      body: JSON.stringify({
        input: chunk,
        source_language_code: "en-IN",
        target_language_code: "hi-IN",
        model: "sarvam-translate:v1",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new TranslationUnavailableError(`Sarvam HTTP ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new TranslationUnavailableError("Unexpected response from Sarvam");
    parts.push(parsed.data.translated_text);
  }
  return parts.join("\n\n");
}
