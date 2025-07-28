/**
 * Circle Entity
 *
 * Represents a DLsite circle (maker/group) with rich domain behavior.
 * A circle is a content creator group that produces works on DLsite.
 */

import { z } from "zod";
import { BaseEntity, type EntityValidatable } from "./base/entity";
import type { CircleData } from "./circle-creator";

/**
 * Circle ID value object
 */
export class CircleId {
	private static readonly CIRCLE_ID_PATTERN = /^RG\d+$/;

	constructor(private readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error("Circle ID cannot be empty");
		}
		if (!CircleId.CIRCLE_ID_PATTERN.test(value)) {
			throw new Error(
				`Invalid circle ID format: ${value}. Expected format: RG + numbers (e.g., RG23954)`,
			);
		}
	}

	toString(): string {
		return this.value;
	}

	equals(other: CircleId): boolean {
		return other instanceof CircleId && this.value === other.value;
	}

	/**
	 * Creates a DLsite circle URL
	 */
	toUrl(): string {
		return `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${this.value}.html`;
	}
}

/**
 * Circle name value object
 */
export class CircleName {
	constructor(
		private readonly name: string,
		private readonly nameEn?: string,
	) {
		if (!name || name.trim().length === 0) {
			throw new Error("Circle name cannot be empty");
		}
	}

	/**
	 * Gets the circle name in Japanese
	 */
	get japanese(): string {
		return this.name;
	}

	/**
	 * Gets the circle name in English
	 */
	get english(): string | undefined {
		return this.nameEn;
	}

	/**
	 * Gets display name (prefers English if available based on locale)
	 */
	toDisplayString(locale: "ja" | "en" = "ja"): string {
		if (locale === "en" && this.nameEn) {
			return this.nameEn;
		}
		return this.name;
	}

	/**
	 * Gets searchable text containing all name variations
	 */
	getSearchableText(): string {
		const parts = [this.name];
		if (this.nameEn) parts.push(this.nameEn);
		return parts.join(" ");
	}

	equals(other: CircleName): boolean {
		return other instanceof CircleName && this.name === other.name && this.nameEn === other.nameEn;
	}
}

/**
 * Circle work count value object
 */
export class WorkCount {
	constructor(private readonly count: number) {
		if (!Number.isInteger(count) || count < 0) {
			throw new Error("Work count must be a non-negative integer");
		}
	}

	toNumber(): number {
		return this.count;
	}

	increment(): WorkCount {
		return new WorkCount(this.count + 1);
	}

	decrement(): WorkCount {
		if (this.count === 0) {
			throw new Error("Cannot decrement work count below 0");
		}
		return new WorkCount(this.count - 1);
	}

	equals(other: WorkCount): boolean {
		return other instanceof WorkCount && this.count === other.count;
	}
}

/**
 * Circle Entity
 *
 * The root entity for circle domain model.
 * Aggregates circle information and provides business logic.
 */
