import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

// Each test logs in independently for isolation. Uses the admin account.
test.describe("User Management (Admin)", () => {
  test("Admin can see the users table", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    // Wait for table to load
    await expect(page.locator("table")).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test("Admin can create a new user", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await page.getByRole("button", { name: /Create User/i }).click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Fill email
    await dialog.getByLabel(/Email/i).fill(`e2e-test-${Date.now()}@taskflow.com`);
    await dialog.getByLabel(/First Name/i).fill("E2E");
    await dialog.getByLabel(/Last Name/i).fill("TestUser");

    // Select role - it might already default to Employee
    const roleSelect = dialog.locator("button").filter({ hasText: /Employee|Select role/i }).first();
    await roleSelect.click();
    await page.getByRole("option", { name: "Employee" }).click();

    // Select department - defaults to "No department"
    await dialog.locator("button").filter({ hasText: /No department/i }).click();
    await page.getByRole("option").first().click();

    // Submit
    await dialog.getByRole("button", { name: /Create User/i }).click();

    // Wait for success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Admin can edit a user's role", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    // Wait for the table
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Click the edit button on the first row
    const editBtn = page.locator("table tbody tr").first().getByRole("button", { name: "Edit user" });
    await editBtn.click();

    // Dialog should appear
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Change the role via select
    const roleSelect = dialog.locator("button").filter({ hasText: /Employee|Manager|Dept Head/i }).first();
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.getByRole("option", { name: "Manager" }).click();
    }

    // Save changes
    await dialog.getByRole("button", { name: /Save|Update/i }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Admin can deactivate a user", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Click deactivate button on a row
    const deactivateBtn = page.locator("table tbody tr").last().getByRole("button", { name: "Deactivate" });
    await deactivateBtn.click();

    // Confirm in alert dialog
    const alertDialog = page.locator("[role=alertdialog]");
    await expect(alertDialog).toBeVisible({ timeout: 3_000 });
    await alertDialog.getByRole("button", { name: /Deactivate|Confirm|Continue/i }).click();

    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });
});
