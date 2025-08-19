/**
 * Work Entity Compatibility Layer
 *
 * Provides backward compatibility during migration from Entity to functional pattern.
 * This file will be deleted after complete migration (Phase 1 Week 3).
 *
 * @deprecated Use functions from operations, validators, and transformers directly
 */

import type { DatabaseError, Result } from "../core/result";
import { databaseError, err, ok } from "../core/result";
import type { WorkDocument } from "../entities/work/work-document-schema";
import { workOperations } from "../operations/work";
import type { WorkPlainObject } from "../plain-objects/work-plain";
import { workTransformers } from "../transformers/firestore";
import { workValidators } from "../validators/work";

/**
 * Work Entity compatibility wrapper
 * @deprecated Use functional APIs directly
 */
export class Work {
	private data: WorkPlainObject;

	private constructor(data: WorkPlainObject) {
		console.warn(
			"Work Entity is deprecated. Use workOperations, workValidators, and workTransformers instead.",
		);
		this.data = data;
	}

	/**
	 * @deprecated Use workTransformers.fromFirestore()
	 */
	static fromFirestoreData(doc: WorkDocument): Result<Work, DatabaseError> {
		try {
			const plainObject = workTransformers.fromFirestore(doc);
			return ok(new Work(plainObject));
		} catch (error) {
			return err(
				databaseError(
					`Failed to create Work from Firestore data: ${error instanceof Error ? error.message : String(error)}`,
					"CREATION_FAILED",
				),
			);
		}
	}

	/**
	 * @deprecated Use workTransformers.fromFirestore() directly
	 */
	static fromPlainObject(plain: WorkPlainObject): Work {
		return new Work(plain);
	}

	/**
	 * @deprecated Already using PlainObject
	 */
	toPlainObject(): WorkPlainObject {
		return this.data;
	}

	// Getters for compatibility
	get id(): string {
		return this.data.id;
	}
	get productId(): string {
		return this.data.productId;
	}
	get title(): string {
		return this.data.title;
	}
	get circle(): string {
		return this.data.circle;
	}
	get circleId(): string | undefined {
		return this.data.circleId;
	}
	get description(): string {
		return this.data.description;
	}
	get category(): string {
		return this.data.category;
	}
	get price() {
		return this.data.price;
	}
	get rating() {
		return this.data.rating;
	}
	get creators() {
		return this.data.creators;
	}
	get salesStatus() {
		return this.data.salesStatus;
	}
	get genres(): string[] {
		return this.data.genres;
	}
	get customGenres(): string[] {
		return this.data.customGenres;
	}

	// Business methods - delegate to operations
	/**
	 * @deprecated Use workValidators.isValid()
	 */
	isValid(): boolean {
		return workValidators.isValid(this.data);
	}

	/**
	 * @deprecated Use workValidators.getValidationErrors()
	 */
	getValidationErrors(): string[] {
		return workValidators.getValidationErrors(this.data);
	}

	/**
	 * @deprecated Use workOperations.isAdultContent()
	 */
	isAdultContent(): boolean {
		return workOperations.isAdultContent(this.data);
	}

	/**
	 * @deprecated Use workOperations.isVoiceWork()
	 */
	isVoiceWork(): boolean {
		return workOperations.isVoiceWork(this.data);
	}

	/**
	 * @deprecated Use workOperations.isGameWork()
	 */
	isGameWork(): boolean {
		return workOperations.isGameWork(this.data);
	}

	/**
	 * @deprecated Use workOperations.isMangaWork()
	 */
	isMangaWork(): boolean {
		return workOperations.isMangaWork(this.data);
	}

	/**
	 * @deprecated Use workOperations.isNewRelease()
	 */
	isNewRelease(): boolean {
		return workOperations.isNewRelease(this.data);
	}

	/**
	 * @deprecated Use workOperations.isPopular()
	 */
	isPopular(): boolean {
		return workOperations.isPopular(this.data);
	}

	/**
	 * @deprecated Use workOperations.getSearchableText()
	 */
	getSearchableText(): string {
		return workOperations.getSearchableText(this.data);
	}

	/**
	 * @deprecated Use workOperations.getAllTags()
	 */
	getAllTags(): string[] {
		return workOperations.getAllTags(this.data);
	}

	/**
	 * Equality check
	 * @deprecated Compare PlainObjects directly
	 */
	equals(other: Work): boolean {
		return this.data.id === other.data.id && this.data.productId === other.data.productId;
	}

	/**
	 * Clone
	 * @deprecated Use object spread: { ...work }
	 */
	clone(): Work {
		return new Work({ ...this.data });
	}
}

/**
 * Re-export as namespace for easier migration
 */
export const WorkEntity = {
	fromFirestoreData: Work.fromFirestoreData,
	fromPlainObject: Work.fromPlainObject,
	// Add static methods that might be used
	isValidWorkId: (id: string) => workValidators.validateWorkId(id).isValid,
	isValidTitle: (title: string) => workValidators.validateWorkTitle(title).isValid,
};
