import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Department Management (Admin)", () => {
  test("Admin can see the departments table", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/admin/departments");
    await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();

    // Wait for table to load
    await expect(page.locator("table")).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test("Admin can create a department", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/admin/departments");
    await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();

    await page.getByRole("button", { name: /Create Department/i }).click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Fill name
    await dialog.getByLabel(/Name/i).fill(`E2E Dept ${Date.now()}`);
    await dialog.getByLabel(/Description/i).fill("Created by E2E test");

    // Submit
    await dialog.getByRole("button", { name: /Create Department/i }).click();

    // Wait for success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Admin can edit a department", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/admin/departments");
    await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();

    // Wait for the table
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Click edit on the first row
    const editBtn = page
      .locator("table tbody tr")
      .first()
      .getByRole("button", { name: "Edit department" });
    await editBtn.click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Modify description
    const descField = dialog.getByLabel(/Description/i);
    await descField.clear();
    await descField.fill("Updated by E2E test");

    // Submit
    await dialog.getByRole("button", { name: /Update/i }).click();

    // Wait for success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Non-admin is redirected to dashboard", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/admin/departments");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});
