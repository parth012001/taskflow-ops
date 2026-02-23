import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Search and filters", () => {
  test("Search by title filters the board", async ({ page }) => {
    // employee3 owns "Delivery Coordination - Site A"
    await loginAsRole(page, "employee3");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Type in search box
    await page.getByPlaceholder("Search tasks...").fill("Delivery");

    // Wait for debounce (300ms) + API response
    await page.waitForTimeout(500);

    // The matching task should be visible
    await expect(page.getByText("Delivery Coordination")).toBeVisible();

    // Clear search
    await page.getByPlaceholder("Search tasks...").clear();

    // Wait for debounce + refetch
    await page.waitForTimeout(500);
  });

  test("Search with no results shows empty board", async ({ page }) => {
    await loginAsRole(page, "employee3");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Search for something that doesn't exist
    await page.getByPlaceholder("Search tasks...").fill("xyznonexistent123");

    // Wait for debounce + API response, then assert card disappears
    await expect(page.getByText("Delivery Coordination")).not.toBeVisible({ timeout: 10_000 });
  });

  test("Status filter narrows the board", async ({ page }) => {
    // employee1 has tasks in NEW, IN_PROGRESS, and COMPLETED_PENDING_REVIEW
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();

    // Click the Status filter button
    await page.getByRole("button", { name: /Status/i }).click();

    // Select "New" checkbox in the popover
    const newCheckbox = page.locator("label").filter({ hasText: "New" }).first();
    await newCheckbox.click();

    // Close the popover by clicking outside
    await page.getByRole("heading", { name: "Tasks" }).click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // "Vendor Registration - ABC Corp" (NEW) should be visible
    await expect(page.getByText("Vendor Registration - ABC Corp")).toBeVisible();

    // "Create PO for Office Supplies" (IN_PROGRESS) should NOT be visible
    await expect(page.getByText("Create PO for Office Supplies")).not.toBeVisible();
  });

  test("Clear all filters resets the board", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();

    // Apply a status filter first
    await page.getByRole("button", { name: /Status/i }).click();
    const newCheckbox = page.locator("label").filter({ hasText: "New" }).first();
    await newCheckbox.click();
    await page.getByRole("heading", { name: "Tasks" }).click();
    await page.waitForTimeout(500);

    // Verify filter is active - "Clear all" button should appear
    await expect(page.getByRole("button", { name: /Clear all/i })).toBeVisible();

    // Click "Clear all"
    await page.getByRole("button", { name: /Clear all/i }).click();

    // Wait for refetch
    await page.waitForTimeout(500);

    // Tasks from multiple statuses should be visible again
    await expect(page.getByText("Vendor Registration - ABC Corp")).toBeVisible();
    await expect(page.getByText("Create PO for Office Supplies")).toBeVisible();
  });
});
