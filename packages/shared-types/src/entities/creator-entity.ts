/**
 * Creator Entity
 *
 * Represents a DLsite creator (voice actor, illustrator, scenario writer, etc.)
 * A creator can have multiple roles and work on multiple works.
 */

import { z } from "zod";
import type { CreatorPlainObject } from "../plain-objects/creator-plain";
import {
	CREATOR_ROLE_LABELS,
	CREATOR_ROLE_PRIORITY,
	CreatorRole,
} from "../value-objects/work/creator-type";
import { BaseEntity, type EntityValidatable } from "./base/entity";

/**
 * Creator ID value object
 */
export class CreatorId {
	constructor(private readonly value: string) {
		if (!value || value.trim().length === 0) {
			throw new Error("Creator ID cannot be empty");
		}
		// DLsite API uses numeric IDs for creators
		if (!/^\d+$/.test(value)) {
			throw new Error(`Invalid creator ID format: ${value}. Expected numeric ID`);
		}
	}

	toString(): string {
		return this.value;
	}

	equals(other: CreatorId): boolean {
		return other instanceof CreatorId && this.value === other.value;
	}
}

/**
 * Creator name value object
 */
export class CreatorName {
	constructor(private readonly name: string) {
		if (!name || name.trim().length === 0) {
			throw new Error("Creator name cannot be empty");
		}
	}

	toString(): string {
		return this.name;
	}

	/**
	 * Gets searchable text for the creator name
	 */
	getSearchableText(): string {
		return this.name;
	}

	equals(other: CreatorName): boolean {
		return other instanceof CreatorName && this.name === other.name;
	}
}

/**
 * Creator roles value object
 * A creator can have multiple roles
 */
export class CreatorRoles {
	private readonly roles: Set<CreatorRole>;

	constructor(roles: CreatorRole[]) {
		if (!roles || roles.length === 0) {
			throw new Error("Creator must have at least one role");
		}

		// Validate all roles
		roles.forEach((role) => {
			if (!Object.values(CreatorRole.enum).includes(role)) {
				throw new Error(`Invalid creator role: ${role}`);
			}
		});

		this.roles = new Set(roles);
	}

	/**
	 * Gets all roles as an array
	 */
	toArray(): CreatorRole[] {
		return Array.from(this.roles).sort(
			(a, b) => CREATOR_ROLE_PRIORITY[a] - CREATOR_ROLE_PRIORITY[b],
		);
	}

	/**
	 * Checks if creator has a specific role
	 */
	hasRole(role: CreatorRole): boolean {
		return this.roles.has(role);
	}

	/**
	 * Adds a new role
	 */
	addRole(role: CreatorRole): CreatorRoles {
		const newRoles = new Set(this.roles);
		newRoles.add(role);
		return new CreatorRoles(Array.from(newRoles));
	}

	/**
	 * Removes a role (must have at least one role remaining)
	 */
	removeRole(role: CreatorRole): CreatorRoles {
		if (this.roles.size === 1 && this.roles.has(role)) {
			throw new Error("Cannot remove the last role from creator");
		}
		const newRoles = new Set(this.roles);
		newRoles.delete(role);
		return new CreatorRoles(Array.from(newRoles));
	}

	/**
	 * Gets display label for roles
	 */
	toDisplayString(): string {
		const roles = this.toArray();
		return roles.map((role) => CREATOR_ROLE_LABELS[role]).join(" / ");
	}

	/**
	 * Gets the primary (first) role
	 */
	getPrimaryRole(): CreatorRole {
		const roles = this.toArray();
		if (roles.length === 0) {
			throw new Error("No roles available");
		}
		return roles[0] as CreatorRole;
	}

	equals(other: CreatorRoles): boolean {
		if (!(other instanceof CreatorRoles)) return false;
		const thisRoles = this.toArray();
		const otherRoles = other.toArray();
		return (
			thisRoles.length === otherRoles.length && thisRoles.every((role, i) => role === otherRoles[i])
		);
	}
}

/**
 * Creator Entity
 *
 * The root entity for creator domain model.
 * Aggregates creator information and provides business logic.
 */
