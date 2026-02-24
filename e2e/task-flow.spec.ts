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

async function getTaskCardInColumn(page: Page, columnName: string, taskTitle: string) {
  const column = await getKanbanColumn(page, columnName);
  const titleRegex = new RegExp(escapeRegExp(taskTitle));
  const taskHeading = column.getByRole("heading", { name: titleRegex, level: 4 });
  await expect(taskHeading).toBeVisible({ timeout: 5_000 });
  return taskHeading.locator("xpath=ancestor-or-self::*[@role='button'][1]");
}

/**
 * Hover over a task card to reveal its quick action buttons.
 * Task cards are button elements containing the task title text.
 */
async function hoverTaskCard(page: Page, taskTitle: string) {
  const taskCard = page.getByRole("button", { name: new RegExp(escapeRegExp(taskTitle)) }).first();
  await expect(taskCard).toBeVisible({ timeout: 5_000 });
  await taskCard.hover();
  await page.waitForTimeout(500);
}

async function createTask(page: Page, title: string) {
  await page.getByRole("button", { name: /New Task/i }).click();
  const dialog = page.locator("[role=dialog]");
  await expect(dialog).toBeVisible();

  await dialog.locator("#title").fill(title);
  await dialog.locator("button").filter({ hasText: /Select KPI bucket/i }).click();
  await page.getByRole("option").first().click();

  await dialog.getByRole("button", { name: /Pick date/i }).click();
  const calendarDay = page.locator("table.rdp-month_grid button:not([disabled])").last();
  await calendarDay.click();

  await dialog.getByRole("button", { name: /Create Task/i }).click();
  await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10_000 });
}

async function expectTaskInColumn(page: Page, columnName: string, taskTitle: string) {
  const column = await getKanbanColumn(page, columnName);
  const titleRegex = new RegExp(escapeRegExp(taskTitle));
  await expect(column.getByRole("heading", { name: titleRegex, level: 4 })).toBeVisible({ timeout: 5_000 });
}

async function resetSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
}

async function waitForTransition(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/tasks/") &&
      response.url().endsWith("/transition") &&
      response.status() === 200
  );
}

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

    const title = `E2E Start ${Date.now()}`;
    await createTask(page, title);
    await expectTaskInColumn(page, "To Do", title);

    const taskCard = await getTaskCardInColumn(page, "To Do", title);
    await taskCard.hover();

    const startButton = taskCard.getByTitle("Start");
    await expect(startButton).toBeVisible({ timeout: 5_000 });
    const startResponse = waitForTransition(page);
    await startButton.click();
    await startResponse;

    // Task should move to In Progress column
    await expectTaskInColumn(page, "In Progress", title);
  });

  test("Employee can complete a task (IN_PROGRESS → COMPLETED_PENDING_REVIEW)", async ({ page }) => {
    await loginAsRole(page, "employee4");
    await page.goto("/tasks");

    await expect(page.getByText("In Progress")).toBeVisible();

    const title = `E2E Complete ${Date.now()}`;
    await createTask(page, title);
    await expectTaskInColumn(page, "To Do", title);

    const toDoCard = await getTaskCardInColumn(page, "To Do", title);
    await toDoCard.hover();
    const startButton = toDoCard.getByTitle("Start");
    await expect(startButton).toBeVisible({ timeout: 5_000 });
    const startResponse = waitForTransition(page);
    await startButton.click();
    await startResponse;
    await expectTaskInColumn(page, "In Progress", title);

    const inProgressCard = await getTaskCardInColumn(page, "In Progress", title);
    await inProgressCard.hover();

    const completeButton = inProgressCard.getByTitle("Complete");
    await expect(completeButton).toBeVisible({ timeout: 5_000 });
    const completeResponse = waitForTransition(page);
    await completeButton.click();
    await completeResponse;

    // Task should move to In Review column
    await expectTaskInColumn(page, "In Review", title);
  });

  test("Manager can approve a task (COMPLETED_PENDING_REVIEW → CLOSED_APPROVED)", async ({ page }) => {
    const title = `E2E Approve ${Date.now()}`;

    await loginAsRole(page, "employee4");
    await page.goto("/tasks");
    await createTask(page, title);
    await expectTaskInColumn(page, "To Do", title);

    const toDoCard = await getTaskCardInColumn(page, "To Do", title);
    await toDoCard.hover();
    const startButton = toDoCard.getByTitle("Start");
    await expect(startButton).toBeVisible({ timeout: 5_000 });
    const startResponse = waitForTransition(page);
    await startButton.click();
    await startResponse;
    await expectTaskInColumn(page, "In Progress", title);

    const inProgressCard = await getTaskCardInColumn(page, "In Progress", title);
    await inProgressCard.hover();
    const completeButton = inProgressCard.getByTitle("Complete");
    await expect(completeButton).toBeVisible({ timeout: 5_000 });
    const completeResponse = waitForTransition(page);
    await completeButton.click();
    await completeResponse;
    await expectTaskInColumn(page, "In Review", title);

    await resetSession(page);

    // Use manager2 to avoid rate-limiting manager1
    await loginAsRole(page, "manager2");
    await page.goto("/tasks");

    // Switch to team view to see subordinate tasks
    const teamTab = page.getByRole("button", { name: /Team/i });
    await expect(teamTab).toBeVisible({ timeout: 5_000 });
    await teamTab.click();

    await expect(page.getByText("In Review")).toBeVisible();

    const inReviewCard = await getTaskCardInColumn(page, "In Review", title);
    await inReviewCard.hover();

    const approveButton = inReviewCard.getByTitle("Approve");
    await expect(approveButton).toBeVisible({ timeout: 5_000 });
    const approveResponse = waitForTransition(page);
    await approveButton.click();
    await approveResponse;
    await expect(page.getByText("Done")).toBeVisible();
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
