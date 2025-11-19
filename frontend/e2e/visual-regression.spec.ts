import { test, expect } from '@playwright/test';
import { mockWebSocketWithStats } from './fixtures/mock-websocket';

test.describe('Visual Regression Tests', () => {
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
  });

  test('should match glass effect styling', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Brew Me In');
    await page.waitForTimeout(1000);

    // Take snapshot of glass card elements
    const glassCard = page.locator('.glass-card').first();
    await expect(glassCard).toHaveScreenshot('glass-card-effect.png', {
      animations: 'disabled',
    });
  });

  test('should match gradient background', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // Take snapshot of background gradient
    await expect(page).toHaveScreenshot('gradient-background.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match button styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Brew Me In');

    // Logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toHaveScreenshot('button-logout.png', {
      animations: 'disabled',
    });
  });

  test('should match navigation active state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav');
    await page.waitForTimeout(500);

    // Active navigation item (Overview should be active)
    const activeNavItem = page.locator('nav a[href="/"]').first();
    await expect(activeNavItem).toHaveScreenshot('nav-item-active.png', {
      animations: 'disabled',
    });

    // Inactive navigation item
    const inactiveNavItem = page.locator('nav a[href="/activity"]').first();
    await expect(inactiveNavItem).toHaveScreenshot('nav-item-inactive.png', {
      animations: 'disabled',
    });
  });

  test('should match connection status indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Brew Me In');

    // Connection status element
    const connectionStatus = page.locator('div:has-text("Connected"), div:has-text("Disconnected")').first();
    await expect(connectionStatus).toHaveScreenshot('connection-status.png', {
      animations: 'disabled',
    });
  });

  test('should match stat card layouts', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Active Users');
    await page.waitForTimeout(500);

    // Individual stat cards
    const statCards = page.locator('div.grid.grid-cols-4 > div');
    const count = await statCards.count();

    for (let i = 0; i < count; i++) {
      const card = statCards.nth(i);
      await expect(card).toHaveScreenshot(`stat-card-${i}.png`, {
        animations: 'disabled',
      });
    }
  });

  test('should match responsive breakpoints', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 1280, height: 720, name: 'desktop-small' },
      { width: 1920, height: 1080, name: 'desktop-large' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('should match all page states', async ({ page }) => {
    const pages = [
      { path: '/', name: 'overview' },
      { path: '/activity', name: 'activity' },
      { path: '/analytics', name: 'analytics' },
      { path: '/users', name: 'users' },
      { path: '/agent', name: 'agent-config' },
    ];

    for (const pageDef of pages) {
      await page.goto(pageDef.path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(300);

      // Full page snapshot
      await expect(page).toHaveScreenshot(`page-${pageDef.name}-full.png`, {
        fullPage: true,
        animations: 'disabled',
      });

      // Above-the-fold snapshot
      await expect(page).toHaveScreenshot(`page-${pageDef.name}-atf.png`, {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('should match login page states', async ({ page }) => {
    // Clear auth to access login
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.waitForLoadState('load');

    // Empty state
    await expect(page).toHaveScreenshot('login-empty.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Filled state
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await expect(page).toHaveScreenshot('login-filled.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match animated elements in static state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Brew Me In');

    // Disable all animations via CSS
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    await page.waitForTimeout(500);

    // Take snapshot with all animations disabled
    await expect(page).toHaveScreenshot('dashboard-no-animations.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match hover states', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav');

    // Hover over navigation item
    const navItem = page.locator('nav a[href="/activity"]');
    await navItem.hover();
    await page.waitForTimeout(300);

    await expect(navItem).toHaveScreenshot('nav-item-hover.png', {
      animations: 'disabled',
    });

    // Hover over logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.hover();
    await page.waitForTimeout(300);

    await expect(logoutButton).toHaveScreenshot('logout-button-hover.png', {
      animations: 'disabled',
    });
  });
});
