/**
 * Firestore Transformers (Simplified for Phase 1)
 *
 * Temporary implementation for compatibility.
 * Full implementation will be added in Phase 1 Week 3.
 */

import type { WorkDocument } from "../entities/work/work-document-schema";
import type { WorkPlainObject } from "../plain-objects/work-plain";

/**
 * Transforms Firestore document to WorkPlainObject
 * @deprecated Temporary simplified implementation
 */
export function fromFirestore(doc: WorkDocument): WorkPlainObject {
	// Temporary: Use existing conversion utilities
	// This will be replaced with proper implementation in Week 3
	const { convertToWorkPlainObject } = require("../utilities/work-conversions");
	const result = convertToWorkPlainObject(doc as unknown);
	if (result.isOk()) {
		return result.value;
	}
	throw new Error(`Failed to convert work document: ${doc.id || doc.productId}`);
}

/**
 * Transforms WorkPlainObject to Firestore document format
 * @deprecated Temporary simplified implementation
 */
export function toFirestore(work: WorkPlainObject): Partial<WorkDocument> {
	// Temporary: Return as-is with type assertion
	// This will be replaced with proper implementation in Week 3
	return work as unknown as Partial<WorkDocument>;
}

/**
 * Firestore transformers namespace
 */
export const workTransformers = {
	fromFirestore,
	toFirestore,
};
