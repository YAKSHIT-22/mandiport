import { expect, test } from "@playwright/test";

/** Tool happy paths and empty states (SPEC §14 Phase 4). Ola Maps is mocked. */

test("unit converter converts and needs no JavaScript round trip", async ({ page }) => {
  await page.goto("/tools/unit-converter");
  await page.getByRole("textbox", { name: "Price" }).fill("2500");
  await expect(page.getByText("₹25.00")).toBeVisible();
  await expect(page.getByText("₹25,000")).toBeVisible();
  await page.getByLabel("Rupees per US dollar (optional)").fill("88");
  await expect(page.getByText("$28.41")).toBeVisible();
});

test("best mandi ranks results and explains the estimate", async ({ page }) => {
  await page.route("**/api/best-mandi", async (route) => {
    await route.fulfill({
      json: {
        originLabel: "Nashik, Maharashtra",
        distancesAvailable: true,
        marketsConsidered: 12,
        results: [
          {
            marketId: 1,
            marketName: "Lasalgaon",
            marketSlug: "lasalgaon",
            district: "Nashik",
            stateName: "Maharashtra",
            stateSlug: "maharashtra",
            cropSlug: "onion",
            modalPrice: 2500,
            date: "2026-09-16",
            lat: 20.1,
            lng: 74.2,
            distanceKm: 42,
            travelMinutes: 60,
            grossValue: 50000,
            transportCost: 2520,
            netValue: 47480,
          },
        ],
      },
    });
  });
  await page.goto("/tools/best-mandi");
  await page.getByLabel("Your place").fill("Nashik");
  await page.getByRole("button", { name: "Find best mandi" }).click();
  await expect(page.getByRole("link", { name: "Lasalgaon" })).toBeVisible();
  await expect(page.getByText("₹47,480")).toBeVisible();
  await expect(page.getByText("16 Sep 2026")).toBeVisible();
  await expect(page.getByText(/Prices are as last reported/)).toBeVisible();
});

test("best mandi shows a clear message when the place is not found", async ({ page }) => {
  await page.route("**/api/best-mandi", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "We could not find “zzz”. Try a pincode or a larger nearby town." },
    }),
  );
  await page.goto("/tools/best-mandi");
  await page.getByLabel("Your place").fill("zzz");
  await page.getByRole("button", { name: "Find best mandi" }).click();
  await expect(page.getByRole("alert").first()).toContainText("could not find");
});

test("price history loads a chart and offers monthly averages per market", async ({ page }) => {
  await page.goto("/tools/price-history");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("figure:visible svg").first()).toBeVisible();
  await expect(page.getByText(/Choose a state and market/)).toBeVisible();
});

test("MSP check asks for a crop, then compares states", async ({ page }) => {
  await page.goto("/tools/msp-check");
  await expect(page.getByText("Choose a crop to compare").first()).toBeVisible();
  await page.goto("/tools/msp-check?crop=wheat");
  const body = page.locator("main");
  await expect(body).toContainText(/MSP|No MSP is published/);
});

test("export destinations explains the group and the data lag", async ({ page }) => {
  await page.goto("/tools/export-destinations");
  await expect(page.getByText("Only crops mapped to an export group")).toBeVisible();
  const options = page.locator("#crop option");
  if ((await options.count()) > 1) {
    const value = await options.nth(1).getAttribute("value");
    await page.goto(`/tools/export-destinations?crop=${value}`);
    await expect(page.locator("main")).toContainText(/Annual data with a lag|No export data is mapped/);
  }
});

test("tools are listed and reachable from the home page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /Best mandi to sell/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Best mandi to sell" })).toBeVisible();
});
