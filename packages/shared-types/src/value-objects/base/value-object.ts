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
 * Helper function to compare object properties
 */
function compareObjectProperties(
	aObj: Record<string, unknown>,
	bObj: Record<string, unknown>,
): boolean {
	const aKeys = Object.keys(aObj);
	const bKeys = Object.keys(bObj);

	if (aKeys.length !== bKeys.length) return false;

	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false;
		if (!deepEquals(aObj[key], bObj[key])) return false;
	}

	return true;
}

/**
 * Deep equality comparison helper
 */
function deepEquals(a: unknown, b: unknown): boolean {
	// Early returns for primitive comparisons
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (typeof a !== typeof b) return false;

	// Object comparison
	if (typeof a === "object") {
		return compareObjectProperties(a as Record<string, unknown>, b as Record<string, unknown>);
	}

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
