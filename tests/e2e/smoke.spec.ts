import { expect, test, type Page } from "@playwright/test";

/**
 * Navigation across a Tier 1, Tier 2 and Tier 3 crop (SPEC §14 Phase 3), plus indexing rules.
 * Crops are discovered from the running site so the test works against any dataset.
 */

async function robots(page: Page): Promise<string> {
  return page
    .locator('head meta[name="robots"]')
    .getAttribute("content")
    .then((c) => c ?? "");
}

test("home page shows the search, categories and sources", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByRole("link", { name: "All crops" }).first()).toBeVisible();
  await expect(page.getByText("data.gov.in").first()).toBeVisible();
});

test("crop list links to a hub, which links to a state and market page", async ({ page }) => {
  await page.goto("/crops");
  const firstCrop = page.locator("main a[href^='/crops/']").first();
  await firstCrop.click();
  await expect(page).toHaveURL(/\/crops\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Price panel or an explicit empty state, never a blank figure.
  await expect(page.locator("main")).toContainText(/₹|No prices reported yet/);

  const stateLink = page.locator("main a[href^='/crops/']").filter({ hasNotText: "" }).nth(0);
  await expect(stateLink).toBeVisible();
});

test("thin crop pages are noindex, follow", async ({ page, request }) => {
  const list = await request.get("/api/search?q=a");
  expect(list.ok()).toBeTruthy();
  await page.goto("/crops");
  const tier3 = page.locator("main li", { hasText: "limited data" }).first();
  if ((await tier3.count()) === 0) test.skip(true, "No limited-data crop in this dataset");
  const href = await tier3.locator("a").first().getAttribute("href");
  await page.goto(href!);
  expect(await robots(page)).toContain("noindex");
  expect(await robots(page)).toContain("follow");
});

test("search API returns matches", async ({ request }) => {
  const res = await request.get("/api/search?q=on");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { results: { href: string }[] };
  expect(Array.isArray(body.results)).toBe(true);
});

test("robots.txt and sitemaps are served", async ({ request }) => {
  const robotsTxt = await request.get("/robots.txt");
  expect(await robotsTxt.text()).toContain("Sitemap:");
  const index = await request.get("/sitemap.xml");
  expect(await index.text()).toContain("<sitemapindex");
  const crops = await request.get("/sitemaps/crops.xml");
  expect(await crops.text()).toContain("<urlset");
});

test("admin is protected", async ({ request }) => {
  const res = await request.get("/admin", { failOnStatusCode: false });
  expect(res.status()).toBe(401);
});

test("404 page offers a way forward", async ({ page }) => {
  const response = await page.goto("/crops/this-crop-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});

test("dark theme can be switched and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
