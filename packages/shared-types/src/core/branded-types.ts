/**
 * Branded Types for Type-Safe Domain Modeling
 *
 * Branded types (also known as nominal types) allow us to create distinct types
 * from primitives, preventing accidental misuse of values.
 */

/**
 * The brand symbol used to create nominal types
 */
declare const __brand: unique symbol;

/**
 * Creates a branded type from a base type
 * @template K - The base type
 * @template T - The brand identifier
 */
export type Brand<K, T> = K & { [__brand]: T };

/**
 * Type guard signature for branded types
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Factory function signature for branded types
 */
export type BrandFactory<T> = {
	/**
	 * Creates a branded type, throwing if validation fails
	 */
	of(value: string): T;

	/**
	 * Creates a branded type, returning undefined if validation fails
	 */
	tryOf(value: string): T | undefined;

	/**
	 * Type guard to check if a value is valid for the brand
	 */
	isValid(value: unknown): value is T;

	/**
	 * Parses unknown input to the branded type
	 */
	parse(value: unknown): T;
};

/**
 * Creates a brand factory with validation
 */
export function createBrandFactory<T>(
	validate: (value: string) => boolean,
	errorMessage: (value: string) => string,
): BrandFactory<T> {
	return {
		of(value: string): T {
			if (!validate(value)) {
				throw new Error(errorMessage(value));
			}
			return value as T;
		},

		tryOf(value: string): T | undefined {
			if (!validate(value)) {
				return undefined;
			}
			return value as T;
		},

		isValid(value: unknown): value is T {
			return typeof value === "string" && validate(value);
		},

		parse(value: unknown): T {
			if (typeof value !== "string") {
				throw new Error(`Expected string, got ${typeof value}`);
			}
			return this.of(value);
		},
	};
}
