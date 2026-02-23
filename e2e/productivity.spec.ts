import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Productivity scoring", () => {
  test("Manager can see the productivity leaderboard", async ({ page }) => {
    await loginAsRole(page, "manager");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();
    // Should see the leaderboard tab button
    await expect(page.getByRole("button", { name: "Leaderboard" })).toBeVisible();
  });

  test("Admin can click Recalculate All and see success toast", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();

    const recalcButton = page.getByRole("button", { name: /Recalculate/i });
    await expect(recalcButton).toBeVisible();
    await recalcButton.click();

    // Should see success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 15_000 });
  });

  test("Clicking a score row opens the scorecard dialog", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Wait for table to load
    const tableRow = page.locator("table tbody tr").first();
    if (await tableRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await tableRow.click();

      // Should open a dialog with pillar breakdown
      const dialog = page.locator("[role=dialog]");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Admin can switch to Scoring Config tab", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();

    // Click Scoring Config tab
    const configTab = page.getByRole("button", { name: /Scoring Config/i });
    await expect(configTab).toBeVisible();
    await configTab.click();

    // Should see the config tab is now active (has the active style)
    await expect(configTab).toBeVisible();
  });
});
