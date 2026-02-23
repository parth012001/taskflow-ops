import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "./helpers/auth";

test.describe("Authentication", () => {
  test("Employee can log in and lands on /dashboard", async ({ page }) => {
    await loginAs(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Manager can log in and lands on /dashboard", async ({ page }) => {
    await loginAs(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Admin can log in and lands on /dashboard", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Department Head can log in and lands on /dashboard", async ({ page }) => {
    await loginAs(page, TEST_USERS.departmentHead.email, TEST_USERS.departmentHead.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Invalid password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(TEST_USERS.employee.email);
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    const error = page.locator(".text-red-600");
    await expect(error).toContainText("Invalid email or password");
  });

  test("Invalid email shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nonexistent@taskflow.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    const error = page.locator(".text-red-600");
    await expect(error).toContainText("Invalid email or password");
  });
});
