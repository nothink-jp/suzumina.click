/**
 * Work Validation Functions
 *
 * Pure functions for validating work data.
 * Replaces Work Entity and Value Object validation logic.
 */

import type { WorkPlainObject } from "../plain-objects/work-plain";

/**
 * Validation result type
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Validates a work ID format (RJ + 6-8 digits)
 */
export function validateWorkId(workId: string): ValidationResult {
	const errors: string[] = [];

	if (!workId) {
		errors.push("Work ID is required");
	} else if (!/^RJ\d{6,8}$/.test(workId)) {
		errors.push("Work ID must be in format RJ followed by 6-8 digits");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates work title
 */
export function validateWorkTitle(title: string): ValidationResult {
	const errors: string[] = [];

	if (!title || title.trim().length === 0) {
		errors.push("Title is required");
	} else if (title.length > 500) {
		errors.push("Title must be 500 characters or less");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates work price
 */
export function validateWorkPrice(price: WorkPlainObject["price"]): ValidationResult {
	const errors: string[] = [];

	if (price.current < 0) {
		errors.push("Current price cannot be negative");
	}

	if (price.original && price.original < 0) {
		errors.push("Original price cannot be negative");
	}

	if (price.original && price.current > price.original) {
		errors.push("Current price cannot exceed original price");
	}

	if (price.discount && (price.discount < 0 || price.discount > 100)) {
		errors.push("Discount must be between 0 and 100");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates work rating
 */
export function validateWorkRating(rating?: WorkPlainObject["rating"]): ValidationResult {
	const errors: string[] = [];

	if (!rating) {
		return { isValid: true, errors: [] };
	}

	if (rating.average < 0 || rating.average > 5) {
		errors.push("Rating average must be between 0 and 5");
	}

	if (rating.count < 0) {
		errors.push("Rating count cannot be negative");
	}

	if (rating.reviewCount !== undefined && rating.reviewCount < 0) {
		errors.push("Review count cannot be negative");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates circle information
 */
export function validateCircle(circle: string, circleId?: string): ValidationResult {
	const errors: string[] = [];

	if (!circle || circle.trim().length === 0) {
		errors.push("Circle name is required");
	} else if (circle.length > 200) {
		errors.push("Circle name must be 200 characters or less");
	}

	if (circleId && !/^RG\d{5,8}$/.test(circleId)) {
		errors.push("Circle ID must be in format RG followed by 5-8 digits");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Validates complete work object
 */
export function validateWork(work: WorkPlainObject): ValidationResult {
	const errors: string[] = [];

	// Validate required fields
	const idValidation = validateWorkId(work.productId);
	if (!idValidation.isValid) {
		errors.push(...idValidation.errors);
	}

	const titleValidation = validateWorkTitle(work.title);
	if (!titleValidation.isValid) {
		errors.push(...titleValidation.errors);
	}

	const circleValidation = validateCircle(work.circle, work.circleId);
	if (!circleValidation.isValid) {
		errors.push(...circleValidation.errors);
	}

	const priceValidation = validateWorkPrice(work.price);
	if (!priceValidation.isValid) {
		errors.push(...priceValidation.errors);
	}

	const ratingValidation = validateWorkRating(work.rating);
	if (!ratingValidation.isValid) {
		errors.push(...ratingValidation.errors);
	}

	// Validate URLs
	if (work.workUrl && !isValidUrl(work.workUrl)) {
		errors.push("Invalid work URL");
	}

	if (work.thumbnailUrl && !isValidUrl(work.thumbnailUrl)) {
		errors.push("Invalid thumbnail URL");
	}

	// Validate dates
	if (work.releaseDate && !isValidISODate(work.releaseDate)) {
		errors.push("Invalid release date format");
	}

	// Validate arrays
	if (!Array.isArray(work.genres)) {
		errors.push("Genres must be an array");
	}

	if (!Array.isArray(work.customGenres)) {
		errors.push("Custom genres must be an array");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Gets validation errors for a work (backward compatibility)
 */
export function getValidationErrors(work: WorkPlainObject): string[] {
	return validateWork(work).errors;
}

/**
 * Checks if a work is valid (backward compatibility)
 */
export function isValid(work: WorkPlainObject): boolean {
	return validateWork(work).isValid;
}

// Helper functions

function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

function isValidISODate(dateString: string): boolean {
	const date = new Date(dateString);
	return !Number.isNaN(date.getTime()) && date.toISOString() === dateString;
}

/**
 * Work validators namespace for backward compatibility
 */
export const workValidators = {
	validateWork,
	validateWorkId,
	validateWorkTitle,
	validateWorkPrice,
	validateWorkRating,
	validateCircle,
	getValidationErrors,
	isValid,
};
