import { expect, test } from "@playwright/test";

test("home page renders a single h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Mandiport");
});
