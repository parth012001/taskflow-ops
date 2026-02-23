import { test, expect } from "@playwright/test";
import { loginAsRole, expectRedirectToDashboard } from "./helpers/auth";

test.describe("Role-based access gates", () => {
  test.describe("Employee restrictions", () => {
    test.beforeEach(async ({ page }) => {
      // Use employee2 to avoid rate-limiting employee1 across suites
      await loginAsRole(page, "employee2");
    });

    test("Employee visiting /productivity → redirected to /dashboard", async ({ page }) => {
      await page.goto("/productivity");
      await expectRedirectToDashboard(page);
    });

    test("Employee visiting /kpi-management → redirected to /dashboard", async ({ page }) => {
      await page.goto("/kpi-management");
      await expectRedirectToDashboard(page);
    });

    test("Employee visiting /settings/users → redirected to /dashboard", async ({ page }) => {
      await page.goto("/settings/users");
      await expectRedirectToDashboard(page);
    });

    test("Employee visiting /team → redirected to /dashboard", async ({ page }) => {
      await page.goto("/team");
      await expectRedirectToDashboard(page);
    });

    test("Employee visiting /announcements → redirected to /dashboard", async ({ page }) => {
      await page.goto("/announcements");
      await expectRedirectToDashboard(page);
    });
  });

  test.describe("Manager access", () => {
    test.beforeEach(async ({ page }) => {
      // Use manager2 to spread rate limit load
      await loginAsRole(page, "manager2");
    });

    test("Manager can access /productivity", async ({ page }) => {
      await page.goto("/productivity");
      await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();
    });

    test("Manager can access /team", async ({ page }) => {
      await page.goto("/team");
      await expect(page.getByRole("heading", { name: "Team Overview" })).toBeVisible();
    });
  });

  test.describe("Admin access", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRole(page, "admin");
    });

    test("Admin can access /kpi-management", async ({ page }) => {
      await page.goto("/kpi-management");
      await expect(page.getByRole("heading", { name: "KPI Management" })).toBeVisible();
    });

    test("Admin can access /settings/users", async ({ page }) => {
      await page.goto("/settings/users");
      await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    });
  });
});
