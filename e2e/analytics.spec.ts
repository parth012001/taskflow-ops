import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

// Analytics tests require the productivity seed overlay.
// Run with: PRODUCTIVITY_OVERLAY=true npx playwright test e2e/analytics.spec.ts
test.skip(process.env.PRODUCTIVITY_OVERLAY !== "true", "requires PRODUCTIVITY_OVERLAY=true");

test.describe("Analytics page", () => {
  test("Admin can access /analytics and sees all sections", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/analytics");

    // Page header
    await expect(page.getByRole("heading", { name: "Company Health" })).toBeVisible();

    // Health score hero - gauge should be visible
    await expect(page.locator("svg circle").first()).toBeVisible({ timeout: 10_000 });

    // Pillar cards
    await expect(page.getByText("Output")).toBeVisible();
    await expect(page.getByText("Quality")).toBeVisible();
    await expect(page.getByText("Reliability")).toBeVisible();
    await expect(page.getByText("Consistency")).toBeVisible();

    // Alerts panel
    await expect(page.getByText("At Risk")).toBeVisible();
    await expect(page.getByText("Unscorable")).toBeVisible();

    // Score distribution chart
    await expect(page.getByText("Score Distribution")).toBeVisible();

    // Company trend chart
    await expect(page.getByText("Company Trend")).toBeVisible();

    // Department comparison
    await expect(page.getByText("Department Comparison")).toBeVisible();
  });

  test("Department Head can access /analytics", async ({ page }) => {
    await loginAsRole(page, "departmentHead");
    await page.goto("/analytics");

    await expect(page.getByRole("heading", { name: "Company Health" })).toBeVisible();
  });

  test("Manager is redirected away from /analytics", async ({ page }) => {
    await loginAsRole(page, "manager");
    await page.goto("/analytics");

    // Should be redirected to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Company Health" })).not.toBeVisible();
  });

  test("Employee is redirected away from /analytics", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/analytics");

    // Should be redirected to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Company Health" })).not.toBeVisible();
  });

  test("Trend chart responds to period selector", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/analytics");

    // Wait for trend chart to load
    await expect(page.getByText("Company Trend")).toBeVisible({ timeout: 10_000 });

    // Wait for initial chart data to render (recharts legend items)
    await expect(page.locator(".recharts-legend-item").first()).toBeVisible({ timeout: 10_000 });

    // The selector should be visible
    const selector = page.locator("[role='combobox']").first();
    await expect(selector).toBeVisible();

    // Intercept the trends API call triggered by period change
    const trendsResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/analytics/company-trends") && resp.url().includes("weeks=4"),
      { timeout: 10_000 }
    );

    // Change period to 4 weeks
    await selector.click();
    const option = page.getByRole("option", { name: "4 weeks" });
    await expect(option).toBeVisible();
    await option.click();

    // Verify the API was called with the new period
    const response = await trendsResponse;
    expect(response.status()).toBe(200);
  });
});
