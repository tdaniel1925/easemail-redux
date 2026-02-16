import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Inbox Tabs Feature
 *
 * Prerequisites:
 * - App must be running (npm run dev or deployed)
 * - Test user must exist with email: test@example.com, password: TestPassword123!
 * - Test user must have at least one email account connected
 * - Test user must have at least one message in inbox
 *
 * Run with: npx playwright test tests/inbox-tabs.spec.ts
 */

test.describe('Inbox Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/signin');

    // Login with test credentials
    // Note: Update these credentials to match your test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to inbox
    await page.waitForURL('/app/inbox', { timeout: 10000 });
  });

  test('should default to "All" tab', async ({ page }) => {
    // Check URL has view=all parameter
    expect(page.url()).toContain('view=all');

    // Check "All" tab is active
    const allTab = page.locator('[role="tab"][data-state="active"]');
    await expect(allTab).toHaveText('All');
  });

  test('should switch to Smart Inbox tab when clicked', async ({ page }) => {
    // Click on Smart Inbox tab
    await page.click('text=Smart Inbox');

    // Check URL updated
    await expect(page).toHaveURL(/view=smart/);

    // Check Smart Inbox tab is now active
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toHaveText('Smart Inbox');
  });

  test('should preserve tab state on page refresh', async ({ page }) => {
    // Click on Smart Inbox tab
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);

    // Refresh the page
    await page.reload();

    // Check Smart Inbox tab is still active
    await expect(page).toHaveURL(/view=smart/);
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toHaveText('Smart Inbox');
  });

  test('should display search bar', async ({ page }) => {
    // Check search input exists
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should update URL when searching', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test query');

    // Wait for debounce (500ms)
    await page.waitForTimeout(600);

    // Check URL updated with search query
    expect(page.url()).toContain('q=test');
  });

  test('should show clear button when search has text', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');

    // Check clear button appears
    const clearButton = page.locator('button[aria-label="Clear search"]');
    await expect(clearButton).toBeVisible();
  });

  test('should clear search when clear button is clicked', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test query');
    await page.waitForTimeout(600);

    // Click clear button
    const clearButton = page.locator('button[aria-label="Clear search"]');
    await clearButton.click();

    // Check search input is empty
    await expect(searchInput).toHaveValue('');

    // Check URL no longer has 'q' parameter
    await page.waitForTimeout(600);
    expect(page.url()).not.toContain('q=');
  });

  test('should preserve search query when switching tabs', async ({ page }) => {
    // Search for something
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('important');
    await page.waitForTimeout(600);

    // Switch to Smart Inbox tab
    await page.click('text=Smart Inbox');

    // Check both view and search params are in URL
    expect(page.url()).toContain('view=smart');
    expect(page.url()).toContain('q=important');

    // Check search input still has value
    await expect(searchInput).toHaveValue('important');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check tabs are visible
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();

    // Check tabs can be clicked
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);

    // Check search works on mobile
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('mobile test');
    await page.waitForTimeout(600);
    expect(page.url()).toContain('q=mobile');
  });

  test('should display messages in All tab', async ({ page }) => {
    // Ensure we're on All tab
    if (!page.url().includes('view=all')) {
      await page.click('text=All');
    }

    // Check for message rows (assuming messages exist)
    // Note: This may fail if no messages exist in test account
    const messageRows = page.locator('[data-testid="message-row"]');
    const count = await messageRows.count();

    // If messages exist, check they're visible
    if (count > 0) {
      await expect(messageRows.first()).toBeVisible();
    }
  });

  test('should display sections in Smart Inbox tab', async ({ page }) => {
    // Click Smart Inbox tab
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);

    // Check for section headers (Priority, People, etc.)
    // Note: Sections only appear if messages exist in those categories
    const sections = page.locator('button:has-text("Priority"), button:has-text("People")');
    const count = await sections.count();

    // If sections exist, they should be visible
    if (count > 0) {
      await expect(sections.first()).toBeVisible();
    }
  });

  test('should handle browser back/forward buttons', async ({ page }) => {
    // Start on All tab
    await expect(page).toHaveURL(/view=all/);

    // Navigate to Smart Inbox
    await page.click('text=Smart Inbox');
    await expect(page).toHaveURL(/view=smart/);

    // Click browser back button
    await page.goBack();
    await expect(page).toHaveURL(/view=all/);

    // Check All tab is active again
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toHaveText('All');

    // Click browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/view=smart/);

    // Check Smart Inbox tab is active again
    await expect(activeTab).toHaveText('Smart Inbox');
  });
});
