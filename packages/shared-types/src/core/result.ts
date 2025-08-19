/**
 * Result/Either Pattern for Error Handling
 *
 * This module provides Result types and utilities for functional error handling,
 * wrapping and extending the neverthrow library.
 */

// Re-export only the actually used types and functions from neverthrow
export { err, ok, type Result } from "neverthrow";

/**
 * Standard validation error structure
 */
export interface ValidationError {
	field: string;
	message: string;
}

/**
 * Domain-specific error types
 */
export type DomainError =
	| ValidationError
	| NotFoundError
	| UnauthorizedError
	| DatabaseError
	| NetworkError
	| BusinessRuleError;

/**
 * Entity or resource not found
 */
export interface NotFoundError {
	type: "NotFound";
	id: string;
	resource: string;
}

/**
 * Unauthorized access attempt
 */
export interface UnauthorizedError {
	type: "Unauthorized";
	reason?: string;
}

/**
 * Database operation error
 */
export interface DatabaseError {
	type: "DatabaseError";
	operation: string;
	detail: string;
}

/**
 * Network/API call error
 */
export interface NetworkError {
	type: "NetworkError";
	url?: string;
	statusCode?: number;
	message: string;
}

/**
 * Business rule violation
 */
export interface BusinessRuleError {
	type: "BusinessRule";
	rule: string;
	message: string;
}

/**
 * Helper to create a validation error
 */
export function validationError(field: string, message: string): ValidationError {
	return { field, message };
}

/**
 * Helper to create a not found error
 */
export function notFoundError(id: string, resource: string): NotFoundError {
	return { type: "NotFound", id, resource };
}

/**
 * Helper to create an unauthorized error
 */
export function unauthorizedError(reason?: string): UnauthorizedError {
	return { type: "Unauthorized", reason };
}

/**
 * Helper to create a database error
 */
export function databaseError(operation: string, detail: string): DatabaseError {
	return { type: "DatabaseError", operation, detail };
}

/**
 * Helper to create a network error
 */
export function networkError(message: string, url?: string, statusCode?: number): NetworkError {
	return { type: "NetworkError", url, statusCode, message };
}

/**
 * Helper to create a business rule error
 */
export function businessRuleError(rule: string, message: string): BusinessRuleError {
	return { type: "BusinessRule", rule, message };
}

/**
 * Type guard for validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
	return (
		typeof error === "object" &&
		error !== null &&
		"field" in error &&
		"message" in error &&
		!("type" in error)
	);
}

/**
 * Type guard for domain errors with type field
 */
export function isDomainError(error: unknown): error is DomainError {
	if (isValidationError(error)) return true;

	return typeof error === "object" && error !== null && "type" in error;
}

/**
 * Combines multiple validation errors
 */
export function combineValidationErrors(errors: ValidationError[]): ValidationError {
	const fields = errors.map((e) => e.field).join(", ");
	const messages = errors.map((e) => `${e.field}: ${e.message}`).join("; ");
	return {
		field: fields,
		message: messages,
	};
}
