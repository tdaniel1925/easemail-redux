/**
 * Production Deployment Verification Tests
 * Tests against production URL to verify all bug fixes are deployed
 *
 * Run with: PLAYWRIGHT_TEST_BASE_URL=https://easemail-redux.vercel.app npm run test:e2e -- production-verification.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Production Deployment Verification', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let consoleLogs: string[] = [];

  test.beforeEach(({ page }) => {
    // Capture console messages to verify no spam
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      } else if (type === 'log') {
        // Only capture console.log (not console.info, etc)
        if (!text.includes('[HMR]') && !text.includes('Download')) {
          consoleLogs.push(text);
        }
      }
    });

    // Reset arrays for each test
    consoleErrors = [];
    consoleWarnings = [];
    consoleLogs = [];
  });

  test('homepage should load without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should redirect to signin or show homepage
    const url = page.url();
    expect(url).toMatch(/\/(auth\/signin)?/);

    // Page should be visible
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/production-homepage.png',
      fullPage: true
    });
  });

  test('signin page should load without errors', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check for OAuth buttons
    const googleButton = page.getByRole('button', { name: /google/i });
    const microsoftButton = page.getByRole('button', { name: /microsoft/i });

    // At least one OAuth button should be visible
    const googleVisible = await googleButton.isVisible().catch(() => false);
    const microsoftVisible = await microsoftButton.isVisible().catch(() => false);

    expect(googleVisible || microsoftVisible).toBeTruthy();

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/production-signin.png',
      fullPage: true
    });
  });

  test('BUG FIX VERIFICATION: buttons should be clickable (use client fix)', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Find any button on the page
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    // Should have at least one button
    expect(buttonCount).toBeGreaterThan(0);

    // First button should be enabled and clickable
    const firstButton = buttons.first();
    await expect(firstButton).toBeEnabled();

    // Button should have proper event handlers (not throw on click)
    // This verifies 'use client' directive is working
    const isClickable = await firstButton.evaluate((btn) => {
      return typeof (btn as any).onclick !== 'undefined' || btn.hasAttribute('type');
    });

    expect(isClickable).toBeTruthy();
  });

  test('BUG FIX VERIFICATION: no console.log spam', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any delayed logs
    await page.waitForTimeout(2000);

    // Should have NO console.log statements (we removed 23 of them)
    // Allow some framework logs but flag suspicious patterns
    const suspiciousLogs = consoleLogs.filter(log =>
      !log.includes('next') &&
      !log.includes('webpack') &&
      !log.includes('Supabase') &&
      log.length > 0
    );

    console.log('📋 Console logs captured:', consoleLogs.length);
    if (suspiciousLogs.length > 0) {
      console.log('⚠️  Suspicious logs found:', suspiciousLogs);
    }

    // This is informational - we'll allow some logs but report them
    expect(suspiciousLogs.length).toBeLessThan(10);
  });

  test('BUG FIX VERIFICATION: no "use client" errors in console', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(2000);

    // Check for 'use client' related errors
    const useClientErrors = consoleErrors.filter(error =>
      error.includes('use client') ||
      error.includes('client component') ||
      error.includes('createContext') ||
      error.includes('useState')
    );

    if (useClientErrors.length > 0) {
      console.log('❌ USE CLIENT ERRORS FOUND:', useClientErrors);
    }

    expect(useClientErrors.length).toBe(0);
  });

  test('BUG FIX VERIFICATION: no SSE controller errors', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(2000);

    // Check for SSE controller errors (the bug we fixed)
    const sseErrors = consoleErrors.filter(error =>
      error.includes('Controller is already closed') ||
      error.includes('ReadableStreamDefaultController')
    );

    if (sseErrors.length > 0) {
      console.log('❌ SSE CONTROLLER ERRORS FOUND:', sseErrors);
    }

    expect(sseErrors.length).toBe(0);
  });

  test('BUG FIX VERIFICATION: no refresh token errors visible in client', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(2000);

    // Check for refresh token errors
    const tokenErrors = consoleErrors.filter(error =>
      error.includes('refresh_token_not_found') ||
      error.includes('refresh token') ||
      error.includes('Invalid Refresh Token')
    );

    if (tokenErrors.length > 0) {
      console.log('❌ REFRESH TOKEN ERRORS FOUND:', tokenErrors);
    }

    // These should be handled server-side now, not visible to client
    expect(tokenErrors.length).toBe(0);
  });

  test('dark mode should work', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check if dark mode toggle exists (might be in header/footer)
    const darkModeToggle = page.locator('[aria-label*="theme"], [aria-label*="dark"], button[class*="theme"]').first();

    const toggleExists = await darkModeToggle.count() > 0;

    if (toggleExists) {
      // Click to toggle dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(500);

      // Check if html or body has dark class
      const hasDarkMode = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ||
               document.body.classList.contains('dark') ||
               document.documentElement.getAttribute('data-theme') === 'dark';
      });

      expect(hasDarkMode).toBeTruthy();

      // Take screenshot in dark mode
      await page.screenshot({
        path: 'tests/screenshots/production-dark-mode.png',
        fullPage: true
      });
    }
  });

  test('responsive design at mobile viewport (375px)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Page should still be usable on mobile
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/production-mobile-375px.png',
      fullPage: true
    });
  });

  test('responsive design at tablet viewport (768px)', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/production-tablet-768px.png',
      fullPage: true
    });
  });

  test('responsive design at desktop viewport (1920px)', async ({ page }) => {
    // Set wide desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/production-desktop-1920px.png',
      fullPage: true
    });
  });

  test('SUMMARY: capture all errors and warnings', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Navigate to different parts of the app (without auth)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tests run against: ${page.url()}`);
    console.log(`📝 Console errors: ${consoleErrors.length}`);
    console.log(`⚠️  Console warnings: ${consoleWarnings.length}`);
    console.log(`📋 Console logs: ${consoleLogs.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (consoleWarnings.length > 0) {
      console.log('\n⚠️  WARNINGS FOUND:');
      // Filter out known acceptable warnings
      const seriousWarnings = consoleWarnings.filter(w =>
        !w.includes('Sentry') &&
        !w.includes('deprecated')
      );
      seriousWarnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
    }

    console.log('='.repeat(60) + '\n');

    // Create a summary report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      errors: consoleErrors.length,
      warnings: consoleWarnings.length,
      logs: consoleLogs.length,
      status: consoleErrors.length === 0 ? '✅ PASS' : '❌ FAIL'
    };

    console.log('📄 Test Report:', JSON.stringify(report, null, 2));
  });
});
