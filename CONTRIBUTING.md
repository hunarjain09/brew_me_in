# Contributing to brew_me_in

Welcome! This guide will help you contribute to brew_me_in, whether you're a human developer or an AI agent. Follow these guidelines to independently pick up work, test it, and deploy to GitHub.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Testing Your Changes](#testing-your-changes)
5. [Committing Changes](#committing-changes)
6. [Pushing to GitHub](#pushing-to-github)
7. [Creating Pull Requests](#creating-pull-requests)
8. [Code Style Guidelines](#code-style-guidelines)
9. [For AI Agents](#for-ai-agents)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **Docker** and **Docker Compose** installed
- **Git** configured with your credentials
- **PostgreSQL** 14+ (or use Docker)
- **Redis** 7+ (or use Docker)
- A text editor or IDE

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/hunarjain09/brew_me_in.git
cd brew_me_in
```

### 2. Set Up Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with required values:
- JWT secrets
- Database credentials
- Redis configuration
- Anthropic API key (for AI features)

### 3. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (backend, frontend).

### 4. Start Development Environment

**Option A: Using Docker (Recommended)**

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, Backend, and Frontend services.

**Option B: Manual Setup**

```bash
# Terminal 1 - Start PostgreSQL and Redis (via Docker)
docker-compose up -d postgres redis

# Terminal 2 - Start Backend
cd backend
npm run dev

# Terminal 3 - Start Frontend
cd frontend
npm run dev
```

### 5. Initialize Database

```bash
cd backend
npm run migrate
```

For detailed setup instructions, see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md).

## Development Workflow

### Branch Naming Convention

**CRITICAL:** This project uses a specific branch naming convention for automated workflows:

- **Format:** `claude/<descriptive-name>-<session-id>`
- **Examples:**
  - `claude/add-user-authentication-01ABC123XYZ`
  - `claude/fix-chat-bug-01DEF456UVW`

**For AI Agents:**
- The session ID is automatically provided in your context
- Always create branches following this pattern
- Pushing to branches without the `claude/` prefix may fail with 403 errors

### Creating a New Branch

```bash
# Create and checkout a new branch
git checkout -b claude/<feature-description>-<session-id>

# Example
git checkout -b claude/add-rate-limiting-01PwtBZM2NhbdrGmQB54pJLp
```

### Making Changes

1. **Understand the Task**
   - Read the issue/task description carefully
   - Review related documentation in `/docs`
   - Examine existing code patterns

2. **Plan Your Changes**
   - Break down the task into smaller steps
   - Identify which files need modification
   - Consider impacts on other components

3. **Implement Changes**
   - Follow existing code style and patterns
   - Add appropriate error handling
   - Update TypeScript types as needed
   - Add validation using Zod schemas where applicable

4. **Document Your Changes**
   - Add JSDoc comments for new functions
   - Update relevant documentation files
   - Add inline comments for complex logic

## Testing Your Changes

**CRITICAL:** Always test your changes before committing. All contributions must pass tests.

### Backend Unit Tests

```bash
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
```

**Test Coverage Requirements:**
- New features must include unit tests
- Bug fixes should include regression tests
- Aim for >80% code coverage on new code

### Frontend E2E Tests

```bash
cd frontend
npm run test:e2e                    # Run E2E tests
npm run test:e2e:ui                 # Interactive UI mode
npm run test:e2e:headed             # Run with visible browser
npm run test:e2e:debug              # Debug mode
npm run test:e2e:update-snapshots   # Update visual snapshots
```

**When to Run E2E Tests:**
- After UI changes
- Before creating a pull request
- When modifying user flows

### Manual Testing

1. **Start the Application**
   ```bash
   npm run dev  # From root directory
   ```

2. **Test Your Feature**
   - Open http://localhost:5173 (frontend)
   - Test all affected functionality
   - Check console for errors
   - Verify database changes if applicable

3. **Test Edge Cases**
   - Invalid inputs
   - Network failures
   - Authentication edge cases
   - Race conditions (for real-time features)

### Integration Testing

For features involving multiple components:

```bash
# Test full stack integration
cd backend
npm run test  # Includes integration tests in __tests__/integration/
```

See [E2E_TESTING.md](./E2E_TESTING.md) for comprehensive testing guide.

## Committing Changes

### Commit Message Format

Use clear, descriptive commit messages:

```
<type>: <short summary>

<optional detailed description>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

```bash
git commit -m "feat: Add rate limiting to chat endpoints

Implement Redis-based rate limiting to prevent spam in group chats.
Limits: 20 messages per minute per user."

git commit -m "fix: Resolve WebSocket reconnection issue

Fix race condition in socket reconnection logic that caused
duplicate connections."

git commit -m "test: Add unit tests for spam detection service"

git commit -m "docs: Update API examples for authentication flow"
```

### Staging and Committing

```bash
# Check status
git status

# Stage specific files
git add backend/src/services/rateLimit.ts
git add backend/src/__tests__/unit/services/rateLimit.test.ts

# Or stage all changes
git add .

# Commit with message
git commit -m "feat: Add rate limiting service"
```

### Pre-Commit Checklist

Before committing, ensure:
- ✅ All tests pass (`npm test` in backend)
- ✅ No linting errors (`npm run lint` in backend)
- ✅ Code is formatted (`npm run format` in backend/frontend)
- ✅ No sensitive data (API keys, secrets) in code
- ✅ TypeScript compiles without errors
- ✅ Relevant documentation updated

## Pushing to GitHub

### Push to Your Feature Branch

```bash
# First time pushing the branch
git push -u origin claude/<feature-name>-<session-id>

# Subsequent pushes
git push
```

### Network Retry Strategy

If push fails due to network errors, retry with exponential backoff:

```bash
# Retry 1 (after 2 seconds)
git push

# Retry 2 (after 4 seconds)
git push

# Retry 3 (after 8 seconds)
git push

# Retry 4 (after 16 seconds)
git push
```

**Important Notes:**
- Only retry on network errors (connection timeouts, etc.)
- Do NOT retry on authentication failures (403, 401)
- For 403 errors, verify your branch follows the `claude/*` naming convention

### Verifying Your Push

```bash
# Check remote status
git status

# View remote branches
git branch -r

# Verify commits are pushed
git log origin/claude/<feature-name>-<session-id>
```

## Creating Pull Requests

### Prepare Your PR

1. **Update Your Branch**
   ```bash
   # Fetch latest changes
   git fetch origin

   # Rebase on main (if needed)
   git rebase origin/main
   ```

2. **Final Testing**
   ```bash
   # Run all tests
   cd backend && npm test
   cd ../frontend && npm run test:e2e
   ```

3. **Review Your Changes**
   ```bash
   git diff origin/main...HEAD
   git log origin/main...HEAD
   ```

### Using GitHub CLI (if available)

```bash
gh pr create \
  --title "Add rate limiting to chat endpoints" \
  --body "$(cat <<'EOF'
## Summary
- Implements Redis-based rate limiting for chat messages
- Prevents spam with 20 messages/minute limit
- Adds comprehensive unit tests
- Updates documentation

## Changes
- Added `RateLimitService` in `backend/src/services/rateLimit.ts`
- Integrated rate limiting in chat socket handlers
- Added unit tests with 95% coverage
- Updated RATE_LIMITING.md documentation

## Testing
- ✅ All backend unit tests pass (142 tests)
- ✅ E2E tests pass
- ✅ Manually tested rate limiting in local environment
- ✅ Verified Redis integration

## Related Issues
Closes #42
EOF
)"
```

### Manual PR Creation

If `gh` CLI is not available:

1. Push your branch (as described above)
2. Navigate to https://github.com/hunarjain09/brew_me_in
3. Click "Compare & pull request"
4. Fill in PR template:

**PR Title:** Clear, descriptive summary

**PR Description:**
```markdown
## Summary
- Brief overview of changes (bullet points)

## Changes Made
- Specific files/components modified
- New features or fixes implemented

## Testing
- [ ] Backend unit tests pass
- [ ] Frontend E2E tests pass
- [ ] Manual testing completed
- [ ] No regressions introduced

## Related Issues
Closes #<issue-number>
```

### PR Checklist

Before submitting PR:
- ✅ All CI/CD checks pass
- ✅ Code reviewed for security vulnerabilities
- ✅ No merge conflicts with main branch
- ✅ Documentation updated
- ✅ Tests added for new features
- ✅ Commit messages follow convention

## Code Style Guidelines

### TypeScript

- **Use TypeScript strict mode**
- Define interfaces for all data structures
- Avoid `any` type (use `unknown` if necessary)
- Use Zod schemas for runtime validation

**Example:**
```typescript
// Good
interface User {
  id: string;
  username: string;
  createdAt: Date;
}

const userSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email()
});

// Bad
let user: any = { ... };
```

### Backend Code Style

- **Use async/await** over callbacks
- **Proper error handling** with try-catch
- **Parameterized SQL queries** to prevent injection
- **Rate limiting** on all public endpoints
- **Input validation** using Zod schemas

**Example:**
```typescript
// Good
export async function createUser(data: CreateUserInput): Promise<User> {
  try {
    const validated = userSchema.parse(data);
    const result = await db.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [validated.username, validated.email]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create user', { error, data });
    throw new DatabaseError('User creation failed');
  }
}

// Bad
function createUser(data: any, callback: Function) {
  db.query(`INSERT INTO users VALUES ('${data.username}', '${data.email}')`, (err, result) => {
    callback(err, result);
  });
}
```

### Frontend Code Style

- **Functional components** with hooks
- **Proper state management** (Context API)
- **Error boundaries** for error handling
- **Loading states** for async operations
- **Accessibility** (ARIA labels, semantic HTML)

**Example:**
```tsx
// Good
export const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <NotFound />;

  return <div>{user.username}</div>;
};
```

### Security Guidelines

**CRITICAL:** Always follow these security practices:

1. **Never commit secrets**
   - Use environment variables
   - Add sensitive files to `.gitignore`
   - Use `.env.example` for templates

2. **Prevent SQL injection**
   - Always use parameterized queries
   - Never concatenate user input into SQL

3. **Validate all input**
   - Use Zod schemas for validation
   - Sanitize user input
   - Validate on both client and server

4. **Implement proper authentication**
   - Use JWT with proper expiration
   - Implement refresh token rotation
   - Check permissions on all protected routes

5. **Rate limiting**
   - Apply rate limits to all public endpoints
   - Use Redis for distributed rate limiting
   - Monitor for abuse patterns

6. **CORS configuration**
   - Restrict origins in production
   - Use proper CORS headers
   - Don't use wildcard `*` in production

For detailed security guidelines, see [docs/components/AUTHENTICATION.md](./docs/components/AUTHENTICATION.md).

### Testing Guidelines

- **Write tests first** (TDD approach encouraged)
- **Test edge cases** and error conditions
- **Mock external dependencies** (database, APIs)
- **Use descriptive test names**

**Example:**
```typescript
describe('RateLimitService', () => {
  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      // Test implementation
    });

    it('should block requests exceeding rate limit', async () => {
      // Test implementation
    });

    it('should reset limit after window expires', async () => {
      // Test implementation
    });

    it('should handle Redis connection failures gracefully', async () => {
      // Test implementation
    });
  });
});
```

## For AI Agents

If you're an AI agent contributing to this project, follow these additional guidelines:

### Autonomous Workflow

1. **Understand the Task**
   ```
   - Read the issue/PR description completely
   - Review related documentation files
   - Search codebase for relevant patterns
   - Identify all files that need changes
   ```

2. **Plan Your Approach**
   ```
   - Break task into discrete steps
   - Identify dependencies between steps
   - Create a checklist of todos
   - Consider edge cases and error handling
   ```

3. **Implement Changes**
   ```
   - Make changes incrementally
   - Test after each significant change
   - Follow existing code patterns
   - Add appropriate error handling
   ```

4. **Test Thoroughly**
   ```bash
   # Run backend tests
   cd backend && npm test

   # Run frontend E2E tests
   cd frontend && npm run test:e2e

   # Check for TypeScript errors
   cd backend && npx tsc --noEmit
   cd frontend && npx tsc --noEmit
   ```

5. **Commit and Push**
   ```bash
   # Stage changes
   git add .

   # Commit with descriptive message
   git commit -m "feat: <description>"

   # Push to feature branch
   git push -u origin claude/<feature>-<session-id>
   ```

6. **Create Pull Request**
   ```
   - Summarize all changes made
   - List test results
   - Highlight any decisions made
   - Note any limitations or follow-ups needed
   ```

### Key Considerations for Agents

**Branch Management:**
- Always use `claude/<description>-<session-id>` format
- Create branch if it doesn't exist
- Push to the correct branch (verify session ID matches)

**Error Handling:**
- Check command outputs for errors
- Implement retry logic for network failures
- Log errors for debugging
- Don't proceed if critical errors occur

**Testing Requirements:**
- ALWAYS run tests before committing
- Don't commit if tests fail
- Fix test failures before proceeding
- Add new tests for new functionality

**Communication:**
- Document all changes clearly
- Explain complex decisions
- Note any assumptions made
- Highlight any concerns or risks

**Independence:**
- Don't ask for information that's available in the codebase
- Search existing documentation first
- Follow established patterns
- Make reasonable decisions when ambiguous

### Common Tasks for Agents

**Adding a New Feature:**
1. Create feature branch
2. Implement backend logic (if needed)
3. Add backend unit tests
4. Implement frontend UI (if needed)
5. Add E2E tests
6. Update documentation
7. Run all tests
8. Commit and push
9. Create pull request

**Fixing a Bug:**
1. Create bugfix branch
2. Reproduce the bug
3. Identify root cause
4. Implement fix
5. Add regression test
6. Verify fix works
7. Run all tests
8. Commit and push
9. Create pull request

**Updating Documentation:**
1. Create docs branch
2. Identify outdated sections
3. Update with accurate information
4. Verify technical accuracy
5. Check for broken links
6. Commit and push
7. Create pull request

## Troubleshooting

### Common Issues

**Issue: Tests failing locally**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset test database
cd backend
npm run migrate
```

**Issue: Docker containers not starting**
```bash
# Stop all containers
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up -d
```

**Issue: TypeScript compilation errors**
```bash
# Check for type errors
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Rebuild
npm run build
```

**Issue: Git push fails with 403**
- Verify branch name starts with `claude/`
- Check session ID matches your context
- Verify git credentials are configured

**Issue: E2E tests timeout**
```bash
# Increase timeout in playwright.config.ts
# Or run with more time
cd frontend
npm run test:e2e -- --timeout=60000
```

**Issue: Redis connection errors**
```bash
# Check Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis

# Check connection in .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Getting Help

1. **Check Documentation**
   - [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
   - [E2E_TESTING.md](./E2E_TESTING.md)
   - [docs/components/](./docs/components/)

2. **Review Existing Code**
   - Look for similar features
   - Check test files for examples
   - Review commit history

3. **GitHub Issues**
   - Search existing issues
   - Create new issue with:
     - Clear description
     - Steps to reproduce
     - Expected vs actual behavior
     - Environment details

4. **Contact Maintainers**
   - Create GitHub discussion
   - Tag maintainers in issues
   - Provide full context

## Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [backend/README.md](./backend/README.md) - Backend API reference
- [docs/components/](./docs/components/) - Component-specific docs
- [LIQUID_GLASS_DESIGN_GUIDE.md](./LIQUID_GLASS_DESIGN_GUIDE.md) - UI design system

## License

By contributing to brew_me_in, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Thank you for contributing to brew_me_in! Your contributions help make this project better for everyone.

---

**Version:** 0.5.0
**Last Updated:** 2025-11-19
