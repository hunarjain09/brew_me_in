import { Page } from '@playwright/test';

export interface AuthCredentials {
  email: string;
  password: string;
}

// Mock credentials for testing
export const TEST_CREDENTIALS: AuthCredentials = {
  email: 'test@example.com',
  password: 'testpassword123',
};

/**
 * Performs login through the UI
 */
export async function login(page: Page, credentials: AuthCredentials = TEST_CREDENTIALS) {
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/^(?!.*login).*$/);
}

/**
 * Sets up authenticated session using local storage
 * This is faster than logging in through UI for each test
 */
export async function setupAuthState(page: Page) {
  // Mock auth token and user data
  const mockAuthData = {
    token: 'mock-jwt-token-for-testing',
    moderator: {
      id: 'test-moderator-1',
      email: 'test@example.com',
      name: 'Test Moderator',
    },
    cafe: {
      id: 'test-cafe-1',
      name: 'Test Cafe',
    },
  };

  await page.goto('/');

  // Set local storage with auth data
  await page.evaluate((authData) => {
    localStorage.setItem('auth_token', authData.token);
    localStorage.setItem('moderator', JSON.stringify(authData.moderator));
    localStorage.setItem('cafe', JSON.stringify(authData.cafe));
  }, mockAuthData);
}

/**
 * Clears authentication state
 */
export async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
