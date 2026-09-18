import { getEnv } from "@/env";

/** ads.txt, generated only when an AdSense client ID is configured (SPEC §10.3). */
export function GET() {
  const client = getEnv().NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!client) return new Response("Not found", { status: 404 });
  const publisherId = client.replace(/^ca-/, "");
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
