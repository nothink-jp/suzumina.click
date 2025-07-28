/**
 * CreatorWorkMapping Entity
 *
 * Represents the relationship between a creator and a work on DLsite.
 * This entity manages the many-to-many relationship between creators and works,
 * including the roles a creator has in a specific work.
 */

import { z } from "zod";
import { CreatorRole } from "../value-objects/work/creator-type";
import { WorkId } from "../value-objects/work/work-id";
import { BaseEntity, type EntityValidatable } from "./base/entity";
import { CircleId } from "./circle-entity";
import { CreatorId, CreatorName } from "./creator-entity";

/**
 * Mapping ID value object
 * Composite ID consisting of creator ID and work ID
 */
export class MappingId {
	private readonly _creatorId: string;
	private readonly _workId: string;

	constructor(creatorId: string, workId: string) {
		// Validate creator ID
		if (!creatorId || creatorId.trim().length === 0) {
			throw new Error("Creator ID cannot be empty in mapping");
		}
		if (!/^\d+$/.test(creatorId)) {
			throw new Error(`Invalid creator ID format in mapping: ${creatorId}`);
		}

		// Validate work ID
		if (!workId || workId.trim().length === 0) {
			throw new Error("Work ID cannot be empty in mapping");
		}
		if (!/^RJ\d+$/.test(workId)) {
			throw new Error(`Invalid work ID format in mapping: ${workId}`);
		}

		this._creatorId = creatorId;
		this._workId = workId;
	}

	/**
	 * Creates a composite ID string
	 */
	toString(): string {
		return `${this._creatorId}_${this._workId}`;
	}

	/**
	 * Gets the creator ID part
	 */
	get creatorId(): string {
		return this._creatorId;
	}

	/**
	 * Gets the work ID part
	 */
	get workId(): string {
		return this._workId;
	}

	equals(other: MappingId): boolean {
		return (
			other instanceof MappingId &&
			this._creatorId === other._creatorId &&
			this._workId === other._workId
		);
	}

	/**
	 * Creates a MappingId from a composite string
	 */
	static fromString(compositeId: string): MappingId {
		const parts = compositeId.split("_");
		if (parts.length !== 2 || !parts[0] || !parts[1]) {
			throw new Error(`Invalid mapping ID format: ${compositeId}`);
		}
		return new MappingId(parts[0], parts[1]);
	}
}

/**
 * Creator roles in work value object
 * Represents the specific roles a creator has in a particular work
 */
export class CreatorRolesInWork {
	private readonly roles: Set<CreatorRole>;

	constructor(roles: CreatorRole[]) {
		if (!roles || roles.length === 0) {
			throw new Error("Creator must have at least one role in the work");
		}

		// Validate all roles
		roles.forEach((role) => {
			if (!Object.values(CreatorRole.enum).includes(role)) {
				throw new Error(`Invalid creator role in work: ${role}`);
			}
		});

		this.roles = new Set(roles);
	}

	/**
	 * Gets all roles as an array
	 */
	toArray(): CreatorRole[] {
		return Array.from(this.roles);
	}

	/**
	 * Checks if creator has a specific role in this work
	 */
	hasRole(role: CreatorRole): boolean {
		return this.roles.has(role);
	}

	/**
	 * Adds a role to the work
	 */
	addRole(role: CreatorRole): CreatorRolesInWork {
		const newRoles = new Set(this.roles);
		newRoles.add(role);
		return new CreatorRolesInWork(Array.from(newRoles));
	}

	/**
	 * Removes a role from the work (must have at least one remaining)
	 */
	removeRole(role: CreatorRole): CreatorRolesInWork {
		if (this.roles.size === 1 && this.roles.has(role)) {
			throw new Error("Cannot remove the last role from creator in work");
		}
		const newRoles = new Set(this.roles);
		newRoles.delete(role);
		return new CreatorRolesInWork(Array.from(newRoles));
	}

