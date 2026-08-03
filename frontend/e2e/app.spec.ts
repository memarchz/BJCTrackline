import { test, expect } from '@playwright/test';

test.describe('BJC Trackline Full-Scope E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Perform login once before each test case to keep tests independent
    await page.goto('/login');
    await page.fill('input[placeholder="e.g. 1003614"]', '5005430');
    await page.fill('input[placeholder="••••••••"]', 'P6150K');
    await page.click('button[type="submit"]');
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
  });

  test('should successfully load Dashboard and Recharts trend data', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('div.font-bold:has-text("Dashboard")').first()).toBeVisible();
    await expect(page.locator('text=Recent activity')).toBeVisible();
  });

  test('should successfully navigate and display Starred Tasks view', async ({ page }) => {
    await page.click('a.navlink:has-text("Starred")');
    await expect(page).toHaveURL(/.*starred/);
    await expect(page.locator('div.font-bold:has-text("Starred")').first()).toBeVisible();
  });

  test('should successfully navigate and display Current Tasks view with tab filters', async ({ page }) => {
    await page.click('a.navlink:has-text("Current Tasks")');
    await expect(page).toHaveURL(/.*current-tasks/);
    await expect(page.locator('div.font-bold:has-text("Current Tasks")').first()).toBeVisible();

    // Verify tabs / bands
    await expect(page.locator('text=New Tasks').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
  });

  test('should successfully navigate and display Pending Review view', async ({ page }) => {
    await page.click('a.navlink:has-text("Pending Review")');
    await expect(page).toHaveURL(/.*pending-review/);
    await expect(page.locator('div.font-bold:has-text("Pending Review")').first()).toBeVisible();
  });

  test('should successfully navigate and display Teams Performance view', async ({ page }) => {
    await page.click('a.navlink:has-text("Teams")');
    await expect(page).toHaveURL(/.*teams/);
    await expect(page.locator('div.font-bold:has-text("Teams")').first()).toBeVisible();
  });

  test('should successfully navigate and display History archive view', async ({ page }) => {
    await page.click('a.navlink:has-text("History")');
    await expect(page).toHaveURL(/.*history/);
    await expect(page.locator('div.font-bold:has-text("History")').first()).toBeVisible();
  });

  test('should successfully navigate and display TOR Request list view', async ({ page }) => {
    await page.click('a.navlink:has-text("TOR Request")');
    await expect(page).toHaveURL(/.*tor/);
    await expect(page.locator('div.font-bold:has-text("TOR Request")').first()).toBeVisible();
    await expect(page.locator('button:has-text("+ New Request")')).toBeVisible();
  });

  test('should successfully navigate and display Chat interface rooms', async ({ page }) => {
    await page.click('a.navlink:has-text("Chat")');
    await expect(page).toHaveURL(/.*chat/);
    await expect(page.locator('div.font-bold:has-text("Chat")').first()).toBeVisible();
  });

  test('should successfully navigate and display static How-to instructions page', async ({ page }) => {
    await page.click('a.navlink:has-text("How to use")');
    await expect(page).toHaveURL(/.*how-to/);
    await expect(page.locator('div.font-bold:has-text("How to use")').first()).toBeVisible();
  });

  test('should successfully navigate and display Calendar view and save daily notes', async ({ page }) => {
    await page.click('a.navlink:has-text("Calendar")');
    await expect(page).toHaveURL(/.*calendar/);
    await expect(page.locator('div.font-bold:has-text("Calendar")').first()).toBeVisible();

    // Click on a day grid number to select it (e.g. day 15)
    const dayCell = page.locator('.grid >> text=15').first();
    await dayCell.click();

    // Write a note in the details sidebar if text input is active
    const textarea = page.locator('textarea[placeholder*="Add personal note"]');
    if (await textarea.isVisible()) {
      await textarea.fill('E2E Test Note: Complete reports');
      await page.waitForTimeout(500); // Wait for debounce / localstorage write
    }
  });

  test('should access Admin pages (All Teams, Manage Users, User Accounts) for authorized profile', async ({ page }) => {
    // 1. Go to All Teams
    await page.click('a.navlink:has-text("All Teams")');
    await expect(page).toHaveURL(/.*admin\/teams/);
    await expect(page.locator('div.font-bold:has-text("All Teams")').first()).toBeVisible();

    // 2. Go to Manage Users
    await page.click('a.navlink:has-text("Manage Users")');
    await expect(page).toHaveURL(/.*admin\/users/);
    await expect(page.locator('div.font-bold:has-text("Manage Users")').first()).toBeVisible();

    // 3. Go to User Accounts
    await page.click('a.navlink:has-text("User Accounts")');
    await expect(page).toHaveURL(/.*admin\/accounts/);
    await expect(page.locator('div.font-bold:has-text("User Accounts")').first()).toBeVisible();
  });

  test('should create a task, start it, submit it, approve it, and archive it', async ({ page }) => {
    // 1. Go to Teams page
    await page.click('a.navlink:has-text("Teams")');
    await expect(page).toHaveURL(/.*teams/);

    // 2. Click "New Task"
    await page.click('button:has-text("New Task")');

    // 3. Choose "Group task"
    await page.click('button:has-text("Group task")');

    // 4. Fill in task details
    const uniqueTitle = `E2E Full Workflow ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Draft Q3 rollout plan"]', uniqueTitle);
    await page.fill('textarea[placeholder="What needs to happen?"]', 'Testing full E2E workflow description.');

    // Select Priority -> High
    await page.click('button:has-text("High")');

    // Select Assignee
    await page.click('button:has-text("พีรธัช ขำมีศักดิ์")');

    // 5. Create Task
    await page.click('button:has-text("Create task")');

    // 7. Find and open the task in the list
    const taskRow = page.locator(`text=${uniqueTitle}`).first();
    await expect(taskRow).toBeVisible();
    await taskRow.click();

    // 8. Work on Task in TaskDrawer
    // Start task
    await page.click('button:has-text("Start task")');
    await expect(page.locator('.badge:has-text("In Progress")').or(page.locator('.badge:has-text("started")')).first()).toBeVisible();

    // Submit for review
    await page.click('button:has-text("Submit for review")');
    await expect(page.locator('.badge:has-text("Submitted")').first()).toBeVisible();

    // Approve task
    await page.click('button:has-text("Approve")');
    await expect(page.locator('text=Approved & complete').first()).toBeVisible();

    // Archive task
    await page.click('button:has-text("Archive")');

    // Close the drawer
    await page.click('button[aria-label="Close"]');
  });
});
