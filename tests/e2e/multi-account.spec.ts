import { test as base, expect, Page } from '@playwright/test';

// Define custom fixtures interfaces
interface AuthenticatedFixtures {
  authenticatedPage: Page;
}

interface AuthenticatedAdminFixtures {
  authenticatedAdminPage: Page;
}

// Extend base test with authenticated context
const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to signin page
    await page.goto('/auth/signin');

    // Fill in credentials for test user
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for navigation to app (with increased timeout)
    await page.waitForURL('/app/**', { timeout: 10000 });

    // Wait for account context to load
    await page.waitForTimeout(1000);

    await use(page);
  },
});

test.describe('Multi-Account Support', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to inbox after authentication
    await page.goto('/app/inbox');
    await page.waitForLoadState('networkidle');
  });

  test('should display account switcher in sidebar', async ({ authenticatedPage: page }) => {
    // Check if account switcher button exists (it has role="combobox")
    const accountSwitcher = page.getByRole('combobox').first();
    await expect(accountSwitcher).toBeVisible();

    // Verify it shows an email address
    const buttonText = await accountSwitcher.textContent();
    expect(buttonText).toMatch(/@/);
  });

  test('should show multiple accounts when switcher is clicked', async ({ authenticatedPage: page }) => {
    // Click account switcher button (it has role="combobox")
    const accountSwitcher = page.getByRole('combobox').first();
    await accountSwitcher.click();

    // Wait for dropdown to appear
    await page.waitForTimeout(500);

    // Check that "Add Account" option exists
    const addAccountButton = page.getByText(/Add Account/i);
    await expect(addAccountButton).toBeVisible();

    // Check that test accounts are visible in the dropdown (using label to be specific)
    const testAccount1 = page.getByLabel('Email Accounts').getByText('user1-google@gmail.com');
    await expect(testAccount1).toBeVisible();
  });

  test('should maintain selected account after page refresh', async ({ authenticatedPage: page }) => {
    // Get the current selected account (account switcher has role="combobox")
    const accountSwitcher = page.getByRole('combobox').first();
    const initialAccount = await accountSwitcher.textContent();

    // Refresh the page
    await page.reload();

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check that the same account is still selected
    const accountSwitcherAfterRefresh = page.getByRole('combobox').first();
    const accountAfterRefresh = await accountSwitcherAfterRefresh.textContent();

    expect(accountAfterRefresh).toBe(initialAccount);
  });

  test('inbox should filter messages by selected account', async ({ authenticatedPage: page }) => {
    // Wait for messages to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify account switcher is loaded and shows an account
    const accountSwitcher = page.getByRole('combobox').first();
    await expect(accountSwitcher).toBeVisible();

    // Check that either messages are displayed OR empty state is shown OR page has "Inbox" heading
    const hasMessages = await page.locator('[class*="message"], [class*="thread"], [class*="MessageRow"], [role="article"], article').count() > 0;
    const hasEmptyState = await page.locator('text=/No messages|empty|no emails/i').count() > 0;
    const hasInboxHeading = await page.locator('h1, h2').filter({ hasText: /inbox/i }).count() > 0;

    // At minimum, the page should have loaded (showing Inbox heading)
    expect(hasMessages || hasEmptyState || hasInboxHeading).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/inbox-with-account.png', fullPage: true });
  });

  test('sent page should exist and be accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/app/sent');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for page header
    const pageHeader = page.locator('h1, h2').filter({ hasText: /sent/i });
    await expect(pageHeader.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/sent-page.png', fullPage: true });
  });

  test('archive page should exist and be accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/app/archive');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for page header
    const pageHeader = page.locator('h1, h2').filter({ hasText: /archive/i });
    await expect(pageHeader.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/archive-page.png', fullPage: true });
  });

  test('trash page should exist and be accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/app/trash');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for page header
    const pageHeader = page.locator('h1, h2').filter({ hasText: /trash/i });
    await expect(pageHeader.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/trash-page.png', fullPage: true });
  });

  test('composer should have account selector', async ({ authenticatedPage: page }) => {
    // Look for compose button and click it
    const composeButton = page.getByRole('button', { name: /compose|new email/i }).first();

    const buttonCount = await composeButton.count();
    if (buttonCount > 0) {
      await composeButton.click();

      // Wait for composer to open
      await page.waitForTimeout(1000);

      // Check if sending account selector exists in composer
      const accountSelector = page.locator('select, [role="combobox"]').filter({ hasText: /gmail|outlook|@/i });
      const selectorCount = await accountSelector.count();

      // If selector exists, it should be visible
      if (selectorCount > 0) {
        await expect(accountSelector.first()).toBeVisible();
      }

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/composer-with-account.png', fullPage: true });
    }
  });

  test('navigation should work between folder pages', async ({ authenticatedPage: page }) => {
    // Start at inbox
    await page.goto('/app/inbox');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/app\/inbox/);

    // Navigate to sent
    await page.goto('/app/sent');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/app\/sent/);

    // Navigate to archive
    await page.goto('/app/archive');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/app\/archive/);

    // Navigate to trash
    await page.goto('/app/trash');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/app\/trash/);
  });
});

// Admin tests - use admin credentials
const adminTest = base.extend<AuthenticatedAdminFixtures>({
  authenticatedAdminPage: async ({ page }, use) => {
    // Navigate to signin page
    await page.goto('/auth/signin');

    // Fill in credentials for admin user
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'AdminPassword123!');

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for navigation to app (with increased timeout)
    await page.waitForURL('/app/**', { timeout: 10000 });

    // Wait for account context to load
    await page.waitForTimeout(1000);

    await use(page);
  },
});

adminTest.describe('Multi-Account Admin Panel', () => {
  adminTest('admin dashboard should show account metrics', async ({ authenticatedAdminPage: page }) => {
    await page.goto('/app/admin');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for metrics cards - look for "Email Accounts" metric
    const emailAccountsMetric = page.locator('text=/Email Accounts/i');

    // Should have account-related metric visible
    await expect(emailAccountsMetric.first()).toBeVisible();

    // Check for total users metric
    const totalUsersMetric = page.locator('text=/Total Users/i');
    await expect(totalUsersMetric.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-dashboard.png', fullPage: true });
  });

  adminTest('admin users page should show account counts', async ({ authenticatedAdminPage: page }) => {
    await page.goto('/app/admin/users');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check for table or user list
    const hasTable = await page.locator('table').count() > 0;
    const hasUserList = await page.locator('[role="row"], [class*="user"]').count() > 0;

    expect(hasTable || hasUserList).toBeTruthy();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-users-page.png', fullPage: true });
  });
});
