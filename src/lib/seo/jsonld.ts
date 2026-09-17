import { DATASETS, GODL_LICENCE_URL, type DatasetKey } from "@/lib/sources";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "./site";

/** JSON-LD builders (SPEC §9.1). Plain objects; validated in unit tests. */

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl("/")}#organization`,
    name: SITE_NAME,
    url: siteUrl("/"),
    description: SITE_DESCRIPTION,
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl("/")}#website`,
    name: SITE_NAME,
    url: siteUrl("/"),
    publisher: { "@id": `${siteUrl("/")}#organization` },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl("/crops")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: siteUrl(c.path),
    })),
  };
}

export function datasetJsonLd({
  name,
  description,
  path,
  startDate,
  endDate,
  spatial,
  datasets,
  keywords,
}: {
  name: string;
  description: string;
  path: string;
  startDate: string;
  endDate: string;
  spatial: string;
  datasets: DatasetKey[];
  keywords?: string[];
}): JsonLd {
  const sources = datasets.map((k) => DATASETS[k]);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: siteUrl(path),
    temporalCoverage: `${startDate}/${endDate}`,
    spatialCoverage: { "@type": "Place", name: spatial },
    license: GODL_LICENCE_URL,
    isAccessibleForFree: true,
    creator: [...new Set(sources.map((s) => s.agency))].map((agency) => ({
      "@type": "GovernmentOrganization",
      name: agency,
    })),
    isBasedOn: sources.map((s) => s.apiUrl),
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: "Open Government Data Platform India",
      url: "https://www.data.gov.in/",
    },
    ...(keywords ? { keywords } : {}),
  };
}

export function articleJsonLd({
  headline,
  description,
  path,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: headline.slice(0, 110),
    description,
    url: siteUrl(path),
    mainEntityOfPage: siteUrl(path),
    datePublished,
    dateModified,
    author: { "@type": "Organization", name: SITE_NAME, url: siteUrl("/") },
    publisher: { "@type": "Organization", name: SITE_NAME, url: siteUrl("/") },
  };
}

/** Serializes JSON-LD safely for a <script> tag (escapes "<" to avoid breaking out of the tag). */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
