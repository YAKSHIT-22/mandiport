import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/auth/basic";

/** Basic auth for /admin (SPEC §8.1). */
export function proxy(request: NextRequest) {
  if (isAdminAuthorized(request.headers.get("authorization"))) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Mandiport admin", charset="UTF-8"',
      "X-Robots-Tag": "noindex",
    },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
