import { Page, expect } from "@playwright/test";

export const TEST_USERS = {
  admin: { email: "admin@taskflow.com", password: "password123" },
  departmentHead: { email: "head@taskflow.com", password: "password123" },
  manager: { email: "manager1@taskflow.com", password: "password123" },
  employee: { email: "employee1@taskflow.com", password: "password123" },
  // Additional accounts to spread login attempts across rate limit windows
  employee2: { email: "employee2@taskflow.com", password: "password123" },
  employee3: { email: "employee3@taskflow.com", password: "password123" },
  employee4: { email: "employee4@taskflow.com", password: "password123" },
  employee5: { email: "employee5@taskflow.com", password: "password123" },
  manager2: { email: "manager2@taskflow.com", password: "password123" },
} as const;

/**
 * Log in via the UI. Retries once after a 13-second wait if the first
 * attempt fails (to handle the 5-req/min per-email auth rate limiter).
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const attemptLogin = async () => {
    await page.goto("/login");
    await page.locator("#email").waitFor({ state: "visible" });
    await page.locator("#email").clear();
    await page.locator("#email").fill(email);
    await page.locator("#password").clear();
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  };

  await attemptLogin();

  // If we hit a rate-limit or transient error, wait for a token to refill and retry
  try {
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
  } catch {
    // Check if we're still on login page (rate-limited or error)
    if (page.url().includes("/login")) {
      // Wait for one rate-limit token to refill (~13s for 5 req / 60s window)
      await page.waitForTimeout(13_000);
      await attemptLogin();
      await page.waitForURL("**/dashboard", { timeout: 15_000 });
    }
  }
}

export async function loginAsRole(
  page: Page,
  role: keyof typeof TEST_USERS
): Promise<void> {
  const { email, password } = TEST_USERS[role];
  await loginAs(page, email, password);
}

export async function expectRedirectToDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}
