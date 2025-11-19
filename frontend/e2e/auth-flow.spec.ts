import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto('/');

    // Should be redirected to login
    await page.waitForURL(/.*login/);
    await expect(page).toHaveURL(/.*login/);

    // Take snapshot of redirect
    await expect(page).toHaveScreenshot('auth-redirect-to-login.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should allow authenticated users to access dashboard', async ({ page }) => {
    // Set up auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
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

    // Should stay on dashboard (not redirect to login)
    await page.waitForSelector('text=Brew Me In', { timeout: 5000 });
    expect(page.url()).not.toContain('/login');

    // Take snapshot of authenticated dashboard
    await expect(page).toHaveScreenshot('auth-dashboard-access.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should redirect authenticated users away from login', async ({ page }) => {
    // Set up auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('moderator', JSON.stringify({
        id: 'test-mod-1',
        email: 'moderator@test.com',
      }));
    });

    // Try to access login page
    await page.goto('/login');

    // Should be redirected to dashboard
    await page.waitForURL(/^(?!.*login).*$/);
    expect(page.url()).not.toContain('/login');
  });

  test('should clear auth state on logout', async ({ page }) => {
    // Set up auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
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
    await page.waitForSelector('text=Brew Me In');

    // Click logout
    await page.click('text=Logout');

    // Should redirect to login
    await page.waitForURL(/.*login/);

    // Check that auth state is cleared
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBeNull();

    // Take snapshot after logout
    await expect(page).toHaveScreenshot('auth-after-logout.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should maintain auth state across page refreshes', async ({ page }) => {
    // Set up auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
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
    await page.waitForSelector('text=Brew Me In');

    // Reload page
    await page.reload();

    // Should still be on dashboard
    await page.waitForSelector('text=Brew Me In', { timeout: 5000 });
    expect(page.url()).not.toContain('/login');

    // Auth token should still exist
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBe('mock-jwt-token');
  });

  test('should protect all dashboard routes', async ({ page }) => {
    // Clear auth state
    await page.evaluate(() => localStorage.clear());

    const protectedRoutes = [
      '/',
      '/activity',
      '/analytics',
      '/users',
      '/agent',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/.*login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');
    }
  });
});
