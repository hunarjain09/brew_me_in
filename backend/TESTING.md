# Testing Guide for brew_me_in Backend

## Overview

This document describes the comprehensive testing framework for the brew_me_in backend application. The test suite includes unit tests, integration tests, and mocking utilities for all major components.

## Test Structure

```
backend/src/__tests__/
├── setup.ts                          # Jest setup and configuration
├── mocks/                            # Mock implementations
│   ├── database.mock.ts             # PostgreSQL database mocks
│   ├── redis.mock.ts                # Redis client mocks
│   └── anthropic.mock.ts            # Claude AI API mocks
├── utils/                            # Test utilities
│   └── testData.ts                  # Test data factories and fixtures
├── unit/                             # Unit tests
│   ├── utils/                       # Utility function tests
│   │   ├── jwt.test.ts              # JWT service tests
│   │   └── networkValidation.test.ts # Network validation tests
│   ├── services/                    # Service layer tests
│   │   ├── rateLimitService.test.ts  # Rate limiting tests
│   │   └── spamDetectionService.test.ts # Spam detection tests
│   ├── models/                      # Database model tests
│   │   └── User.test.ts             # User model tests
│   └── routes/                      # API route tests
│       ├── auth.test.ts             # Authentication routes
│       └── matching.test.ts         # Matching/discovery routes
└── integration/                      # Integration tests
    └── poke-system.test.ts          # Complete poke flow tests
```

## Technologies

- **Test Runner**: Jest 29.5.0
- **TypeScript Support**: ts-jest 29.1.0
- **HTTP Testing**: supertest
- **Test Data**: @faker-js/faker
- **Mock Support**: jest-mock-extended

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- jwt.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="JWT"
```

## Test Coverage

The test suite covers:

### 1. **Utility Functions** (`__tests__/unit/utils/`)
- **JWT Service** (jwt.test.ts)
  - Token generation (access & refresh)
  - Token verification and validation
  - Token storage and revocation
  - Expiration handling
  - Security checks

- **Network Validation** (networkValidation.test.ts)
  - WiFi SSID matching
  - Geofence calculations
  - Distance measurements
  - Coordinate validation

### 2. **Service Layer** (`__tests__/unit/services/`)
- **Rate Limiting Service** (rateLimitService.test.ts)
  - Message rate limits (free users vs badge holders)
  - Poke rate limits (5 per 24 hours)
  - Agent query rate limits (2 per session)
  - Rate limit status checks
  - Rate limit resets

- **Spam Detection Service** (spamDetectionService.test.ts)
  - Excessive caps detection
  - URL spam detection
  - Duplicate message detection
  - Repeated character detection
  - User muting/unmuting
  - Violation history tracking

### 3. **Database Models** (`__tests__/unit/models/`)
- **User Model** (User.test.ts)
  - User creation and retrieval
  - Interest management
  - Poke settings
  - Badge status updates
  - User expiration
  - Active user counts

### 4. **API Routes** (`__tests__/unit/routes/`)
- **Authentication Routes** (auth.test.ts)
  - Username generation
  - User join flow
  - Token refresh
  - Interest updates
  - Poke enable/disable
  - Badge management

- **Matching Routes** (matching.test.ts)
  - Interest-based discovery
  - Match scoring
  - Interest management (add/remove/bulk)
  - Privacy filters
  - Result prioritization

### 5. **Integration Tests** (`__tests__/integration/`)
- **Poke System** (poke-system.test.ts)
  - Complete poke flow (send → receive → respond → DM)
  - Mutual poke acceptance
  - Poke decline handling
  - Poke expiration (24 hours)
  - Rate limiting enforcement
  - Privacy protection
  - DM channel creation
  - Notifications

## Mock Utilities

### Database Mock (`mocks/database.mock.ts`)
```typescript
import { mockDb, mockSuccessfulQuery, mockFailedQuery } from '../../mocks/database.mock';

// Mock successful query
mockSuccessfulQuery([{ id: '123', name: 'Test User' }]);

// Mock failed query
mockFailedQuery(new Error('Connection failed'));
```

### Redis Mock (`mocks/redis.mock.ts`)
```typescript
import { mockRedis, mockRedisGet, mockRedisSet } from '../../mocks/redis.mock';

// Mock Redis get
mockRedisGet('key', 'value');

// Mock Redis set
mockRedisSet();
```

### Anthropic API Mock (`mocks/anthropic.mock.ts`)
```typescript
import { mockAnthropicSuccess, mockAnthropicError } from '../../mocks/anthropic.mock';

// Mock successful AI response
mockAnthropicSuccess('Hello! How can I help you?');

// Mock AI error
mockAnthropicError(new Error('API limit exceeded'));
```

### Test Data Factories (`utils/testData.ts`)
```typescript
import { createTestUser, createTestCafe, createTestMessage } from '../../utils/testData';

// Create test user with defaults
const user = createTestUser();

// Create test user with overrides
const user = createTestUser({ username: 'specific_name', pokeEnabled: true });

// Create multiple test users
const users = createTestUsers(5);
```

## Writing New Tests

### Unit Test Template
```typescript
import { mockDb, mockSuccessfulQuery } from '../../mocks/database.mock';

jest.mock('../../../db/connection', () => ({
  db: mockDb,
}));

describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('method name', () => {
    it('should do something', async () => {
      // Arrange
      mockSuccessfulQuery([{ id: '123' }]);

      // Act
      const result = await someFunction();

      // Assert
      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
```

### Integration Test Template
```typescript
describe('Feature Integration', () => {
  beforeEach(() => {
    resetDatabaseMocks();
    resetRedisMocks();
  });

  it('should complete full flow', async () => {
    // Step 1: Setup
    const user = createTestUser();
    mockSuccessfulQuery([user]);

    // Step 2: Execute flow
    // ... test logic ...

    // Step 3: Verify
    expect(result).toMatchObject({
      // expected structure
    });
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Always mock external dependencies (DB, Redis, APIs)
3. **Clean Up**: Use `beforeEach` and `afterEach` to reset mocks
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
6. **Test Data**: Use factories from `testData.ts` for consistent test data
7. **Coverage**: Aim for >80% code coverage
8. **Fast Tests**: Mock slow operations (network, database)

## Common Issues

### TypeScript Errors
- Ensure `@types/jest` is installed
- Check `tsconfig.json` includes jest types
- Run `npm install` to update dependencies

### Mock Not Working
- Verify mock is called before the tested code
- Check mock path matches actual module path
- Use `jest.clearAllMocks()` in `beforeEach`

### Test Timeouts
- Increase timeout with `jest.setTimeout(10000)`
- Check for unresolved promises
- Ensure async/await is used correctly

## Future Improvements

- [ ] Add E2E tests with real database (Docker)
- [ ] Add WebSocket integration tests
- [ ] Add performance/load testing
- [ ] Increase coverage to 90%+
- [ ] Add visual regression tests for frontend
- [ ] Add API contract tests
- [ ] Add mutation testing
- [ ] CI/CD integration with automated testing

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing](https://kulshekhar.github.io/ts-jest/)
