import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Task form validation", () => {
  test("Submit empty form shows validation errors", async ({ page }) => {
    await loginAsRole(page, "employee5");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Open create form
    await page.getByRole("button", { name: /New Task/i }).click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Submit without filling anything
    await dialog.getByRole("button", { name: /Create Task/i }).click();

    // Validation errors should appear
    await expect(
      dialog.locator("p.text-red-500", { hasText: "Title must be at least 3 characters" })
    ).toBeVisible();
    // kpiBucketId and deadline both show this error — check at least one is visible
    await expect(
      dialog.locator("p.text-red-500", { hasText: "expected string, received undefined" }).first()
    ).toBeVisible();

    // Dialog should still be open (form did NOT submit)
    await expect(dialog).toBeVisible();

    // No toast should appear (no API call was made)
    await expect(page.locator("[data-sonner-toast]")).not.toBeVisible();
  });

  test("Title too short (2 chars) shows error", async ({ page }) => {
    await loginAsRole(page, "employee5");
    await page.goto("/tasks");

    await page.getByRole("button", { name: /New Task/i }).click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Fill title with only 2 chars
    await dialog.locator("#title").fill("AB");

    // Submit
    await dialog.getByRole("button", { name: /Create Task/i }).click();

    // Title error should appear
    await expect(
      dialog.locator("p.text-red-500", { hasText: "Title must be at least 3 characters" })
    ).toBeVisible();

    // Dialog still open
    await expect(dialog).toBeVisible();
  });

  test("Fill all required fields submits successfully", async ({ page }) => {
    await loginAsRole(page, "employee5");
    await page.goto("/tasks");

    await page.getByRole("button", { name: /New Task/i }).click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Fill title (3+ chars)
    await dialog.locator("#title").fill(`Validation Test ${Date.now()}`);

    // Select KPI bucket
    await dialog.locator("button").filter({ hasText: /Select KPI bucket/i }).click();
    await page.getByRole("option").first().click();

    // Pick a deadline date
    await dialog.getByRole("button", { name: /Pick date/i }).click();
    const calendarDay = page.locator("table.rdp-month_grid button:not([disabled])").last();
    await calendarDay.click();

    // Submit
    await dialog.getByRole("button", { name: /Create Task/i }).click();

    // Dialog should close and success toast should appear
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });
});
