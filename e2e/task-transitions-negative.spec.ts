import { test, expect, Page } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getKanbanColumn(page: Page, columnName: string) {
  const columnHeading = page.getByRole("heading", { name: columnName, level: 3 });
  await expect(columnHeading).toBeVisible({ timeout: 5_000 });
  return columnHeading.locator("xpath=ancestor::div[2]");
}

/**
 * Hover over a specific task card by name within a kanban column to reveal quick actions.
 */
async function hoverTaskCard(page: Page, columnName: string, taskName: string) {
  const column = await getKanbanColumn(page, columnName);
  const titleRegex = new RegExp(escapeRegExp(taskName));
  const taskHeading = column.getByRole("heading", { name: titleRegex, level: 4 });
  await expect(taskHeading).toBeVisible({ timeout: 5_000 });
  const taskCard = taskHeading.locator("xpath=ancestor-or-self::*[@role='button'][1]");
  await taskCard.hover();
  await page.waitForTimeout(500);
}

/**
 * Hover over the first task card in a kanban column to reveal quick actions.
 */
async function hoverFirstCardInColumn(page: Page, columnName: string) {
  const column = await getKanbanColumn(page, columnName);
  const taskHeading = column.getByRole("heading", { level: 4 }).first();
  await expect(taskHeading).toBeVisible({ timeout: 5_000 });
  const taskCard = taskHeading.locator("xpath=ancestor-or-self::*[@role='button'][1]");
  await taskCard.hover();
  await page.waitForTimeout(500);
}

test.describe("Negative task transitions", () => {
  test("Employee does NOT see Approve/Reject on own COMPLETED_PENDING_REVIEW task", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Wait for kanban board to load
    await expect(page.getByText("In Review")).toBeVisible();

    // Hover the In Review task card to reveal quick actions
    await hoverTaskCard(page, "In Review", "Update Purchase Master");

    // Withdraw should be visible (owner can withdraw)
    await expect(page.getByTitle("Withdraw")).toBeVisible();

    // Approve and Reject should NOT be visible (employee is not a manager)
    await expect(page.getByRole("button", { name: "Approve" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).not.toBeVisible();
  });

  test("Employee only sees their own tasks", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Wait for kanban board to load
    await expect(page.getByText("To Do")).toBeVisible();

    // Employee1's tasks include: "Create PO for Office Supplies", "Vendor Registration - ABC Corp",
    // "Update Purchase Master for IT Equipment"
    // Employee should NOT see other employees' tasks like "Delivery Coordination - Site A" (employee3)
    await expect(
      page.getByText("Delivery Coordination - Site A")
    ).not.toBeVisible();
  });

  test("Manager CAN see Approve/Reject on subordinate pending-review task", async ({ page }) => {
    await loginAsRole(page, "manager");
    await page.goto("/tasks");

    // Switch to team view
    const teamTab = page.getByRole("button", { name: /Team/i });
    await expect(teamTab).toBeVisible({ timeout: 5_000 });
    await teamTab.click();

    // Wait for board to load
    await expect(page.getByText("In Review")).toBeVisible();

    // Hover the In Review task card to reveal Approve/Reject
    await hoverFirstCardInColumn(page, "In Review");

    // Manager should see Approve and Reject buttons for subordinate's pending-review task
    const approveButton = page.getByRole("button", { name: "Approve" }).first();
    await expect(approveButton).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Reject" }).first()).toBeVisible();
  });

  test("Manager does NOT see non-subordinate tasks in team view", async ({ page }) => {
    // manager2's subordinates are employee4 and employee5, NOT employee1
    await loginAsRole(page, "manager2");
    await page.goto("/tasks");

    // Switch to team view
    const teamTab = page.getByRole("button", { name: /Team/i });
    await expect(teamTab).toBeVisible({ timeout: 5_000 });
    await teamTab.click();

    // Wait for board to load
    await page.waitForTimeout(1_000);

    // employee1's tasks should NOT be visible to manager2
    await expect(
      page.getByText("Update Purchase Master for IT Equipment")
    ).not.toBeVisible();
    await expect(
      page.getByText("Vendor Registration - ABC Corp")
    ).not.toBeVisible();
  });

  test("Employee sees correct quick actions per task status", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("To Do")).toBeVisible();

    // Employee1 has a NEW task: "Vendor Registration - ABC Corp"
    // Hover to reveal "Start" button
    await hoverTaskCard(page, "To Do", "Vendor Registration");
    const startButton = page.getByRole("button", { name: "Start" }).first();
    await expect(startButton).toBeVisible({ timeout: 5_000 });

    // Employee1 has an IN_PROGRESS task: "Create PO for Office Supplies"
    // Hover to reveal "Complete", "Pause", "Undo"
    await hoverTaskCard(page, "In Progress", "Create PO");
    const completeButton = page.getByRole("button", { name: "Complete" }).first();
    await expect(completeButton).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Pause" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" }).first()).toBeVisible();
  });
});
