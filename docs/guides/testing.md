# Testing Guide

This guide covers testing strategies and best practices for the suzumina.click project.

## Overview

We use a comprehensive testing approach with unit tests, integration tests, and E2E tests.

## Testing Stack

- **Unit/Integration Tests**: Vitest
- **E2E Tests**: Playwright
- **Test Runner**: pnpm test

## Test Structure

### File Organization

Tests are placed in `__tests__` directories, NOT co-located with source files:

```
src/components/audio/
├── __tests__/
│   ├── audio-button.test.tsx
│   └── favorite-button.test.tsx
├── audio-button.tsx
└── favorite-button.tsx
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts`

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @suzumina.click/web test

# Run tests in watch mode
pnpm --filter @suzumina.click/web test:watch

# Run E2E tests
pnpm --filter @suzumina.click/web test:e2e

# Run with coverage
pnpm --filter @suzumina.click/web test:coverage
```

## Writing Tests

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudioButton } from "../audio-button";

describe("AudioButton", () => {
  it("should render button text", () => {
    render(<AudioButton text="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

### Integration Tests

Test with real Firestore emulator:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Firestore Integration", () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "test-project",
    });
  });

  it("should create audio button", async () => {
    // Test implementation
  });
});
```

### E2E Tests

```typescript
import { test, expect } from "@playwright/test";

test("audio button playback", async ({ page }) => {
  await page.goto("/buttons");
  await page.click("text=再生");
  await expect(page.locator(".playing")).toBeVisible();
});
```

## Best Practices

### 1. Test Organization

- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### 2. Test Data

- Use factories for test data creation
- Avoid hardcoded values
- Clean up test data after each test

### 3. Mocking

- Mock external dependencies (APIs, database)
- Use Vitest's mocking capabilities
- Keep mocks simple and focused

### 4. Async Testing

```typescript
// Always use async/await for async operations
it("should fetch data", async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

### 5. Testing React Components

- Test behavior, not implementation
- Use Testing Library queries appropriately
- Avoid testing internal state

## Coverage Requirements

Maintain high test coverage:
- Statements: > 80%
- Branches: > 80%
- Functions: > 80%
- Lines: > 80%

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-deployment

## Common Testing Scenarios

### Testing Server Actions

```typescript
import { createAudioButton } from "@/actions/audio-buttons";

it("should create audio button", async () => {
  const result = await createAudioButton({
    text: "Test",
    videoId: "abc123",
  });
  
  expect(result.success).toBe(true);
});
```

### Testing Authentication

```typescript
import { mockSession } from "@/test/utils";

it("should require authentication", async () => {
  mockSession(null); // Not authenticated
  
  const result = await protectedAction();
  expect(result.error).toBe("Unauthorized");
});
```

### Testing with Firestore

```typescript
import { getTestFirestore } from "@/test/firestore";

it("should query audio buttons", async () => {
  const db = getTestFirestore();
  
  // Add test data
  await db.collection("audioButtons").add({
    text: "Test",
    videoId: "abc123",
  });
  
  // Test query
  const snapshot = await db
    .collection("audioButtons")
    .where("videoId", "==", "abc123")
    .get();
    
  expect(snapshot.size).toBe(1);
});
```

## Debugging Tests

### VSCode Integration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging E2E Tests

```bash
# Run with UI mode
pnpm --filter @suzumina.click/web test:e2e --ui

# Run with debug mode
pnpm --filter @suzumina.click/web test:e2e --debug
```

## Troubleshooting

### Common Issues

1. **Flaky tests**: Use proper waits and assertions
2. **Timeout errors**: Increase timeout for slow operations
3. **Module not found**: Check import paths and aliases

### Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)

---

**Last Updated**: 2025-07-28