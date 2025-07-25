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
 * Base interface for entity cloning
 */
export interface EntityClonable<T> {
	/**
	 * Creates a deep copy of the entity
	 */
	clone(): T;
}

/**
 * Base interface for entity equality
 */
export interface EntityEquatable<T> {
	/**
	 * Checks if two entities are equal
	 */
	equals(other: T): boolean;
}

/**
 * Abstract base class for all entities
 */
export abstract class BaseEntity<T> implements EntityClonable<T>, EntityEquatable<T> {
	/**
	 * Creates a deep copy of the entity
	 */
	abstract clone(): T;

	/**
	 * Checks if two entities are equal
	 */
	abstract equals(other: T): boolean;
}
