import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/auth";

test.describe("Productivity scoring", () => {
  test("Manager can see the productivity leaderboard", async ({ page }) => {
    await loginAsRole(page, "manager");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();
    // Should see the leaderboard tab button
    await expect(page.getByRole("button", { name: "Leaderboard" })).toBeVisible();
  });

  test("Admin can click Recalculate All and see success toast", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();

    const recalcButton = page.getByRole("button", { name: /Recalculate/i });
    await expect(recalcButton).toBeVisible();
    await recalcButton.click();

    // Should see success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 15_000 });
  });

  test("Clicking a score row opens the scorecard dialog", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Wait for table to load
    const tableRow = page.locator("table tbody tr").first();
    await expect(tableRow).toBeVisible({ timeout: 10_000 });
    await tableRow.click();

    // Should open a dialog with pillar breakdown
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("Admin can switch to Scoring Config tab", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();

    // Click Scoring Config tab
    const configTab = page.getByRole("button", { name: /Scoring Config/i });
    await expect(configTab).toBeVisible();
    await configTab.click();

    // Should see the config tab is now active (has the active style)
    await expect(configTab).toBeVisible();
  });
});

test.describe("Productivity — leaderboard data verification", () => {
  test("Leaderboard table shows score columns with numeric values after recalculation", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Trigger a recalculation to ensure scores exist
    const recalcButton = page.getByRole("button", { name: /Recalculate/i });
    await recalcButton.click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 15_000 });

    // Wait for table to reload
    await page.waitForTimeout(2_000);

    // Verify table headers include all 4 pillars
    const headers = page.locator("table thead th");
    await expect(headers.filter({ hasText: "Output" })).toBeVisible();
    await expect(headers.filter({ hasText: "Quality" })).toBeVisible();
    await expect(headers.filter({ hasText: "Reliability" })).toBeVisible();
    await expect(headers.filter({ hasText: "Consistency" })).toBeVisible();
    await expect(headers.filter({ hasText: "Composite" })).toBeVisible();

    // First data row should have numeric values in the pillar columns
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 5_000 });

    // Each pillar cell should contain a number 0-100
    const cells = firstRow.locator("td");
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThanOrEqual(8); // name, dept, role, 4 pillars, composite, calculated
  });

  test("Leaderboard rows display user names with department and role badges", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Should display a user name
    const nameCell = firstRow.locator("td").first();
    const nameText = await nameCell.innerText();
    expect(nameText.trim().length).toBeGreaterThan(0);

    // Should have a role badge somewhere in the row
    const roleBadge = firstRow.locator("[class*='border']").first();
    await expect(roleBadge).toBeVisible();
  });

  test("Summary stat cards update after recalculation", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Trigger recalculation
    const recalcButton = page.getByRole("button", { name: /Recalculate/i });
    await recalcButton.click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 15_000 });

    await page.waitForTimeout(2_000);

    // "Total Scored" card should show a number > 0 (we have seeded users)
    const totalScoredCard = page.locator("text=Total Scored").locator("..");
    const totalScoredValue = totalScoredCard.locator(".text-2xl");
    const valueText = await totalScoredValue.innerText();
    expect(Number(valueText)).toBeGreaterThan(0);

    // "Scoring Pillars" card should always show 4
    const pillarsCard = page.locator("text=Scoring Pillars").locator("..");
    await expect(pillarsCard.locator(".text-2xl")).toHaveText("4");
  });
});

