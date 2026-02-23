import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

function sidebarLink(page: import("@playwright/test").Page, href: string) {
  return page.locator(`nav a[href="${href}"]`);
}

test.describe("Sidebar navigation visibility", () => {
  test("Employee sees only Dashboard, Tasks, Daily Planning, Settings", async ({ page }) => {
    await loginAsRole(page, "employee3");

    await expect(sidebarLink(page, "/dashboard")).toBeVisible();
    await expect(sidebarLink(page, "/tasks")).toBeVisible();
    await expect(sidebarLink(page, "/daily-planning")).toBeVisible();
    await expect(sidebarLink(page, "/settings")).toBeVisible();

    await expect(sidebarLink(page, "/team")).not.toBeVisible();
    await expect(sidebarLink(page, "/productivity")).not.toBeVisible();
    await expect(sidebarLink(page, "/announcements")).not.toBeVisible();
    await expect(sidebarLink(page, "/kpi-management")).not.toBeVisible();
    await expect(sidebarLink(page, "/settings/users")).not.toBeVisible();
  });

  test("Manager sees Dashboard, Tasks, Daily Planning, Team, Productivity, Settings", async ({ page }) => {
    await loginAsRole(page, "manager");

    await expect(sidebarLink(page, "/dashboard")).toBeVisible();
    await expect(sidebarLink(page, "/tasks")).toBeVisible();
    await expect(sidebarLink(page, "/daily-planning")).toBeVisible();
    await expect(sidebarLink(page, "/team")).toBeVisible();
    await expect(sidebarLink(page, "/productivity")).toBeVisible();
    await expect(sidebarLink(page, "/settings")).toBeVisible();

    await expect(sidebarLink(page, "/announcements")).not.toBeVisible();
    await expect(sidebarLink(page, "/kpi-management")).not.toBeVisible();
    await expect(sidebarLink(page, "/settings/users")).not.toBeVisible();
  });

  test("Department Head sees Dashboard, Tasks, Daily Planning, Team, Productivity, Announcements, Settings", async ({ page }) => {
    await loginAsRole(page, "departmentHead");

    await expect(sidebarLink(page, "/dashboard")).toBeVisible();
    await expect(sidebarLink(page, "/tasks")).toBeVisible();
    await expect(sidebarLink(page, "/daily-planning")).toBeVisible();
    await expect(sidebarLink(page, "/team")).toBeVisible();
    await expect(sidebarLink(page, "/productivity")).toBeVisible();
    await expect(sidebarLink(page, "/announcements")).toBeVisible();
    await expect(sidebarLink(page, "/settings")).toBeVisible();

    await expect(sidebarLink(page, "/kpi-management")).not.toBeVisible();
    await expect(sidebarLink(page, "/settings/users")).not.toBeVisible();
  });

  test("Admin sees all nav items", async ({ page }) => {
    await loginAsRole(page, "admin");

    await expect(sidebarLink(page, "/dashboard")).toBeVisible();
    await expect(sidebarLink(page, "/tasks")).toBeVisible();
    await expect(sidebarLink(page, "/daily-planning")).toBeVisible();
    await expect(sidebarLink(page, "/team")).toBeVisible();
    await expect(sidebarLink(page, "/productivity")).toBeVisible();
    await expect(sidebarLink(page, "/announcements")).toBeVisible();
    await expect(sidebarLink(page, "/kpi-management")).toBeVisible();
    await expect(sidebarLink(page, "/settings/users")).toBeVisible();
    await expect(sidebarLink(page, "/settings")).toBeVisible();
  });
});
