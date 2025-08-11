/**
 * Base Entity classes and interfaces
 *
 * Provides common functionality for all entities in the domain model.
 */

/**
 * Base interface for entity validation
 */
export interface EntityValidatable<_T> {
	/**
	 * Validates the entity and returns whether it's valid
	 */
	isValid(): boolean;

	/**
	 * Returns an array of validation error messages
	 */
	getValidationErrors(): string[];
}

/**
 * Abstract base class for all entities
 *
 * Provides common functionality for domain entities including
 * cloning and equality checking.
 */
export abstract class BaseEntity<T> {
	/**
	 * Creates a deep copy of the entity
	 */
	abstract clone(): T;

	/**
	 * Checks if two entities are equal
	 */
	abstract equals(other: T): boolean;
}
