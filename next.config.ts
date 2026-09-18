import createMDX from "@next/mdx";
import type { NextConfig } from "next";

/**
 * Content Security Policy (SPEC §14 Phase 7).
 * Scripts allow 'unsafe-inline' because pages are statically generated and revalidated:
 * a per-request nonce would force every page to render dynamically, losing ISR. The inline
 * scripts we ship are our own (theme preference and JSON-LD) plus Google Analytics and
 * AdSense, which are loaded only after consent.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://pagead2.googlesyndication.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  poweredByHeader: false,
  // Fail the build on a type error rather than shipping it (lint runs in CI and pre-commit).
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default createMDX()(nextConfig);
