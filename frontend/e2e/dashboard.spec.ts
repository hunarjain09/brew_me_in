import { test, expect } from '@playwright/test';
import { mockWebSocketWithStats } from './fixtures/mock-websocket';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock WebSocket to prevent connection errors
    await mockWebSocketWithStats(page);

    // Mock authentication state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('moderator', JSON.stringify({
        id: 'test-mod-1',
        email: 'moderator@test.com',
      }));
      localStorage.setItem('cafe', JSON.stringify({
        id: 'test-cafe-1',
        name: 'Test Cafe',
      }));
    });

    // Navigate to dashboard
    await page.goto('/');
    // Wait for dashboard to load
    await page.waitForSelector('text=Brew Me In', { timeout: 10000 });
  });

  test('should render dashboard header correctly', async ({ page }) => {
    // Wait for header to be visible
    await page.waitForSelector('header');

    // Check for main elements
    await expect(page.locator('h1:has-text("Brew Me In")')).toBeVisible();
    await expect(page.locator('header p:has-text("Test Cafe")')).toBeVisible();
    await expect(page.locator('text=moderator@test.com')).toBeVisible();

    // Check for connection status indicator
    const connectionStatus = page.locator('header').getByText(/Connected|Disconnected/);
    await expect(connectionStatus).toBeVisible();

    // Take snapshot of header
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('dashboard-header.png', {
      animations: 'disabled',
    });
  });

  test('should render stats bar', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('.glass-card', { timeout: 5000 });

    // Check all stat cards are visible by looking for the stat text within cards
    const statsBar = page.locator('div.grid.grid-cols-4').first();
    await expect(statsBar.getByText('Active Users', { exact: true })).toBeVisible();
    await expect(statsBar.getByText('Messages', { exact: true })).toBeVisible();
    await expect(statsBar.getByText('Agent Queries', { exact: true })).toBeVisible();
    await expect(statsBar.getByText('Flagged', { exact: true })).toBeVisible();

    // Take snapshot of stats bar
    await expect(statsBar).toHaveScreenshot('dashboard-stats.png', {
      animations: 'disabled',
    });
  });

  test('should render navigation sidebar', async ({ page }) => {
    // Wait for navigation to be visible
    await page.waitForSelector('nav');

    // Check all navigation items using getByRole for links
    const nav = page.locator('nav').first();
    await expect(nav.getByRole('link', { name: /Overview/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Activity/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Analytics/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Users/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Agent Config/ })).toBeVisible();

    // Take snapshot of navigation
    await expect(nav).toHaveScreenshot('dashboard-navigation.png', {
      animations: 'disabled',
    });
  });

  test('should render Overview page', async ({ page }) => {
    // Navigate to Overview (default page)
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500); // Wait for animations

    // Take full page snapshot
    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should render Activity page', async ({ page }) => {
    // Navigate to Activity using nav link
    await page.locator('nav').getByRole('link', { name: /Activity/ }).click();
    await page.waitForURL('**/activity');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500); // Wait for animations

    // Take full page snapshot
    await expect(page).toHaveScreenshot('dashboard-activity.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should render Analytics page', async ({ page }) => {
    // Navigate to Analytics using nav link
    await page.locator('nav').getByRole('link', { name: /Analytics/ }).click();
    await page.waitForURL('**/analytics');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500); // Wait for animations

    // Take full page snapshot
    await expect(page).toHaveScreenshot('dashboard-analytics.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should render Users page', async ({ page }) => {
    // Navigate to Users using nav link
    await page.locator('nav').getByRole('link', { name: /Users/ }).click();
    await page.waitForURL('**/users', { timeout: 20000 });
    await page.waitForLoadState('load');
    await page.waitForTimeout(500); // Wait for animations

    // Take full page snapshot
    await expect(page).toHaveScreenshot('dashboard-users.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should render Agent Config page', async ({ page }) => {
    // Navigate to Agent Config using nav link
    await page.locator('nav').getByRole('link', { name: /Agent Config/ }).click();
    await page.waitForURL('**/agent');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500); // Wait for animations

    // Take full page snapshot
    await expect(page).toHaveScreenshot('dashboard-agent-config.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should navigate between pages correctly', async ({ page }) => {
    // Test navigation flow using nav links
    await page.locator('nav').getByRole('link', { name: /Activity/ }).click();
    await expect(page).toHaveURL(/.*activity/);

    await page.locator('nav').getByRole('link', { name: /Analytics/ }).click();
    await expect(page).toHaveURL(/.*analytics/);

    await page.locator('nav').getByRole('link', { name: /Users/ }).click();
    await expect(page).toHaveURL(/.*users/);

    await page.locator('nav').getByRole('link', { name: /Agent Config/ }).click();
    await expect(page).toHaveURL(/.*agent/);

    await page.locator('nav').getByRole('link', { name: /Overview/ }).click();
    await expect(page).toHaveURL(/^(?!.*(activity|analytics|users|agent)).*$/);
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Navigate to Activity using nav link
    await page.locator('nav').getByRole('link', { name: /Activity/ }).click();
    await page.waitForTimeout(500);

    // Check that Activity is highlighted
    const activeNavItem = page.locator('nav a[href="/activity"]');
    await expect(activeNavItem).toHaveClass(/glass-btn-primary/);

    // Take snapshot showing active state
    const nav = page.locator('nav').first();
    await expect(nav).toHaveScreenshot('dashboard-nav-active-activity.png', {
      animations: 'disabled',
    });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // Take mobile snapshot
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // Take tablet snapshot
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should handle logout', async ({ page }) => {
    // Click logout button
    await page.click('text=Logout');

    // Should redirect to login
    await page.waitForURL(/.*login/);
    await expect(page).toHaveURL(/.*login/);
  });
});
