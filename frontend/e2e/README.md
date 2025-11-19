# E2E Snapshot Testing

This directory contains End-to-End (E2E) tests using Playwright with visual snapshot testing to verify the application is working as intended.

## ⚠️ Important: Generate Snapshots Locally First

Before CI tests will pass, you **must** generate baseline snapshots locally:

```bash
# From the root directory:
npm run test:e2e:update-snapshots

# Or from the frontend directory:
cd frontend
npx playwright test --update-snapshots
```

After generating snapshots, review and commit the snapshot files in `e2e/*-snapshots/` directories. CI will then compare against these baselines.

## Overview

The E2E tests use Playwright to:
- Test user flows and interactions
- Verify UI rendering across different pages
- Perform visual regression testing with snapshots
- Test responsive design across multiple viewports
- Validate authentication flows

## Test Files

- **`login.spec.ts`** - Tests for the login page including validation and responsive design
- **`dashboard.spec.ts`** - Tests for all dashboard pages and navigation
- **`auth-flow.spec.ts`** - Tests for authentication and authorization flows
- **`visual-regression.spec.ts`** - Visual regression tests for UI consistency
- **`helpers/auth.ts`** - Authentication helper utilities

## Running Tests

### From the root directory:

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Update snapshots (after intentional UI changes)
npm run test:e2e:update-snapshots
```

### From the frontend directory:

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/login.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should render"

# Run tests in specific browser
npx playwright test --project=chromium
```

## Snapshot Testing

Snapshot tests capture screenshots of the application and compare them against baseline images. If there are visual differences, the test will fail.

### When snapshots fail:

1. **Review the differences**: Check the test report to see what changed
   ```bash
   npm run test:e2e:report
   ```

2. **If changes are intentional**: Update the snapshots
   ```bash
   npm run test:e2e:update-snapshots
   ```

3. **If changes are bugs**: Fix the bug and re-run tests

### Snapshot locations:

- Baseline snapshots: `e2e/**/*-snapshots/*.png`
- Test results: `test-results/` (gitignored)
- Test reports: `playwright-report/` (gitignored)

## Test Structure

### Login Tests
- Login page rendering
- Form validation
- Error handling
- Responsive design (mobile, tablet, desktop)

### Dashboard Tests
- Header and navigation rendering
- Stats bar display
- All dashboard pages (Overview, Activity, Analytics, Users, Agent Config)
- Navigation functionality
- Active navigation highlighting
- Responsive layouts

### Authentication Flow Tests
- Redirect unauthenticated users to login
- Allow authenticated users to access dashboard
- Logout functionality
- Auth state persistence
- Route protection

### Visual Regression Tests
- Glass effect styling
- Gradient backgrounds
- Button styles
- Navigation states (active/inactive/hover)
- Connection status indicators
- Stat cards
- Responsive breakpoints
- Animated elements

## Best Practices

1. **Always wait for elements**: Use `waitForSelector` or `waitForLoadState` before taking snapshots
2. **Disable animations**: Use `animations: 'disabled'` in snapshot options for consistent results
3. **Use descriptive names**: Name snapshots clearly to indicate what they test
4. **Test responsiveness**: Include tests for mobile, tablet, and desktop viewports
5. **Update snapshots carefully**: Review visual diffs before updating baselines

## CI/CD Integration

The tests are configured to:
- Run with retries on CI (2 retries)
- Use single worker on CI for consistency
- Fail if `test.only` is present
- Generate HTML reports

## Troubleshooting

### Tests failing locally but passing on CI
- Clear the Playwright cache: `npx playwright install --force`
- Ensure you're using the same browser version

### Snapshots look different on different machines
- This is expected due to font rendering differences
- CI should be the source of truth for snapshot comparisons
- Consider using Docker for consistent environments

### Dev server not starting
- Check if port 5173 is available
- Increase the `webServer.timeout` in `playwright.config.ts`

## Adding New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import test and expect from `@playwright/test`
3. Write your tests using the Playwright API
4. Run `npm run test:e2e` to generate initial snapshots
5. Review and commit the baseline snapshots

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should render correctly', async ({ page }) => {
    await page.goto('/my-feature');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('my-feature.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
