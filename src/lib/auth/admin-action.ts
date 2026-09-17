import { headers } from "next/headers";
import { isAdminAuthorized } from "./basic";

/** Defence in depth: server actions re-check admin credentials, not only the proxy. */
export async function assertAdmin(): Promise<void> {
  const h = await headers();
  if (!isAdminAuthorized(h.get("authorization"))) throw new Error("Not authorized");
}
