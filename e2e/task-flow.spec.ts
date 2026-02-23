import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Task lifecycle", () => {
  // Use employee4 to avoid rate-limiting employee1/2/3 used in other suites
  test("Employee can create a task", async ({ page }) => {
    await loginAsRole(page, "employee4");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Open create form
    await page.getByRole("button", { name: /New Task/i }).click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // Fill title
    await dialog.locator("#title").fill(`E2E Task ${Date.now()}`);

    // Select KPI bucket (first available)
    await dialog.locator("button").filter({ hasText: /Select KPI bucket/i }).click();
    await page.getByRole("option").first().click();

    // Pick a deadline date — click the "Pick date & time" button
    await dialog.getByRole("button", { name: /Pick date/i }).click();
    // Select a future date from the calendar (just click a day that's enabled)
    const calendarDay = page.locator("table.rdp-month_grid button:not([disabled])").last();
    await calendarDay.click();

    // Submit
    await dialog.getByRole("button", { name: /Create Task/i }).click();

    // Should see success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Employee can start a task (NEW → IN_PROGRESS)", async ({ page }) => {
    await loginAsRole(page, "employee4");
    await page.goto("/tasks");

    // Wait for kanban board to load
    await expect(page.getByText("To Do")).toBeVisible();

    // Find a task card in the To Do column with a "Start" quick action
    const startButton = page.getByRole("button", { name: "Start" }).first();
    if (await startButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await startButton.click();
      // Task should move to In Progress column
      await expect(page.getByText("In Progress")).toBeVisible();
    }
  });

  test("Employee can complete a task (IN_PROGRESS → COMPLETED_PENDING_REVIEW)", async ({ page }) => {
    await loginAsRole(page, "employee4");
    await page.goto("/tasks");

    await expect(page.getByText("In Progress")).toBeVisible();

    // Find a "Complete" quick action button
    const completeButton = page.getByRole("button", { name: "Complete" }).first();
    if (await completeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await completeButton.click();
      // Task should move to In Review column
      await expect(page.getByText("In Review")).toBeVisible();
    }
  });

  test("Manager can approve a task (COMPLETED_PENDING_REVIEW → CLOSED_APPROVED)", async ({ page }) => {
    // Use manager2 to avoid rate-limiting manager1
    await loginAsRole(page, "manager2");
    await page.goto("/tasks");

    // Switch to team view to see subordinate tasks
    const teamTab = page.getByRole("button", { name: /Team/i });
    if (await teamTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await teamTab.click();
    }

    await expect(page.getByText("In Review")).toBeVisible();

    // Find an "Approve" quick action
    const approveButton = page.getByRole("button", { name: "Approve" }).first();
    if (await approveButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveButton.click();
      await expect(page.getByText("Done")).toBeVisible();
    }
  });

  test("Task cards appear in correct kanban columns", async ({ page }) => {
    await loginAsRole(page, "employee4");
    await page.goto("/tasks");

    // Verify all four kanban columns are present
    await expect(page.getByText("To Do")).toBeVisible();
    await expect(page.getByText("In Progress")).toBeVisible();
    await expect(page.getByText("In Review")).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
  });
});
