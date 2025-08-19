/**
 * Work conversion utilities for backward compatibility
 *
 * This file provides backward compatibility for existing code
 * that uses the old function names.
 */

import type { DatabaseError, NotFoundError } from "../core/result";
import { err, ok, type Result } from "../core/result";
import type { WorkData } from "../models/work-data";
import type { WorkPlainObject } from "../plain-objects/work-plain";
import { type FirestoreWorkDocument, fromFirestore } from "../transformers/firestore-transformer";
import { toWorkPlainObject as toPlainObject } from "../transformers/legacy-transformer";

/**
 * Union type for work document formats
 */
type WorkDocumentInput = WorkData | FirestoreWorkDocument | WorkPlainObject | unknown;

/**
 * Converts WorkDocument (unified) or FirestoreWorkDocument to WorkData
 */
function convertToWorkData(data: unknown): WorkData | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const obj = data as Record<string, unknown>;

	// Check if it's already WorkData format
	if (
		typeof obj.circle === "object" &&
		obj.circle &&
		"name" in obj.circle &&
		"productId" in obj &&
		"title" in obj
	) {
		return obj as WorkData;
	}

	// Check if it has basic work structure (Firestore format)
	if ("productId" in obj && "title" in obj) {
		// It's likely FirestoreWorkDocument format - pass it directly
		// fromFirestore expects circle to be a string
		if (typeof obj.circle === "string") {
			return fromFirestore(obj as FirestoreWorkDocument);
		}

		// If circle is not a string, fix it
		const circleObj = obj.circle as Record<string, unknown> | undefined;
		const firestoreDoc = {
			...obj,
			circle:
				typeof obj.circle === "string" ? obj.circle : (circleObj?.name as string) || "Unknown",
		};
		return fromFirestore(firestoreDoc as FirestoreWorkDocument);
	}

	return null;
}

/**
 * Converts WorkDocument to WorkPlainObject
 *
 * @deprecated Use toWorkPlainObject from transformers/legacy-transformer instead
 */
export function convertToWorkPlainObject(
	data: WorkDocumentInput | null | undefined,
): Result<WorkPlainObject, NotFoundError | DatabaseError> {
	if (!data) {
		return err({
			type: "NotFound",
			id: "unknown",
			resource: "work",
		} as NotFoundError);
	}

	const workData = convertToWorkData(data);
	if (!workData) {
		return err({
			type: "DatabaseError",
			operation: "convert",
			detail: "Failed to convert data to WorkData",
		} as DatabaseError);
	}

	const plainObject = toPlainObject(workData);
	return ok(plainObject);
}

/**
 * Converts an array of WorkDocument to WorkPlainObject array
 *
 * @deprecated Use batchToPlainObject from transformers/legacy-transformer instead
 */
export function convertToWorkPlainObjects(dataArray: unknown[]): WorkPlainObject[] {
	const results: WorkPlainObject[] = [];

	for (const data of dataArray) {
		const result = convertToWorkPlainObject(data);
		if (result.isOk()) {
			results.push(result.value);
		}
		// Skip failed conversions silently (as before)
	}

	return results;
}

/**
 * Type guard to check if an object is a WorkPlainObject
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
 */
export function normalizeToWorkPlainObject(
	data: WorkDocumentInput | null | undefined,
): WorkPlainObject | null {
	if (!data) {
		return null;
	}

	// If it's already a plain object, return it
	if (isWorkPlainObject(data)) {
		return data;
	}

	// Otherwise, convert from Firestore data
	const result = convertToWorkPlainObject(data);
	return result.isOk() ? result.value : null;
}
