/**
 * Work entity conversion utilities
 *
 * Provides utilities for converting between different Work representations
 * to support gradual migration from legacy types to entity-based architecture.
 */

import type { DatabaseError, NotFoundError } from "../core/result";
import { databaseError, err, notFoundError, ok, type Result } from "../core/result";
import type { WorkDocument } from "../entities/work/work-document-schema";
import type { WorkPlainObject } from "../plain-objects/work-plain";
import { workTransformers } from "../transformers/work-firestore-final";

/**
 * Converts WorkDocument to WorkPlainObject via Work entity
 *
 * This function provides a migration path from legacy Firestore data types
 * to the new entity-based plain object format. It uses the Work entity
 * as an intermediate representation to ensure all business logic is applied.
 *
 * @param data Firestore work data
 * @returns Plain object representation or null if conversion fails
 *
 * @example
 * ```typescript
 * // In a Server Component or API route
 * const firestoreData = await getWorkFromFirestore(workId);
 * const plainObject = convertToWorkPlainObject(firestoreData);
 *
 * if (plainObject) {
 *   // Pass to Client Component
 *   return <WorkDetails work={plainObject} />;
 * }
 * ```
 */
export function convertToWorkPlainObject(
	data: WorkDocument | null | undefined,
): Result<WorkPlainObject, NotFoundError | DatabaseError> {
	if (!data) {
		return err(notFoundError("work", "Work document is null or undefined"));
	}

	try {
		const plainObject = workTransformers.fromFirestore(data);
		return ok(plainObject);
	} catch (error) {
		return err(
			databaseError(
				error instanceof Error ? error.message : "Failed to convert work data",
				"CONVERSION_ERROR",
			),
		);
	}
}

/**
 * Converts an array of WorkDocument to WorkPlainObject array
 *
 * Filters out any works that fail to convert, ensuring a clean array
 * of valid plain objects.
 *
 * @param dataArray Array of Firestore work data
 * @returns Array of plain objects (excluding failed conversions)
 *
 * @example
 * ```typescript
 * // In a Server Component
 * const firestoreWorks = await getWorksFromFirestore();
 * const plainObjects = convertToWorkPlainObjects(firestoreWorks);
 *
 * // Pass to Client Component
 * return <WorkList works={plainObjects} />;
 * ```
 */
export function convertToWorkPlainObjects(
	dataArray: WorkDocument[],
): Result<WorkPlainObject[], DatabaseError> {
	const results: WorkPlainObject[] = [];

	for (const data of dataArray) {
		const result = convertToWorkPlainObject(data);
		if (result.isOk()) {
			results.push(result.value);
		}
		// Skip failed conversions silently (as before)
	}

	return ok(results);
}

/**
 * Type guard to check if an object is a WorkPlainObject
 *
 * This is useful when working with mixed data types during migration.
 *
 * @param obj Object to check
 * @returns True if the object is a WorkPlainObject
 */
export function isWorkPlainObject(obj: unknown): obj is WorkPlainObject {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"id" in obj &&
		"productId" in obj &&
		"title" in obj &&
		"price" in obj &&
		"_computed" in obj &&
		typeof (obj as Record<string, unknown>)._computed === "object"
	);
}

/**
 * Migration helper to handle both legacy and new data formats
 *
 * This function accepts either WorkDocument or WorkPlainObject
 * and returns a normalized WorkPlainObject. This is useful during the
 * migration period when both formats may coexist.
 *
 * @param data Either Firestore data or plain object
 * @returns Normalized plain object or null
 */
export function normalizeToWorkPlainObject(
	data: WorkDocument | WorkPlainObject | null | undefined,
): Result<WorkPlainObject, NotFoundError | DatabaseError> {
	if (!data) {
		return err(notFoundError("work", "Input data is null or undefined"));
	}

	// If it's already a plain object, return it
	if (isWorkPlainObject(data)) {
		return ok(data);
	}

	// Otherwise, convert from Firestore data
	return convertToWorkPlainObject(data as WorkDocument);
}
