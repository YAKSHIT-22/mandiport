import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n/config";

/**
 * Switches between English and Hindi. A form, not a link: the choice is a cookie the proxy
 * reads, so the URL never changes, and it works with JavaScript turned off. The action reads
 * the referer rather than the pathname, which keeps every page statically rendered.
 */
export function LanguageToggle({ locale, label }: { locale: Locale; label: string }) {
  async function switchLanguage() {
    "use server";
    const next: Locale = locale === "en" ? "hi" : "en";
    const store = await cookies();
    store.set(LOCALE_COOKIE, next, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });

    const referer = (await headers()).get("referer");
    let back = "/";
    if (referer) {
      try {
        const url = new URL(referer);
        // Only ever return to a path on this site.
        back = `${url.pathname}${url.search}`;
      } catch {
        back = "/";
      }
    }
    redirect(back);
  }

  return (
    <form action={switchLanguage}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="gap-1.5"
        lang={locale === "en" ? "hi" : "en"}
      >
        <Languages aria-hidden="true" />
        {label}
      </Button>
    </form>
  );
}
