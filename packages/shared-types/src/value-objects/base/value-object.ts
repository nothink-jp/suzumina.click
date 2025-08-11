/**
 * Base interface for Value Objects
 *
 * Value Objects are immutable objects that represent domain concepts
 * and are compared by their values rather than identity.
 */

/**
 * Base interface that all Value Objects must implement
 */
export interface ValueObject<T> {
	/**
	 * Checks equality with another value object
	 * @param other - The value object to compare with
	 * @returns true if the value objects are equal
	 */
	equals(other: T): boolean;

	/**
	 * Creates a deep copy of the value object
	 * @returns A new instance with the same values
	 */
	clone(): T;
}

/**
 * Compare two arrays for deep equality
 */
function compareArrays(a: unknown[], b: unknown[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (!deepEquals(a[i], b[i])) return false;
	}
	return true;
}

/**
 * Compare two objects for deep equality
 */
function compareObjects(a: object, b: object): boolean {
	const aObj = a as Record<string, unknown>;
	const bObj = b as Record<string, unknown>;

	const aKeys = Object.keys(aObj);
	const bKeys = new Set(Object.keys(bObj));

	if (aKeys.length !== bKeys.size) return false;

	for (const key of aKeys) {
		if (!bKeys.has(key)) return false;
		if (!deepEquals(aObj[key], bObj[key])) return false;
	}

	return true;
}

/**
 * Deep equality comparison helper
 */
function deepEquals(a: unknown, b: unknown): boolean {
	// Handle null/undefined and same reference
	if (a === b) return true;
	if (a == null || b == null) return false;

	// Type must match
	if (typeof a !== typeof b) return false;

	// Handle arrays
	if (Array.isArray(a)) {
		return Array.isArray(b) && compareArrays(a, b);
	}

	// Handle objects
	if (typeof a === "object") {
		return compareObjects(a, b);
	}

	// Primitive values already checked with a === b
	return false;
}

/**
 * Base abstract class for Value Objects with common functionality
 */
export abstract class BaseValueObject<T> implements ValueObject<T> {
	/**
	 * Optimized equals implementation using deep comparison
	 * Subclasses can override for domain-specific optimization
	 */
	equals(other: T): boolean {
		if (other === null || other === undefined) {
			return false;
		}
		if ((other as unknown) === this) {
			return true;
		}
		return deepEquals(this, other);
	}

	/**
	 * Abstract clone method that must be implemented by subclasses
	 */
	abstract clone(): T;
}

/**
 * Interface for Value Objects that can be validated
 */
export interface ValidatableValueObject<T> extends ValueObject<T> {
	/**
	 * Validates the value object
	 * @returns true if valid, false otherwise
	 */
	isValid(): boolean;

	/**
	 * Gets validation errors if any
	 * @returns Array of validation error messages
	 */
	getValidationErrors(): string[];
}
