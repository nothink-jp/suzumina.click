/**
 * Work entity conversion utilities
 *
 * Provides utilities for converting between different Work representations
 * to support gradual migration from legacy types to entity-based architecture.
 */

import type { WorkDocument } from "../entities/work";
import { Work } from "../entities/work-entity";
import type { WorkPlainObject } from "../plain-objects/work-plain";

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
): WorkPlainObject | null {
	if (!data) {
		return null;
	}

	const work = Work.fromFirestoreData(data);
	if (!work) {
		return null;
	}

	return work.toPlainObject();
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
export function convertToWorkPlainObjects(dataArray: WorkDocument[]): WorkPlainObject[] {
	return dataArray
		.map((data) => convertToWorkPlainObject(data))
		.filter((work): work is WorkPlainObject => work !== null);
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
): WorkPlainObject | null {
	if (!data) {
		return null;
	}

	// If it's already a plain object, return it
	if (isWorkPlainObject(data)) {
		return data;
	}

	// Otherwise, convert from Firestore data
	return convertToWorkPlainObject(data as WorkDocument);
}
