import { describe, expect, it } from "vitest";
import {
	isArray,
	isBoolean,
	isDate,
	isDefined,
	isEmptyString,
	isNullOrUndefined,
	isNumber,
	isObject,
	isString,
} from "../base/guards";
import {
	clamp,
	requireNonEmptyString,
	requireNonNegativeNumber,
	requireNonNull,
	requirePositiveNumber,
	roundTo,
	toBoolean,
	toNumber,
	valueToString,
} from "../base/transforms";
import {
	BaseValueObject,
	type ValidatableValueObject,
	type ValueObject,
} from "../base/value-object";

// Test implementation of a Value Object
class TestValueObject extends BaseValueObject<TestValueObject> {
	constructor(
		public readonly id: string,
		public readonly value: number,
	) {
		super();
	}

	clone(): TestValueObject {
		return new TestValueObject(this.id, this.value);
	}
}

// Test implementation with custom equals/clone
class CustomValueObject implements ValueObject<CustomValueObject> {
	constructor(
		public readonly name: string,
		public readonly items: string[],
	) {}

	equals(other: CustomValueObject): boolean {
		return (
			other?.name === this.name &&
			other?.items?.length === this.items.length &&
			other?.items?.every((item, index) => item === this.items[index])
		);
	}

	clone(): CustomValueObject {
		return new CustomValueObject(this.name, [...this.items]);
	}
}

// Test implementation of ValidatableValueObject
class ValidatableTestObject
	extends BaseValueObject<ValidatableTestObject>
	implements ValidatableValueObject<ValidatableTestObject>
{
	constructor(
		public readonly email: string,
		public readonly age: number,
	) {
		super();
	}

	clone(): ValidatableTestObject {
		return new ValidatableTestObject(this.email, this.age);
	}

	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	getValidationErrors(): string[] {
		const errors: string[] = [];
		// Simple email validation for test purposes
		if (!this.email.includes("@")) {
			errors.push("Invalid email format");
		}
		if (this.age < 0 || this.age > 150) {
			errors.push("Age must be between 0 and 150");
		}
		return errors;
	}
}

describe("Value Object Base", () => {
	describe("BaseValueObject", () => {
		it("should implement equals using JSON comparison", () => {
			const obj1 = new TestValueObject("1", 100);
			const obj2 = new TestValueObject("1", 100);
			const obj3 = new TestValueObject("2", 100);

			expect(obj1.equals(obj2)).toBe(true);
			expect(obj1.equals(obj3)).toBe(false);
			expect(obj1.equals(null as any)).toBe(false);
			expect(obj1.equals(undefined as any)).toBe(false);
			expect(obj1.equals(obj1)).toBe(true);
		});

		it("should implement clone using JSON parse/stringify", () => {
			const original = new TestValueObject("1", 100);
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.id).toBe(original.id);
			expect(cloned.value).toBe(original.value);
			expect(cloned.equals(original)).toBe(true);
		});
	});

	describe("Custom Value Object", () => {
		it("should use custom equals implementation", () => {
			const obj1 = new CustomValueObject("test", ["a", "b"]);
			const obj2 = new CustomValueObject("test", ["a", "b"]);
			const obj3 = new CustomValueObject("test", ["a", "c"]);

			expect(obj1.equals(obj2)).toBe(true);
			expect(obj1.equals(obj3)).toBe(false);
		});

		it("should use custom clone implementation", () => {
			const original = new CustomValueObject("test", ["a", "b"]);
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.items).not.toBe(original.items);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			cloned.items.push("c");
			expect(original.items).toHaveLength(2);
		});
	});

	describe("ValidatableValueObject", () => {
		it("should validate correctly", () => {
			const valid = new ValidatableTestObject("test@example.com", 25);
			const invalidEmail = new ValidatableTestObject("invalid-email", 25);
			const invalidAge = new ValidatableTestObject("test@example.com", 200);

			expect(valid.isValid()).toBe(true);
			expect(valid.getValidationErrors()).toHaveLength(0);

			expect(invalidEmail.isValid()).toBe(false);
			expect(invalidEmail.getValidationErrors()).toContain("Invalid email format");

			expect(invalidAge.isValid()).toBe(false);
			expect(invalidAge.getValidationErrors()).toContain("Age must be between 0 and 150");
		});
	});
});

