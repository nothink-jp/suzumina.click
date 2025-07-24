# PR #2: Value Object Base Implementation

## Overview

This PR introduces the foundational infrastructure for Value Objects in the shared-types package. It provides base interfaces, abstract classes, and utility functions that will be used to implement specific Value Objects in subsequent PRs.

## Implementation Details

### Base Interfaces

1. **ValueObject<T>** - Core interface all Value Objects must implement
   - `equals(other: T): boolean` - Value-based equality comparison
   - `clone(): T` - Deep copy functionality

2. **ValidatableValueObject<T>** - For Value Objects with validation
   - `isValid(): boolean` - Validation check
   - `getValidationErrors(): string[]` - Detailed validation errors

3. **SerializableValueObject<T, S>** - For Value Objects that can be serialized
   - `toJSON(): S` - Convert to plain object for storage

### Base Abstract Class

**BaseValueObject<T>** - Provides default implementations:
- Default `equals()` using JSON comparison (subclasses should override for performance)
- Abstract `clone()` method (must be implemented by subclasses)

### Utility Functions

#### Transform Functions (`transforms.ts`)
- `requireNonNull<T>()` - Ensures value is not null/undefined
- `valueToString()` - Safe string conversion with defaults
- `toNumber()` - Safe number conversion with defaults
- `toBoolean()` - Boolean conversion
- `requireNonEmptyString()` - Validates non-empty strings
- `requirePositiveNumber()` - Validates positive numbers
- `requireNonNegativeNumber()` - Validates non-negative numbers
- `clamp()` - Clamps numbers between min/max
- `roundTo()` - Rounds to specified decimal places

#### Guard Functions (`guards.ts`)
- Basic type guards: `isObject()`, `isString()`, `isNumber()`, `isBoolean()`, `isArray()`, `isDate()`
- Null/undefined guards: `isNullOrUndefined()`, `isDefined()`
- String validation: `isEmptyString()`, `isEmail()`, `isUrl()`
- Property guards: `hasProperty()`, `hasProperties()`

### File Structure

```
packages/shared-types/src/value-objects/
├── base/
│   ├── value-object.ts      # Base interfaces and abstract class
│   ├── transforms.ts        # Transform utility functions
│   ├── guards.ts           # Type guard functions
│   └── index.ts            # Re-exports
├── __tests__/
│   └── base.test.ts        # Comprehensive test coverage
└── index.ts                # Module exports
```

## Test Coverage

- **32 test cases** covering all functionality
- Tests for base abstract class behavior
- Tests for all transform functions
- Tests for all guard functions
- Example implementations demonstrating usage patterns

## Usage Example

```typescript
import { BaseValueObject, isEmail, requireNonEmptyString } from "@suzumina.click/shared-types";

class Email extends BaseValueObject<Email> {
  private readonly value: string;

  constructor(value: string) {
    super();
    this.value = requireNonEmptyString(value, "email").toLowerCase();
    if (!isEmail(this.value)) {
      throw new Error("Invalid email format");
    }
  }

  clone(): Email {
    return new Email(this.value);
  }

  toString(): string {
    return this.value;
  }
}
```

## Dependencies

- PR #1 (Type Aliasing) - ✅ Merged

## Next Steps

This foundation enables the implementation of specific Value Objects:
- PR #3: Video Value Objects (Part 1)
- PR #4: Video Value Objects (Part 2)
- And subsequent Value Object implementations

## Breaking Changes

None - This PR only adds new functionality.

## Testing

```bash
pnpm --filter @suzumina.click/shared-types test
pnpm lint
pnpm typecheck
```

All tests pass ✅