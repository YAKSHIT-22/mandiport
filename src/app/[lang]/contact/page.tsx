import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { ContactForm } from "./contact-form";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Report a data problem, suggest a crop category or export mapping, or ask Mandiport to delete your data.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <StaticPage title="Contact" path="/contact">
      <p>
        Found a wrong figure, a crop in the wrong category, or want your data deleted? Send a message. Please
        include the page address if it is about a specific page.
      </p>
      <ContactForm />
    </StaticPage>
  );
}