describe("Transform Functions", () => {
	describe("requireNonNull", () => {
		it("should return value if not null/undefined", () => {
			expect(requireNonNull("test", "value")).toBe("test");
			expect(requireNonNull(0, "value")).toBe(0);
			expect(requireNonNull(false, "value")).toBe(false);
		});

		it("should throw if null/undefined", () => {
			expect(() => requireNonNull(null, "value")).toThrow("value must not be null or undefined");
			expect(() => requireNonNull(undefined, "value")).toThrow(
				"value must not be null or undefined",
			);
		});
	});

	describe("valueToString", () => {
		it("should convert values to string", () => {
			expect(valueToString(123)).toBe("123");
			expect(valueToString(true)).toBe("true");
			expect(valueToString(null)).toBe("");
			expect(valueToString(undefined, "default")).toBe("default");
		});
	});

	describe("toNumber", () => {
		it("should convert values to number", () => {
			expect(toNumber("123")).toBe(123);
			expect(toNumber("123.45")).toBe(123.45);
			expect(toNumber(null)).toBe(0);
			expect(toNumber("invalid", 99)).toBe(99);
		});
	});

	describe("toBoolean", () => {
		it("should convert values to boolean", () => {
			expect(toBoolean(1)).toBe(true);
			expect(toBoolean(0)).toBe(false);
			expect(toBoolean("test")).toBe(true);
			expect(toBoolean("")).toBe(false);
			expect(toBoolean(null)).toBe(false);
		});
	});

	describe("requireNonEmptyString", () => {
		it("should return trimmed string if not empty", () => {
			expect(requireNonEmptyString("  test  ", "value")).toBe("test");
		});

		it("should throw if empty", () => {
			expect(() => requireNonEmptyString("", "value")).toThrow("value must not be empty");
			expect(() => requireNonEmptyString("   ", "value")).toThrow("value must not be empty");
		});
	});

	describe("requirePositiveNumber", () => {
		it("should return number if positive", () => {
			expect(requirePositiveNumber(1, "value")).toBe(1);
			expect(requirePositiveNumber(0.1, "value")).toBe(0.1);
		});

		it("should throw if not positive", () => {
			expect(() => requirePositiveNumber(0, "value")).toThrow("value must be a positive number");
			expect(() => requirePositiveNumber(-1, "value")).toThrow("value must be a positive number");
		});
	});

	describe("requireNonNegativeNumber", () => {
		it("should return number if non-negative", () => {
			expect(requireNonNegativeNumber(0, "value")).toBe(0);
			expect(requireNonNegativeNumber(1, "value")).toBe(1);
		});

		it("should throw if negative", () => {
			expect(() => requireNonNegativeNumber(-1, "value")).toThrow("value must not be negative");
		});
	});

	describe("clamp", () => {
		it("should clamp values between min and max", () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-5, 0, 10)).toBe(0);
			expect(clamp(15, 0, 10)).toBe(10);
		});
	});

	describe("roundTo", () => {
		it("should round to specified decimals", () => {
			expect(roundTo(1.2345, 2)).toBe(1.23);
			expect(roundTo(1.2355, 2)).toBe(1.24);
			expect(roundTo(1.5, 0)).toBe(2);
		});
	});
});

describe("Guard Functions", () => {
	describe("basic type guards", () => {
		it("should check object type", () => {
			expect(isObject({})).toBe(true);
			expect(isObject([])).toBe(true);
			expect(isObject(null)).toBe(false);
			expect(isObject("test")).toBe(false);
		});

		it("should check string type", () => {
			expect(isString("test")).toBe(true);
			expect(isString("")).toBe(true);
			expect(isString(123)).toBe(false);
		});

		it("should check number type", () => {
			expect(isNumber(123)).toBe(true);
			expect(isNumber(0)).toBe(true);
			expect(isNumber(Number.NaN)).toBe(false);
			expect(isNumber("123")).toBe(false);
		});

		it("should check boolean type", () => {
			expect(isBoolean(true)).toBe(true);
			expect(isBoolean(false)).toBe(true);
			expect(isBoolean(1)).toBe(false);
		});

		it("should check array type", () => {
			expect(isArray([])).toBe(true);
			expect(isArray([1, 2, 3])).toBe(true);
			expect(isArray({})).toBe(false);
		});

		it("should check Date type", () => {
			expect(isDate(new Date())).toBe(true);
			expect(isDate(new Date("invalid"))).toBe(false);
			expect(isDate("2023-01-01")).toBe(false);
		});
	});

	describe("null/undefined guards", () => {
		it("should check null or undefined", () => {
			expect(isNullOrUndefined(null)).toBe(true);
			expect(isNullOrUndefined(undefined)).toBe(true);
			expect(isNullOrUndefined(0)).toBe(false);
			expect(isNullOrUndefined("")).toBe(false);
		});

		it("should check if defined", () => {
			expect(isDefined(0)).toBe(true);
			expect(isDefined("")).toBe(true);
			expect(isDefined(null)).toBe(false);
			expect(isDefined(undefined)).toBe(false);
		});
	});

	describe("string validation guards", () => {
		it("should check empty string", () => {
			expect(isEmptyString("")).toBe(true);
			expect(isEmptyString("   ")).toBe(true);
			expect(isEmptyString("test")).toBe(false);
		});
	});
});