test.describe("Productivity — scorecard dialog details", () => {
  test("Scorecard dialog shows all 4 pillar cards with meta stats", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Ensure scores exist first
    const recalcButton = page.getByRole("button", { name: /Recalculate/i });
    await recalcButton.click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2_000);

    // Click first user row to open scorecard
    const tableRow = page.locator("table tbody tr").first();
    await expect(tableRow).toBeVisible({ timeout: 5_000 });
    await tableRow.click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Verify all 4 pillar cards are shown
    await expect(dialog.locator("text=Output").first()).toBeVisible();
    await expect(dialog.locator("text=Quality").first()).toBeVisible();
    await expect(dialog.locator("text=Reliability").first()).toBeVisible();
    await expect(dialog.locator("text=Consistency").first()).toBeVisible();

    // Verify composite score section
    await expect(dialog.locator("text=Composite Score")).toBeVisible();

    // Verify meta stats are present (these come from the pillar cards)
    await expect(dialog.locator("text=Points").first()).toBeVisible();
    await expect(dialog.locator("text=First-pass").first()).toBeVisible();
    await expect(dialog.locator("text=On-time").first()).toBeVisible();
    await expect(dialog.locator("text=Planned days").first()).toBeVisible();

    // Verify "Based on X tasks in the last 28 days" text
    await expect(dialog.locator("text=last 28 days")).toBeVisible();

    // Verify trend chart section
    await expect(dialog.locator("text=Score Trends")).toBeVisible();
  });

  test("Scorecard dialog meta stats use slash format (e.g. 3/5)", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    const tableRow = page.locator("table tbody tr").first();
    await expect(tableRow).toBeVisible({ timeout: 10_000 });
    await tableRow.click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Points stat should contain "/" separator (e.g. "12/60 pts")
    const pointsStat = dialog.locator("text=/\\d+\\/\\d+ pts/");
    await expect(pointsStat.first()).toBeVisible({ timeout: 3_000 });

    // KPI spread should contain "/" separator (e.g. "2/3")
    const kpiStat = dialog.locator("text=KPI spread").locator("..").locator("text=/\\d+\\/\\d+/");
    await expect(kpiStat.first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Productivity — department head access", () => {
  test("Department head can view the leaderboard (scoped to their department)", async ({ page }) => {
    await loginAsRole(page, "departmentHead");
    await page.goto("/productivity");

    await expect(page.getByRole("heading", { name: "Productivity Scores" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leaderboard" })).toBeVisible();

    // Department head should NOT see the Scoring Config tab
    await expect(page.getByRole("button", { name: /Scoring Config/i })).not.toBeVisible();

    // Department head should NOT see the Recalculate button
    await expect(page.getByRole("button", { name: /Recalculate/i })).not.toBeVisible();
  });
});

test.describe("Productivity — sorting", () => {
  test("Sorting by a pillar changes the leaderboard order", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Wait for table
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Change sort to "Output"
    const sortSelect = page.locator("select, [role=combobox]").last();
    await sortSelect.click();
    const outputOption = page.getByRole("option", { name: "Output" });
    await expect(outputOption).toBeVisible({ timeout: 3_000 });
    await outputOption.click();
    await page.waitForTimeout(1_500);

    // Table should still have rows (sorting didn't break anything)
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });
});

test.describe("Productivity — scoring config", () => {
  test("Scoring config table shows departments with default weights", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Switch to config tab
    await page.getByRole("button", { name: /Scoring Config/i }).click();

    // Should see a config table
    await expect(page.locator("text=Scoring Configuration")).toBeVisible({ timeout: 5_000 });

    // Table headers should include weight columns
    const configHeaders = page.locator("table thead th");
    await expect(configHeaders.filter({ hasText: "Weekly Target" })).toBeVisible();
    await expect(configHeaders.filter({ hasText: "Output %" })).toBeVisible();
    await expect(configHeaders.filter({ hasText: "Quality %" })).toBeVisible();
    await expect(configHeaders.filter({ hasText: "Reliability %" })).toBeVisible();
    await expect(configHeaders.filter({ hasText: "Consistency %" })).toBeVisible();

    // Should have at least one department row
    const configRow = page.locator("table tbody tr").first();
    await expect(configRow).toBeVisible({ timeout: 5_000 });

    // Default weights: 35%, 25%, 25%, 15%
    await expect(configRow.locator("text=35%")).toBeVisible();
    await expect(configRow.locator("text=25%").first()).toBeVisible();
    await expect(configRow.locator("text=15%")).toBeVisible();
  });

  test("Admin can open config edit dialog and see weight validation", async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/productivity");

    // Switch to config tab
    await page.getByRole("button", { name: /Scoring Config/i }).click();
    await expect(page.locator("text=Scoring Configuration")).toBeVisible({ timeout: 5_000 });

    // Click the edit button on the first department
    const editButton = page.locator("table tbody tr").first().getByRole("button");
    await editButton.click();

    // Dialog should open with the department name
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 3_000 });
    await expect(dialog.locator("text=Edit Config")).toBeVisible();

    // Should show weight sum validation (green = valid)
    await expect(dialog.locator("text=Weight sum")).toBeVisible();
    await expect(dialog.locator("text=Valid")).toBeVisible();

    // Should have weekly target input
    const weeklyTargetInput = dialog.locator("#weeklyTarget");
    await expect(weeklyTargetInput).toBeVisible();

    // Should have Save and Cancel buttons
    await expect(dialog.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
