import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated accessibility checks on key pages (SPEC §12). */
const PAGES = ["/", "/crops", "/methodology", "/contact"];

for (const path of PAGES) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  });
}

test("crop hub passes in dark theme too", async ({ page }) => {
  await page.goto("/crops");
  const href = await page.locator("main a[href^='/crops/']").first().getAttribute("href");
  await page.goto(href!);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});
