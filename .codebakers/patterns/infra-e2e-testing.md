# PATTERN: Automated E2E Testing (Playwright)

## When to Use
Every project. Tests are generated from Gate 2 workflows during Stage 7.

## Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### Config
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

## Test Generation Rules

For EVERY workflow in Gate 2, generate a test file:

### Auth Tests (always)
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up', async ({ page }) => {
  await page.goto('/auth/signup');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

test('user can log in', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

test('user cannot access dashboard without login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/auth/login');
});
```

### CRUD Tests (per entity)
```typescript
// e2e/[entity].spec.ts
test('can create a [entity]', async ({ page }) => {
  await login(page);
  await page.goto('/[entity]/new');
  // Fill required fields from Gate 1 schema
  await page.fill('[name="name"]', 'Test Entity');
  await page.click('button[type="submit"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});

test('can view [entity] list', async ({ page }) => {
  await login(page);
  await page.goto('/[entity]');
  await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0);
});

test('can edit a [entity]', async ({ page }) => {
  await login(page);
  await page.goto('/[entity]');
  await page.click('tr:first-child a'); // click first row
  await page.fill('[name="name"]', 'Updated Name');
  await page.click('button[type="submit"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});

test('can delete a [entity]', async ({ page }) => {
  await login(page);
  await page.goto('/[entity]');
  await page.click('tr:first-child button.delete');
  await page.click('button.confirm-delete');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

### Workflow Tests (per Gate 2 workflow)
```typescript
// e2e/workflow-[name].spec.ts
test('[workflow name] — happy path', async ({ page }) => {
  // Walk through the entire workflow from start to finish
  // Each step maps to a state transition in Gate 2
});

test('[workflow name] — permission denied', async ({ page }) => {
  // Log in as a user WITHOUT permission for this workflow
  // Verify they cannot access or trigger it
});
```

## Test Helpers
```typescript
// e2e/helpers.ts
import { Page } from '@playwright/test';

export async function login(page: Page, email = 'test@example.com', password = 'TestPass123!') {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function loginAs(page: Page, role: string) {
  const users = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!' },
    member: { email: 'member@test.com', password: 'MemberPass123!' },
    viewer: { email: 'viewer@test.com', password: 'ViewerPass123!' },
  };
  await login(page, users[role].email, users[role].password);
}
```

## Package.json Scripts
```json
{
  "test": "playwright test",
  "test:ui": "playwright test --ui",
  "test:headed": "playwright test --headed"
}
```

## Rules
- Generate at MINIMUM: auth tests, one CRUD test per entity, one test per Gate 2 workflow
- Test the happy path AND at least one error/permission case per workflow
- Use seed data — tests should not depend on each other
- Screenshots on failure go to e2e/screenshots/
- Add test:e2e to CI/CD pipeline