	equals(other: CreatorRolesInWork): boolean {
		if (!(other instanceof CreatorRolesInWork)) return false;
		const thisRoles = this.toArray().sort();
		const otherRoles = other.toArray().sort();
		return (
			thisRoles.length === otherRoles.length && thisRoles.every((role, i) => role === otherRoles[i])
		);
	}
}

/**
 * CreatorWorkMapping Entity
 *
 * The root entity for creator-work relationship domain model.
 * Manages the many-to-many relationship between creators and works.
 */
export class CreatorWorkMappingEntity
	extends BaseEntity<CreatorWorkMappingEntity>
	implements EntityValidatable<CreatorWorkMappingEntity>
{
	constructor(
		private readonly _id: MappingId,
		private readonly _creatorName: CreatorName,
		private readonly _roles: CreatorRolesInWork,
		private readonly _circleId: CircleId,
		private readonly _createdAt: Date,
	) {
		super();

		// Validate dates
		if (_createdAt > new Date()) {
			throw new Error("Created date cannot be in the future");
		}
	}

	// Getters for accessing value objects
	get id(): MappingId {
		return this._id;
	}

	get creatorId(): CreatorId {
		return new CreatorId(this._id.creatorId);
	}

	get workId(): WorkId {
		return new WorkId(this._id.workId);
	}

	get creatorName(): CreatorName {
		return this._creatorName;
	}

	get roles(): CreatorRolesInWork {
		return this._roles;
	}

	get circleId(): CircleId {
		return this._circleId;
	}

	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	// Convenience getters
	get mappingId(): string {
		return this._id.toString();
	}

	get creatorIdString(): string {
		return this._id.creatorId;
	}

	get workIdString(): string {
		return this._id.workId;
	}

	get creatorNameString(): string {
		return this._creatorName.toString();
	}

	get circleIdString(): string {
		return this._circleId.toString();
	}

	get rolesArray(): CreatorRole[] {
		return this._roles.toArray();
	}

	// Business logic methods

	/**
	 * Checks if creator is a voice actor in this work
	 */
	isVoiceActorInWork(): boolean {
		return this._roles.hasRole("voice");
	}

	/**
	 * Checks if creator is an illustrator in this work
	 */
	isIllustratorInWork(): boolean {
		return this._roles.hasRole("illustration");
	}

	/**
	 * Checks if creator is a scenario writer in this work
	 */
	isScenarioWriterInWork(): boolean {
		return this._roles.hasRole("scenario");
	}

	/**
	 * Checks if creator has multiple roles in this work
	 */
	hasMultipleRoles(): boolean {
		return this._roles.toArray().length > 1;
	}

	/**
	 * Checks if the mapping is recent (created within the last 30 days)
	 */
	isRecentMapping(): boolean {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return this._createdAt > thirtyDaysAgo;
	}

	/**
	 * Updates the creator's roles in this work
	 */
	updateRoles(roles: CreatorRole[]): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			this._id,
			this._creatorName,
			new CreatorRolesInWork(roles),
			this._circleId,
			this._createdAt,
		);
	}

	/**
	 * Adds a role to the creator in this work
	 */
	addRole(role: CreatorRole): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			this._id,
			this._creatorName,
			this._roles.addRole(role),
			this._circleId,
			this._createdAt,
		);
	}

	/**
	 * Removes a role from the creator in this work
	 */
	removeRole(role: CreatorRole): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			this._id,
			this._creatorName,
			this._roles.removeRole(role),
			this._circleId,
			this._createdAt,
		);
	}

	/**
	 * Updates the creator name (in case of corrections)
	 */
	updateCreatorName(name: string): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			this._id,
			new CreatorName(name),
			this._roles,
			this._circleId,
			this._createdAt,
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
		try {
			new CreatorId(this._id.creatorId);
		} catch {
			errors.push("Invalid creator ID in mapping");
		}

		try {
			new WorkId(this._id.workId);
		} catch {
			errors.push("Invalid work ID in mapping");
		}

		// Name validation
		if (!this._creatorName.toString() || this._creatorName.toString().trim().length === 0) {
			errors.push("Creator name cannot be empty");
		}

		// Roles validation
		if (this._roles.toArray().length === 0) {
			errors.push("Creator must have at least one role in work");
		}

		// Circle ID validation
		if (!this._circleId.toString().match(/^RG\d+$/)) {
			errors.push("Invalid circle ID format in mapping");
		}

		// Date validation
		if (this._createdAt > new Date()) {
			errors.push("Created date cannot be in the future");
		}

		return errors;
	}

	/**
	 * Creates a deep copy of the entity
	 */
	clone(): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			this._id,
			this._creatorName,
			this._roles,
			this._circleId,
			new Date(this._createdAt),
		);
	}

	/**
	 * Checks equality based on composite ID
	 */
	equals(other: CreatorWorkMappingEntity): boolean {
		if (!other || !(other instanceof CreatorWorkMappingEntity)) {
			return false;
		}
		return this._id.equals(other._id);
	}

	// Factory methods

	/**
	 * Creates a new creator-work mapping
	 */
	static create(
		creatorId: string,
		workId: string,
		creatorName: string,
		roles: CreatorRole[],
		circleId: string,
	): CreatorWorkMappingEntity {
		return new CreatorWorkMappingEntity(
			new MappingId(creatorId, workId),
			new CreatorName(creatorName),
			new CreatorRolesInWork(roles),
			new CircleId(circleId),
			new Date(),
		);
	}

	/**
	 * Creates a mapping from Firestore data
	 */
	static fromFirestoreData(data: {
		creatorId: string;
		workId: string;
		creatorName: string;
		types: CreatorRole[];
		circleId: string;
		createdAt: unknown;
	}): CreatorWorkMappingEntity {
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

		return new CreatorWorkMappingEntity(
			new MappingId(data.creatorId, data.workId),
			new CreatorName(data.creatorName),
			new CreatorRolesInWork(data.types),
			new CircleId(data.circleId),
			convertTimestamp(data.createdAt),
		);
	}

	/**
	 * Converts to Firestore format
	 */
	toFirestore(): {
		creatorId: string;
		workId: string;
		creatorName: string;
		types: CreatorRole[];
		circleId: string;
		createdAt: Date;
	} {
		return {
			creatorId: this._id.creatorId,
			workId: this._id.workId,
			creatorName: this._creatorName.toString(),
			types: this._roles.toArray(),
			circleId: this._circleId.toString(),
			createdAt: this._createdAt,
		};
	}

	/**
	 * Converts to plain object for serialization
	 */
	toPlainObject(): {
		id: string;
		mappingId: string;
		creatorId: string;
		workId: string;
		creatorName: string;
		roles: CreatorRole[];
		circleId: string;
		isVoiceActor: boolean;
		isIllustrator: boolean;
		isScenarioWriter: boolean;
		hasMultipleRoles: boolean;
		isRecent: boolean;
		createdAt: string;
	} {
		return {
			id: this.mappingId,
			mappingId: this.mappingId,
			creatorId: this.creatorIdString,
			workId: this.workIdString,
			creatorName: this.creatorNameString,
			roles: this.rolesArray,
			circleId: this.circleIdString,
			isVoiceActor: this.isVoiceActorInWork(),
			isIllustrator: this.isIllustratorInWork(),
			isScenarioWriter: this.isScenarioWriterInWork(),
			hasMultipleRoles: this.hasMultipleRoles(),
			isRecent: this.isRecentMapping(),
			createdAt: this._createdAt.toISOString(),
		};
	}
}

// Export schema for validation
export const CreatorWorkMappingEntitySchema = z
	.object({
		creatorId: z.string().regex(/^\d+$/),
		workId: z.string().regex(/^RJ\d+$/),
		creatorName: z.string().min(1),
		types: z.array(CreatorRole).min(1),
		circleId: z.string().regex(/^RG\d+$/),
		createdAt: z.date(),
	})
	.refine((data) => data.createdAt <= new Date(), {
		message: "Created date cannot be in the future",
	});
