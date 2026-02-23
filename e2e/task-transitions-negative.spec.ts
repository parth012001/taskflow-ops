import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Negative task transitions", () => {
  test("Employee does NOT see Approve/Reject on own COMPLETED_PENDING_REVIEW task", async ({ page }) => {
    await loginAsRole(page, "employee");
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Wait for kanban board to load
    await expect(page.getByText("In Review")).toBeVisible();

    // Find the COMPLETED_PENDING_REVIEW task card
    const taskCard = page.locator("[data-task-card], .task-card, [class*='card']")
      .filter({ hasText: "Update Purchase Master" });

    await expect(taskCard.first()).toBeVisible({ timeout: 5_000 });
    await taskCard.first().hover();
    await page.waitForTimeout(500);

    // Withdraw should be visible (owner can withdraw)
    await expect(page.getByRole("button", { name: "Withdraw" })).toBeVisible();

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
    // Check that "Start" button is visible for it
    const startButton = page.getByRole("button", { name: "Start" }).first();
    await expect(startButton).toBeVisible({ timeout: 5_000 });

    // Employee1 has an IN_PROGRESS task: "Create PO for Office Supplies"
    // Check that "Complete", "Pause", "Undo" are visible
    const completeButton = page.getByRole("button", { name: "Complete" }).first();
    await expect(completeButton).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Pause" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" }).first()).toBeVisible();
  });
});