export class CreatorEntity
	extends BaseEntity<CreatorEntity>
	implements EntityValidatable<CreatorEntity>
{
	constructor(
		private readonly _id: CreatorId,
		private readonly _name: CreatorName,
		private readonly _roles: CreatorRoles,
		private readonly _workCount: number,
		private readonly _createdAt: Date,
		private readonly _lastUpdated: Date,
	) {
		super();

		// Validate work count
		if (!Number.isInteger(_workCount) || _workCount < 0) {
			throw new Error("Work count must be a non-negative integer");
		}

		// Validate dates
		if (_createdAt > _lastUpdated) {
			throw new Error("Created date cannot be after last updated date");
		}
		if (_createdAt > new Date()) {
			throw new Error("Created date cannot be in the future");
		}
	}

	// Getters for accessing value objects
	get id(): CreatorId {
		return this._id;
	}

	get name(): CreatorName {
		return this._name;
	}

	get roles(): CreatorRoles {
		return this._roles;
	}

	get workCount(): number {
		return this._workCount;
	}

	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	get lastUpdated(): Date {
		return new Date(this._lastUpdated);
	}

	// Convenience getters
	get creatorId(): string {
		return this._id.toString();
	}

	get creatorName(): string {
		return this._name.toString();
	}

	get creatorRoles(): CreatorRole[] {
		return this._roles.toArray();
	}

	// Business logic methods

	/**
	 * Checks if the creator has any works
	 */
	hasWorks(): boolean {
		return this._workCount > 0;
	}

	/**
	 * Checks if the creator is new (created within the last 30 days)
	 */
	isNewCreator(): boolean {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return this._createdAt > thirtyDaysAgo;
	}

	/**
	 * Checks if the creator is active (updated within the last 90 days)
	 */
	isActive(): boolean {
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
		return this._lastUpdated > ninetyDaysAgo;
	}

	/**
	 * Checks if creator has a specific role
	 */
	hasRole(role: CreatorRole): boolean {
		return this._roles.hasRole(role);
	}

	/**
	 * Checks if creator is primarily a voice actor
	 */
	isVoiceActor(): boolean {
		return this._roles.getPrimaryRole() === "voice";
	}

	/**
	 * Updates the work count
	 */
	updateWorkCount(newCount: number): CreatorEntity {
		return new CreatorEntity(
			this._id,
			this._name,
			this._roles,
			newCount,
			this._createdAt,
			new Date(),
		);
	}

	/**
	 * Increments the work count
	 */
	incrementWorkCount(): CreatorEntity {
		return this.updateWorkCount(this._workCount + 1);
	}

	/**
	 * Decrements the work count
	 */
	decrementWorkCount(): CreatorEntity {
		if (this._workCount === 0) {
			throw new Error("Cannot decrement work count below 0");
		}
		return this.updateWorkCount(this._workCount - 1);
	}

	/**
	 * Updates the creator name
	 */
	updateName(name: string): CreatorEntity {
		return new CreatorEntity(
			this._id,
			new CreatorName(name),
			this._roles,
			this._workCount,
			this._createdAt,
			new Date(),
		);
	}

	/**
	 * Adds a new role to the creator
	 */
	addRole(role: CreatorRole): CreatorEntity {
		return new CreatorEntity(
			this._id,
			this._name,
			this._roles.addRole(role),
			this._workCount,
			this._createdAt,
			new Date(),
		);
	}

	/**
	 * Removes a role from the creator
	 */
	removeRole(role: CreatorRole): CreatorEntity {
		return new CreatorEntity(
			this._id,
			this._name,
			this._roles.removeRole(role),
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
		if (!this._id.toString().match(/^\d+$/)) {
			errors.push("Invalid creator ID format");
		}

		// Name validation
		if (!this._name.toString() || this._name.toString().trim().length === 0) {
			errors.push("Creator name cannot be empty");
		}

		// Roles validation
		if (this._roles.toArray().length === 0) {
			errors.push("Creator must have at least one role");
		}

		// Work count validation
		if (this._workCount < 0) {
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
	clone(): CreatorEntity {
		return new CreatorEntity(
			this._id,
			this._name,
			this._roles,
			this._workCount,
			new Date(this._createdAt),
			new Date(this._lastUpdated),
		);
	}

	/**
	 * Checks equality based on creator ID
	 */
	equals(other: CreatorEntity): boolean {
		if (!other || !(other instanceof CreatorEntity)) {
			return false;
		}
		return this._id.equals(other._id);
	}

	// Factory methods

	/**
	 * Creates a new creator entity
	 */
	static create(
		creatorId: string,
		name: string,
		roles: CreatorRole[],
		workCount = 0,
	): CreatorEntity {
		return new CreatorEntity(
			new CreatorId(creatorId),
			new CreatorName(name),
			new CreatorRoles(roles),
			workCount,
			new Date(),
			new Date(),
		);
	}

	/**
	 * Creates a creator entity from Firestore data
	 */
	static fromFirestoreData(data: {
		creatorId: string;
		creatorName: string;
		types: CreatorRole[];
		workCount?: number;
		createdAt: unknown;
		lastUpdated?: unknown;
	}): CreatorEntity {
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

		return new CreatorEntity(
			new CreatorId(data.creatorId),
			new CreatorName(data.creatorName),
			new CreatorRoles(data.types),
			data.workCount ?? 0,
			convertTimestamp(data.createdAt),
			convertTimestamp(data.lastUpdated ?? data.createdAt),
		);
	}

	/**
	 * Converts to Firestore format
	 */
	toFirestore(): {
		creatorId: string;
		creatorName: string;
		types: CreatorRole[];
		workCount: number;
		createdAt: Date;
		lastUpdated: Date;
	} {
		return {
			creatorId: this._id.toString(),
			creatorName: this._name.toString(),
			types: this._roles.toArray(),
			workCount: this._workCount,
			createdAt: this._createdAt,
			lastUpdated: this._lastUpdated,
		};
	}

	/**
	 * Converts to plain object for serialization
	 */
	toPlainObject(): CreatorPlainObject {
		return {
			id: this.creatorId,
			creatorId: this.creatorId,
			name: this.creatorName,
			types: this.creatorRoles,
			workCount: this.workCount,
			registeredAt: this._createdAt.toISOString(),
			lastUpdated: this._lastUpdated.toISOString(),
		};
	}
}

// Export schema for validation
export const CreatorEntitySchema = z
	.object({
		creatorId: z.string().regex(/^\d+$/),
		creatorName: z.string().min(1),
		types: z.array(CreatorRole).min(1),
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
