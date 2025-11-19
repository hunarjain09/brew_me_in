# E2E Snapshot Testing Setup

## Overview

This project now includes comprehensive End-to-End (E2E) snapshot testing using Playwright. These tests verify that the application is working as intended by:

- Testing user flows and interactions
- Capturing visual snapshots of all pages
- Detecting visual regressions
- Testing responsive design across multiple devices
- Validating authentication flows

## What's Been Added

### Test Files

Located in `frontend/e2e/`:

1. **`login.spec.ts`** - Login page tests
   - Login form rendering
   - Validation errors
   - Invalid credentials handling
   - Responsive design (mobile/tablet/desktop)

2. **`dashboard.spec.ts`** - Dashboard tests
   - Header and stats rendering
   - Navigation sidebar
   - All dashboard pages (Overview, Activity, Analytics, Users, Agent Config)
   - Page navigation
   - Active navigation highlighting
   - Responsive layouts

3. **`auth-flow.spec.ts`** - Authentication flow tests
   - Unauthenticated user redirects
   - Authenticated user access
   - Logout functionality
   - Auth state persistence
   - Route protection

4. **`visual-regression.spec.ts`** - Visual regression tests
   - Glass effect styling
   - Gradient backgrounds
   - Button styles
   - Navigation states (active/inactive/hover)
   - Connection status indicators
   - Multiple viewport sizes (320px to 1920px)
   - All page states
   - Hover states

### Configuration

- **`frontend/playwright.config.ts`** - Playwright configuration
  - Configured to auto-start dev server
  - Chromium browser testing
  - Screenshot on failure
  - HTML reporter

### Scripts

Added to both root `package.json` and `frontend/package.json`:

```json
{
  "test:e2e": "Run all E2E tests",
  "test:e2e:ui": "Run tests with interactive UI",
  "test:e2e:headed": "Run tests with visible browser",
  "test:e2e:debug": "Run tests in debug mode",
  "test:e2e:report": "View test results report",
  "test:e2e:update-snapshots": "Update snapshot baselines"
}
```

### CI/CD

- **`.github/workflows/e2e-tests.yml`** - GitHub Actions workflow
  - Runs on push and pull requests
  - Uploads test reports and screenshots
  - Configured for CI environment

## Running the Tests

### First Time Setup

Before running tests for the first time, you need to generate baseline snapshots:

```bash
# From the root directory
npm run test:e2e:update-snapshots
```

This will:
1. Start the dev server automatically
2. Run all tests
3. Generate baseline snapshots in `frontend/e2e/**/*-snapshots/`
4. Commit these snapshots to git

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with interactive UI (recommended for development)
npm run test:e2e:ui

# Run in headed mode to see the browser
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# View the last test report
npm run test:e2e:report
```

### Updating Snapshots

When you make intentional UI changes, you'll need to update the snapshots:

```bash
# Update all snapshots
npm run test:e2e:update-snapshots

# Update snapshots for specific tests
cd frontend
npx playwright test e2e/login.spec.ts --update-snapshots
```

## Test Coverage

### Pages Tested

- ✅ Login page
- ✅ Dashboard Overview
- ✅ Dashboard Activity
- ✅ Dashboard Analytics
- ✅ Dashboard Users
- ✅ Dashboard Agent Config

### Features Tested

- ✅ Authentication flows
- ✅ Navigation between pages
- ✅ Form validation
- ✅ Error handling
- ✅ Responsive design (7 different viewports)
- ✅ Visual consistency
- ✅ Glass effect UI elements
- ✅ Hover states
- ✅ Active navigation states
- ✅ Connection status indicators

### Viewports Tested

- Mobile Small (320x568)
- Mobile Medium (375x667)
- Mobile Large (414x896)
- Tablet (768x1024)
- Tablet Landscape (1024x768)
- Desktop Small (1280x720)
- Desktop Large (1920x1080)

## Understanding Test Results

### When Tests Pass ✅

All visual snapshots match the baseline - your UI is consistent!

### When Tests Fail ❌

1. **View the diff**: Run `npm run test:e2e:report` to see visual differences
2. **Investigate**: Determine if the change is intentional or a bug
3. **If intentional**: Update snapshots with `npm run test:e2e:update-snapshots`
4. **If a bug**: Fix the issue and re-run tests

### Test Reports

Playwright generates HTML reports showing:
- Which tests passed/failed
- Visual diffs for failed snapshot tests
- Test execution timeline
- Screenshots and videos (on failure)

Access with: `npm run test:e2e:report`

## Best Practices

### For Developers

1. **Run tests before committing** - Ensure your changes don't break the UI
2. **Review snapshot diffs carefully** - Don't blindly update snapshots
3. **Keep tests fast** - Avoid unnecessary waits
4. **Mock external dependencies** - Tests use mocked authentication

### For Reviewers

1. **Check snapshot changes in PRs** - Review visual changes in snapshot files
2. **Verify test reports** - GitHub Actions uploads test reports as artifacts
3. **Question large snapshot updates** - Many changed snapshots might indicate issues

### Writing New Tests

See `frontend/e2e/README.md` for detailed guidance on writing new tests.

## Troubleshooting

### Dev server won't start

**Problem**: Tests fail because dev server can't start

**Solution**:
- Ensure port 5173 is available
- Check if frontend builds successfully: `npm run build:frontend`

### Snapshots don't match

**Problem**: Tests fail with snapshot mismatches even though nothing changed

**Solution**:
- Font rendering differs across systems
- Run tests in Docker for consistency
- Use CI as the source of truth

### Tests are slow

**Problem**: Tests take too long to run

**Solution**:
- Run specific test files: `npx playwright test e2e/login.spec.ts`
- Use `--grep` to run specific tests: `npx playwright test --grep "login page"`
- Disable parallel execution if needed

### Backend not available

**Problem**: Tests expect backend API but it's not running

**Solution**:
- Tests currently mock authentication using localStorage
- For tests requiring real API responses, start backend first:
  ```bash
  npm run dev:backend
  ```
- Consider adding MSW (Mock Service Worker) for API mocking

## Next Steps

### Recommended Enhancements

1. **API Mocking**: Add MSW to mock backend responses for more realistic tests
2. **More Interactions**: Add tests for user interactions (clicks, typing, etc.)
3. **Performance Testing**: Add Lighthouse CI for performance metrics
4. **Accessibility Testing**: Add axe-core for a11y testing
5. **Cross-browser Testing**: Extend to Firefox and WebKit

### Adding More Tests

1. Create new `.spec.ts` files in `frontend/e2e/`
2. Follow the existing patterns
3. Run tests to generate snapshots
4. Commit snapshots with your code

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Visual Comparisons Guide](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

## Summary

Your application now has:
- ✅ 50+ E2E test scenarios
- ✅ Visual regression testing
- ✅ Responsive design testing
- ✅ Authentication flow testing
- ✅ CI/CD integration
- ✅ Comprehensive documentation

The tests ensure your UI remains consistent and functional as you continue development!
