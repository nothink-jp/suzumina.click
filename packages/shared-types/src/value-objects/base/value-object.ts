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
 * Base abstract class for Value Objects with common functionality
 */
export abstract class BaseValueObject<T> implements ValueObject<T> {
	/**
	 * Default implementation of equals using JSON comparison
	 * Subclasses should override for better performance
	 */
	equals(other: T): boolean {
		if (other === null || other === undefined) {
			return false;
		}
		if ((other as unknown) === this) {
			return true;
		}
		return JSON.stringify(this) === JSON.stringify(other);
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

/**
 * Interface for Value Objects that can be serialized
 */
export interface SerializableValueObject<T, S = unknown> extends ValueObject<T> {
	/**
	 * Converts the value object to a plain object for storage
	 * @returns Plain object representation
	 */
	toJSON(): S;
}

/**
 * Utility type for extracting the serialized type of a value object
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for generic type inference
export type SerializedType<T> = T extends SerializableValueObject<any, infer S> ? S : never;
