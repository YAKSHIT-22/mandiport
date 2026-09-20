import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/auth/basic";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, toLocale } from "@/lib/i18n/config";

/**
 * Two jobs:
 *
 * 1. Basic auth for /admin (SPEC §8.1).
 * 2. Language. Every page lives under `app/[lang]`, but the reader's URL never carries a
 *    language: `/crops` is rewritten to `/en/crops` or `/hi/crops` from the `mp-lang` cookie.
 *    A rewrite (not a redirect) keeps one URL per page, and each language still prerenders and
 *    caches separately because the internal path differs (DECISIONS D-025).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isAdminAuthorized(request.headers.get("authorization"))) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Mandiport admin", charset="UTF-8"',
          "X-Robots-Tag": "noindex",
        },
      });
    }
    const response = rewriteToLocale(request, pathname, search);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return rewriteToLocale(request, pathname, search);
}

function rewriteToLocale(request: NextRequest, pathname: string, search: string) {
  // A path that already names a language would double up; leave it alone.
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    return NextResponse.next();
  }
  const locale = toLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const url = new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url);
  const response = NextResponse.rewrite(url);
  // Caches must not serve one reader's language to another.
  response.headers.set("Vary", "Cookie");
  if (locale !== DEFAULT_LOCALE) response.headers.set("X-Mandiport-Lang", locale);
  return response;
}

export const config = {
  // Everything except Next internals, API routes and files served from the app root.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|sitemaps|ads.txt).*)",
  ],
};
