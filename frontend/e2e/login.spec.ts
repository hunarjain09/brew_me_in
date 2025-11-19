import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render login page correctly', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that we're on the login page
    await expect(page).toHaveURL(/.*login/);

    // Take a full-page snapshot
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should display login form elements', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Take snapshot of form area
    const formContainer = page.locator('form').first();
    await expect(formContainer).toHaveScreenshot('login-form.png', {
      animations: 'disabled',
    });
  });

  test('should show validation errors', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for any validation messages
    await page.waitForTimeout(500);

    // Take snapshot of validation state
    await expect(page).toHaveScreenshot('login-validation-errors.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should handle invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message
    await page.waitForTimeout(1000);

    // Take snapshot of error state
    await expect(page).toHaveScreenshot('login-invalid-credentials.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Take mobile snapshot
    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    // Take tablet snapshot
    await expect(page).toHaveScreenshot('login-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