export class CircleEntity
	extends BaseEntity<CircleEntity>
	implements EntityValidatable<CircleEntity>
{
	constructor(
		private readonly _id: CircleId,
		private readonly _name: CircleName,
		private readonly _workCount: WorkCount,
		private readonly _createdAt: Date,
		private readonly _lastUpdated: Date,
	) {
		super();

		// Validate dates
		if (_createdAt > _lastUpdated) {
			throw new Error("Created date cannot be after last updated date");
		}
		if (_createdAt > new Date()) {
			throw new Error("Created date cannot be in the future");
		}
	}

	// Getters for accessing value objects
	get id(): CircleId {
		return this._id;
	}

	get name(): CircleName {
		return this._name;
	}

	get workCount(): WorkCount {
		return this._workCount;
	}

	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	get lastUpdated(): Date {
		return new Date(this._lastUpdated);
	}

	// Convenience getters for common access patterns
	get circleId(): string {
		return this._id.toString();
	}

	get circleName(): string {
		return this._name.japanese;
	}

	get circleNameEn(): string | undefined {
		return this._name.english;
	}

	get workCountNumber(): number {
		return this._workCount.toNumber();
	}

	/**
	 * Gets the DLsite URL for this circle
	 */
	get url(): string {
		return this._id.toUrl();
	}

	// Business logic methods

	/**
	 * Checks if the circle has any works
	 */
	hasWorks(): boolean {
		return this._workCount.toNumber() > 0;
	}

	/**
	 * Checks if the circle is new (created within the last 30 days)
	 */
	isNewCircle(): boolean {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return this._createdAt > thirtyDaysAgo;
	}

	/**
	 * Checks if the circle is active (updated within the last 90 days)
	 */
	isActive(): boolean {
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
		return this._lastUpdated > ninetyDaysAgo;
	}

	/**
	 * Updates the work count
	 */
	updateWorkCount(newCount: number): CircleEntity {
		return new CircleEntity(
			this._id,
			this._name,
			new WorkCount(newCount),
			this._createdAt,
			new Date(),
		);
	}

	/**
	 * Increments the work count
	 */
	incrementWorkCount(): CircleEntity {
		return new CircleEntity(
			this._id,
			this._name,
			this._workCount.increment(),
			this._createdAt,
			new Date(),
		);
	}

	/**
	 * Updates the circle name
	 */
	updateName(name: string, nameEn?: string): CircleEntity {
		return new CircleEntity(
			this._id,
			new CircleName(name, nameEn),
			this._workCount,
			this._createdAt,
			new Date(),
		);
	}

	// Entity interface implementations

	/**
	 * Validates the entity
	 */
	isValid(): boolean {
		return this.getValidationErrors().length === 0;
	}

	/**
	 * Gets validation errors
	 */
	getValidationErrors(): string[] {
		const errors: string[] = [];

		// ID validation
		if (!this._id.toString().match(/^RG\d+$/)) {
			errors.push("Invalid circle ID format");
		}

		// Name validation
		if (!this._name.japanese || this._name.japanese.trim().length === 0) {
			errors.push("Circle name cannot be empty");
		}

		// Work count validation
		if (this._workCount.toNumber() < 0) {
			errors.push("Work count cannot be negative");
		}

		// Date validation
		if (this._createdAt > this._lastUpdated) {
			errors.push("Created date cannot be after last updated date");
		}
		if (this._createdAt > new Date()) {
			errors.push("Created date cannot be in the future");
		}

		return errors;
	}

	/**
	 * Creates a deep copy of the entity
	 */
	clone(): CircleEntity {
		return new CircleEntity(
			this._id,
			this._name,
			this._workCount,
			new Date(this._createdAt),
			new Date(this._lastUpdated),
		);
	}

	/**
	 * Checks equality based on circle ID
	 */
	equals(other: CircleEntity): boolean {
		if (!other || !(other instanceof CircleEntity)) {
			return false;
		}
		return this._id.equals(other._id);
	}

	// Factory methods

	/**
	 * Creates a new circle entity
	 */
	static create(circleId: string, name: string, nameEn?: string, workCount = 0): CircleEntity {
		return new CircleEntity(
			new CircleId(circleId),
			new CircleName(name, nameEn),
			new WorkCount(workCount),
			new Date(),
			new Date(),
		);
	}

	/**
	 * Creates a circle entity from Firestore data
	 */
	static fromFirestoreData(data: CircleData): CircleEntity {
		// Convert Firestore timestamp to Date
		const convertTimestamp = (timestamp: unknown): Date => {
			if (timestamp instanceof Date) return timestamp;
			if (
				timestamp &&
				typeof timestamp === "object" &&
				"toDate" in timestamp &&
				typeof timestamp.toDate === "function"
			) {
				return timestamp.toDate();
			}
			if (
				timestamp &&
				typeof timestamp === "object" &&
				"_seconds" in timestamp &&
				typeof timestamp._seconds === "number"
			) {
				return new Date(timestamp._seconds * 1000);
			}
			return new Date();
		};

		return new CircleEntity(
			new CircleId(data.circleId),
			new CircleName(data.name, data.nameEn),
			new WorkCount(data.workCount || 0),
			convertTimestamp(data.createdAt),
			convertTimestamp(data.lastUpdated),
		);
	}

	/**
	 * Converts to Firestore format
	 */
	toFirestore(): CircleData {
		return {
			circleId: this._id.toString(),
			name: this._name.japanese,
			nameEn: this._name.english,
			workCount: this._workCount.toNumber(),
			createdAt: this._createdAt,
			lastUpdated: this._lastUpdated,
		};
	}

	/**
	 * Converts to plain object for serialization
	 */
	toPlainObject(): {
		id: string;
		circleId: string;
		name: string;
		nameEn?: string;
		workCount: number;
		url: string;
		isNew: boolean;
		isActive: boolean;
		hasWorks: boolean;
		createdAt: string;
		lastUpdated: string;
	} {
		return {
			id: this.circleId,
			circleId: this.circleId,
			name: this.circleName,
			nameEn: this.circleNameEn,
			workCount: this.workCountNumber,
			url: this.url,
			isNew: this.isNewCircle(),
			isActive: this.isActive(),
			hasWorks: this.hasWorks(),
			createdAt: this._createdAt.toISOString(),
			lastUpdated: this._lastUpdated.toISOString(),
		};
	}
}

// Export schema for validation
export const CircleEntitySchema = z
	.object({
		circleId: z.string().regex(/^RG\d+$/),
		name: z.string().min(1),
		nameEn: z.string().optional(),
		workCount: z.number().int().nonnegative(),
		createdAt: z.date(),
		lastUpdated: z.date(),
	})
	.refine((data) => data.createdAt <= data.lastUpdated, {
		message: "Created date cannot be after last updated date",
	})
	.refine((data) => data.createdAt <= new Date(), {
		message: "Created date cannot be in the future",
	});
