import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Edge cases", () => {
  test("Deactivated user cannot log in", async ({ page }) => {
    // Step 1: Login as admin and deactivate employee5
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Find employee5's row (Sneha Reddy / employee5@taskflow.com)
    const employee5Row = page.locator("table tbody tr").filter({ hasText: "employee5@taskflow.com" });
    await expect(employee5Row).toBeVisible();

    // Check if already active — click the deactivate (power) button
    const deactivateBtn = employee5Row.getByRole("button").filter({ has: page.locator("svg") }).last();
    await deactivateBtn.click();

    // Confirm in alert dialog
    const alertDialog = page.locator("[role=alertdialog]");
    await expect(alertDialog).toBeVisible({ timeout: 3_000 });
    await alertDialog.getByRole("button", { name: /Deactivate|Confirm|Continue/i }).click();

    // Wait for toast confirming deactivation
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });

    // Step 2: Try to login as deactivated employee5
    await page.goto("/login");
    await page.locator("#email").waitFor({ state: "visible" });
    await page.locator("#email").fill("employee5@taskflow.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should stay on login page with error
    await page.waitForTimeout(3_000);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    // Step 3: Cleanup — reactivate employee5
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    const employee5RowAgain = page.locator("table tbody tr").filter({ hasText: "employee5@taskflow.com" });
    await expect(employee5RowAgain).toBeVisible({ timeout: 5_000 });

    const activateBtn = employee5RowAgain.getByRole("button").filter({ has: page.locator("svg") }).last();
    await activateBtn.click();

    const alertDialog2 = page.locator("[role=alertdialog]");
    await expect(alertDialog2).toBeVisible({ timeout: 3_000 });
    await alertDialog2.getByRole("button", { name: /Activate|Confirm|Continue/i }).click();

    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("mustChangePassword user is redirected to /settings", async ({ page }) => {
    // Step 1: Login as admin and create a new user
    await loginAsRole(page, "admin");
    await page.goto("/settings/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    const timestamp = Date.now();
    const newEmail = `e2e-pwd-test-${timestamp}@taskflow.com`;

    await page.getByRole("button", { name: /Create User/i }).click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/Email/i).fill(newEmail);
    await dialog.getByLabel(/First Name/i).fill("PwdTest");
    await dialog.getByLabel(/Last Name/i).fill("User");

    // Select role
    const roleSelect = dialog.locator("button").filter({ hasText: /Employee|Select role/i }).first();
    await roleSelect.click();
    await page.getByRole("option", { name: "Employee" }).click();

    // Select department
    await dialog.locator("button").filter({ hasText: /No department/i }).click();
    await page.getByRole("option").first().click();

    // Submit
    await dialog.getByRole("button", { name: /Create User/i }).click();

    // Wait for success — dialog should show "User Created Successfully" with temp password
    await expect(page.getByRole("heading", { name: "User Created Successfully" })).toBeVisible({ timeout: 10_000 });

    // Get the temporary password
    const tempPassword = await page.locator("code").first().textContent();
    expect(tempPassword).toBeTruthy();

    // Close the success dialog by clicking "Done"
    await page.getByRole("button", { name: /Done/i }).click();

    // Step 2: Navigate directly to login (effectively logging out)
    await page.goto("/login");
    await page.locator("#email").waitFor({ state: "visible" });
    await page.locator("#email").fill(newEmail);
    await page.locator("#password").fill(tempPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should be redirected to /settings?passwordChange=required
    await expect(page).toHaveURL(/\/settings\?passwordChange=required/, { timeout: 15_000 });

    // Should see the amber alert
    await expect(page.getByText("Password Change Required")).toBeVisible();
    await expect(
      page.getByText("You must change your password before you can access other parts of the application.")
    ).toBeVisible();

    // Step 3: Try navigating to /dashboard — should be redirected back
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/settings\?passwordChange=required/, { timeout: 10_000 });
  });

  test("Rate limiter blocks excessive login attempts", async ({ page }) => {
    // Use a unique email that won't conflict with other tests
    const testEmail = "ratelimit-test@taskflow.com";

    // Navigate once — stay on the same page so the client-side counter accumulates
    await page.goto("/login");
    await page.locator("#email").waitFor({ state: "visible" });

    // Attempt 6 rapid login attempts with wrong password
    for (let i = 0; i < 6; i++) {
      await page.locator("#email").clear();
      await page.locator("#email").fill(testEmail);
      await page.locator("#password").clear();
      await page.locator("#password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      // Wait for the response
      await page.waitForTimeout(1_000);
    }

    // After 6 attempts, user should still be on login page
    await expect(page).toHaveURL(/\/login/);

    // After 5+ failures the UI shows the rate-limit message
    await expect(page.getByText("Too many login attempts")).toBeVisible();
  });
});
