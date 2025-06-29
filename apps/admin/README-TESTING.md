# Admin App Testing Guide

## 🧪 Test Setup

The admin application now includes a comprehensive test suite using **Vitest** with **React Testing Library** for component testing and **jsdom** for DOM simulation.

### Test Structure

```
src/__tests__/
├── api/                    # API logic tests
│   └── api-logic.test.ts
├── components/             # Component behavior tests  
│   └── simple-components.test.tsx
├── integration/            # Integration workflow tests
│   └── admin-workflow.test.ts
└── utils/                  # Utility function tests
    ├── auth.test.ts
    ├── data-helpers.test.ts
    └── firestore.test.ts
```

## 🚀 Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## 📊 Current Test Coverage

- **47 test cases** covering core functionality
- **6 test files** organized by feature area
- **Authentication logic** - Admin/non-admin user scenarios
- **Firestore operations** - CRUD operations and query logic
- **API logic** - Data processing and validation
- **Component behavior** - User interactions and data conversion
- **Integration workflows** - End-to-end admin scenarios
- **Utility functions** - Data formatting and validation helpers

## 🔧 Test Categories

### 1. Authentication Tests (`auth.test.ts`)
- Admin user authentication
- Non-admin user rejection
- Unauthenticated user handling
- Missing user data scenarios

### 2. Firestore Tests (`firestore.test.ts`)
- Firestore instance creation
- Collection and document access
- Document operations (get, set, update, delete)
- Query operations with ordering and limits

### 3. API Logic Tests (`api-logic.test.ts`)
- Authentication logic for API routes
- Button update and deletion logic
- Boolean conversion for form data
- YouTube data processing
- Environment variable validation

### 4. Component Logic Tests (`simple-components.test.tsx`)
- LoginButton functionality
- RefreshButton API calls
- EditDialog form data handling
- DeleteDialog confirmation flow

### 5. Data Helpers Tests (`data-helpers.test.ts`)
- Time formatting (formatTime)
- Price formatting (formatPrice)  
- Rating formatting (formatRating)
- Data validation (validateButtonData)
- String sanitization
- Statistics generation

### 6. Integration Tests (`admin-workflow.test.ts`)
- Complete audio button management workflow
- User role management workflow
- Data refresh workflow
- Error handling scenarios
- Form data validation workflow

## 🛠️ Test Configuration

### Vitest Config (`vitest.config.ts`)
- **Environment**: jsdom for DOM simulation
- **Setup**: Automated mocks for Next.js and Firestore
- **Coverage**: v8 provider with HTML/JSON/text reports
- **Path aliases**: `@/` resolved to `./src`

### Test Setup (`test-setup.ts`)
- Global mocks for fetch, alert, ResizeObserver, IntersectionObserver
- Jest DOM matchers for improved assertions

### Mock Strategy
- **Authentication**: Mocked `@/lib/auth` with configurable user scenarios
- **Firestore**: Mocked `@/lib/firestore` with realistic operation simulation
- **Next.js**: Mocked navigation and routing functions
- **External APIs**: Mocked fetch for API testing

## ✅ Test Quality Guidelines

### What We Test
- **Business logic** - Core admin functionality
- **Data transformations** - Form data processing and validation
- **Authentication flows** - Admin access control
- **Error scenarios** - Graceful failure handling
- **Integration workflows** - End-to-end admin tasks

### What We Don't Test
- **UI rendering** - Too complex with current setup, covered by manual testing
- **Actual API routes** - Focus on logic rather than HTTP layer
- **External dependencies** - YouTube API, etc. are mocked
- **Styling and layout** - Visual aspects tested manually

## 🔄 Adding New Tests

### 1. Component Tests
```typescript
// For component logic tests
describe("ComponentName", () => {
  it("should handle specific behavior", () => {
    // Test the logic/behavior, not rendering
  });
});
```

### 2. API Logic Tests
```typescript
// For API route logic
describe("API Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate admin authentication", async () => {
    // Test authentication logic
  });
});
```

### 3. Integration Tests
```typescript
// For end-to-end workflows
describe("Admin Workflow", () => {
  it("should complete full admin task", async () => {
    // Test complete user journey
  });
});
```

## 📈 Benefits of Current Approach

1. **Fast execution** - Tests run in ~650ms
2. **Reliable mocking** - Consistent test environment
3. **Logic focused** - Tests core functionality over UI
4. **Maintainable** - Simple, focused test cases
5. **CI friendly** - No external dependencies required
6. **Coverage reporting** - Track test effectiveness

## 🎯 Future Enhancements

- **E2E tests** with Playwright for full user journeys
- **Visual regression tests** for UI consistency
- **Performance tests** for admin operations
- **API integration tests** against real endpoints
- **Database integration tests** with test Firestore instance

This testing approach provides confidence in admin functionality while remaining maintainable and fast to execute.