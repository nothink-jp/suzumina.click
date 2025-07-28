import { describe, expect, it } from "vitest";
import type { CreatorRole } from "../../value-objects/work/creator-type";
import { CircleId } from "../circle-entity";
import { CreatorName } from "../creator-entity";
import {
	CreatorRolesInWork,
	CreatorWorkMappingEntity,
	MappingId,
} from "../creator-work-mapping-entity";

describe("MappingId", () => {
	describe("constructor", () => {
		it("should create a valid MappingId", () => {
			const id = new MappingId("12345", "RJ01234567");
			expect(id.creatorId).toBe("12345");
			expect(id.workId).toBe("RJ01234567");
			expect(id.toString()).toBe("12345_RJ01234567");
		});

		it("should throw error for empty creator ID", () => {
			expect(() => new MappingId("", "RJ01234567")).toThrow(
				"Creator ID cannot be empty in mapping",
			);
			expect(() => new MappingId("  ", "RJ01234567")).toThrow(
				"Creator ID cannot be empty in mapping",
			);
		});

		it("should throw error for invalid creator ID format", () => {
			expect(() => new MappingId("abc", "RJ01234567")).toThrow(
				"Invalid creator ID format in mapping",
			);
			expect(() => new MappingId("12a45", "RJ01234567")).toThrow(
				"Invalid creator ID format in mapping",
			);
		});

		it("should throw error for empty work ID", () => {
			expect(() => new MappingId("12345", "")).toThrow("Work ID cannot be empty in mapping");
			expect(() => new MappingId("12345", "  ")).toThrow("Work ID cannot be empty in mapping");
		});

		it("should throw error for invalid work ID format", () => {
			expect(() => new MappingId("12345", "123")).toThrow("Invalid work ID format in mapping");
			expect(() => new MappingId("12345", "RJ")).toThrow("Invalid work ID format in mapping");
			expect(() => new MappingId("12345", "rj123")).toThrow("Invalid work ID format in mapping");
		});
	});

	describe("fromString", () => {
		it("should create MappingId from valid string", () => {
			const id = MappingId.fromString("12345_RJ01234567");
			expect(id.creatorId).toBe("12345");
			expect(id.workId).toBe("RJ01234567");
		});

		it("should throw error for invalid format", () => {
			expect(() => MappingId.fromString("12345")).toThrow("Invalid mapping ID format");
			expect(() => MappingId.fromString("12345_RJ01234567_extra")).toThrow(
				"Invalid mapping ID format",
			);
		});
	});

	describe("equals", () => {
		it("should return true for same IDs", () => {
			const id1 = new MappingId("12345", "RJ01234567");
			const id2 = new MappingId("12345", "RJ01234567");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should return false for different creator IDs", () => {
			const id1 = new MappingId("12345", "RJ01234567");
			const id2 = new MappingId("67890", "RJ01234567");
			expect(id1.equals(id2)).toBe(false);
		});

		it("should return false for different work IDs", () => {
			const id1 = new MappingId("12345", "RJ01234567");
			const id2 = new MappingId("12345", "RJ07654321");
			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe("CreatorRolesInWork", () => {
	describe("constructor", () => {
		it("should create valid CreatorRolesInWork with single role", () => {
			const roles = new CreatorRolesInWork(["voice"]);
			expect(roles.toArray()).toEqual(["voice"]);
		});

		it("should create valid CreatorRolesInWork with multiple roles", () => {
			const roles = new CreatorRolesInWork(["voice", "scenario"]);
			expect(roles.toArray()).toContain("voice");
			expect(roles.toArray()).toContain("scenario");
		});

		it("should remove duplicates", () => {
			const roles = new CreatorRolesInWork(["voice", "voice", "scenario"]);
			expect(roles.toArray()).toHaveLength(2);
			expect(roles.toArray()).toContain("voice");
			expect(roles.toArray()).toContain("scenario");
		});

		it("should throw error for empty roles", () => {
			expect(() => new CreatorRolesInWork([])).toThrow(
				"Creator must have at least one role in the work",
			);
		});

		it("should throw error for invalid role", () => {
			expect(() => new CreatorRolesInWork(["invalid" as CreatorRole])).toThrow(
				"Invalid creator role in work",
			);
		});
	});

	describe("hasRole", () => {
		it("should return true if role exists", () => {
			const roles = new CreatorRolesInWork(["voice", "scenario"]);
			expect(roles.hasRole("voice")).toBe(true);
			expect(roles.hasRole("scenario")).toBe(true);
		});

		it("should return false if role does not exist", () => {
			const roles = new CreatorRolesInWork(["voice"]);
			expect(roles.hasRole("illustration")).toBe(false);
		});
	});

	describe("addRole", () => {
		it("should add a new role", () => {
			const roles = new CreatorRolesInWork(["voice"]);
			const updated = roles.addRole("scenario");
			expect(updated.toArray()).toContain("voice");
			expect(updated.toArray()).toContain("scenario");
			expect(roles.toArray()).toEqual(["voice"]); // Original unchanged
		});

		it("should not duplicate existing role", () => {
			const roles = new CreatorRolesInWork(["voice"]);
			const updated = roles.addRole("voice");
			expect(updated.toArray()).toEqual(["voice"]);
		});
	});

	describe("removeRole", () => {
		it("should remove a role", () => {
			const roles = new CreatorRolesInWork(["voice", "scenario"]);
			const updated = roles.removeRole("scenario");
			expect(updated.toArray()).toEqual(["voice"]);
			expect(roles.toArray()).toContain("scenario"); // Original unchanged
		});

		it("should throw error when removing last role", () => {
			const roles = new CreatorRolesInWork(["voice"]);
			expect(() => roles.removeRole("voice")).toThrow(
				"Cannot remove the last role from creator in work",
			);
		});
	});
});

describe("CreatorWorkMappingEntity", () => {
	const createTestMapping = () => {
		return CreatorWorkMappingEntity.create(
			"12345",
			"RJ01234567",
			"テスト声優",
			["voice"],
			"RG23954",
		);
	};

	describe("create", () => {
		it("should create a new mapping entity", () => {
			const mapping = createTestMapping();
			expect(mapping.creatorIdString).toBe("12345");
			expect(mapping.workIdString).toBe("RJ01234567");
			expect(mapping.creatorNameString).toBe("テスト声優");
			expect(mapping.rolesArray).toEqual(["voice"]);
			expect(mapping.circleIdString).toBe("RG23954");
			expect(mapping.mappingId).toBe("12345_RJ01234567");
		});

		it("should create with multiple roles", () => {
			const mapping = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"マルチクリエイター",
				["voice", "scenario"],
				"RG23954",
			);
			expect(mapping.rolesArray).toContain("voice");
			expect(mapping.rolesArray).toContain("scenario");
		});
	});

	describe("business logic", () => {
		it("should check voice actor role", () => {
			const voiceActor = createTestMapping();
			const illustrator = CreatorWorkMappingEntity.create(
				"67890",
				"RJ01234567",
				"イラストレーター",
				["illustration"],
				"RG23954",
			);

			expect(voiceActor.isVoiceActorInWork()).toBe(true);
			expect(illustrator.isVoiceActorInWork()).toBe(false);
		});

		it("should check illustrator role", () => {
			const illustrator = CreatorWorkMappingEntity.create(
				"67890",
				"RJ01234567",
				"イラストレーター",
				["illustration"],
				"RG23954",
			);

			expect(illustrator.isIllustratorInWork()).toBe(true);
			expect(createTestMapping().isIllustratorInWork()).toBe(false);
		});

		it("should check scenario writer role", () => {
			const writer = CreatorWorkMappingEntity.create(
				"11111",
				"RJ01234567",
				"シナリオライター",
				["scenario"],
				"RG23954",
			);

			expect(writer.isScenarioWriterInWork()).toBe(true);
			expect(createTestMapping().isScenarioWriterInWork()).toBe(false);
		});

		it("should check multiple roles", () => {
			const multiRole = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"マルチクリエイター",
				["voice", "scenario"],
				"RG23954",
			);
			const singleRole = createTestMapping();

			expect(multiRole.hasMultipleRoles()).toBe(true);
			expect(singleRole.hasMultipleRoles()).toBe(false);
		});

		it("should check if mapping is recent", () => {
			const newMapping = createTestMapping();
			expect(newMapping.isRecentMapping()).toBe(true);

			// Create old mapping
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 60);
			const oldMapping = new CreatorWorkMappingEntity(
				new MappingId("12345", "RJ01234567"),
				new CreatorName("古い声優"),
				new CreatorRolesInWork(["voice"]),
				new CircleId("RG23954"),
				oldDate,
			);
			expect(oldMapping.isRecentMapping()).toBe(false);
		});
	});

	describe("updates", () => {
		it("should update roles", () => {
			const mapping = createTestMapping();
			const updated = mapping.updateRoles(["voice", "scenario"]);

			expect(updated.rolesArray).toContain("voice");
			expect(updated.rolesArray).toContain("scenario");
			expect(mapping.rolesArray).toEqual(["voice"]); // Original unchanged
		});

		it("should add a role", () => {
			const mapping = createTestMapping();
			const updated = mapping.addRole("scenario");

			expect(updated.rolesArray).toContain("voice");
			expect(updated.rolesArray).toContain("scenario");
			expect(mapping.rolesArray).toEqual(["voice"]); // Original unchanged
		});

		it("should remove a role", () => {
			const mapping = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"マルチ",
				["voice", "scenario"],
				"RG23954",
			);
			const updated = mapping.removeRole("scenario");

			expect(updated.rolesArray).toEqual(["voice"]);
			expect(mapping.rolesArray).toContain("scenario"); // Original unchanged
		});

		it("should update creator name", () => {
			const mapping = createTestMapping();
			const updated = mapping.updateCreatorName("新しい名前");

			expect(updated.creatorNameString).toBe("新しい名前");
			expect(mapping.creatorNameString).toBe("テスト声優"); // Original unchanged
		});
	});

	describe("validation", () => {
		it("should validate a valid mapping", () => {
			const mapping = createTestMapping();
			expect(mapping.isValid()).toBe(true);
			expect(mapping.getValidationErrors()).toHaveLength(0);
		});

		it("should detect date validation errors", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			expect(
				() =>
					new CreatorWorkMappingEntity(
						new MappingId("12345", "RJ01234567"),
						new CreatorName("テスト"),
						new CreatorRolesInWork(["voice"]),
						new CircleId("RG23954"),
						futureDate,
					),
			).toThrow("Created date cannot be in the future");
		});
	});

	describe("serialization", () => {
		it("should convert to Firestore format", () => {
			const mapping = createTestMapping();
			const firestore = mapping.toFirestore();

			expect(firestore.creatorId).toBe("12345");
			expect(firestore.workId).toBe("RJ01234567");
			expect(firestore.creatorName).toBe("テスト声優");
			expect(firestore.types).toEqual(["voice"]);
			expect(firestore.circleId).toBe("RG23954");
			expect(firestore.createdAt).toBeInstanceOf(Date);
		});

		it("should create from Firestore data", () => {
			const firestoreData = {
				creatorId: "12345",
				workId: "RJ01234567",
				creatorName: "テスト声優",
				types: ["voice", "scenario"] as CreatorRole[],
				circleId: "RG23954",
				createdAt: new Date(),
			};

			const mapping = CreatorWorkMappingEntity.fromFirestoreData(firestoreData);
			expect(mapping.creatorIdString).toBe("12345");
			expect(mapping.workIdString).toBe("RJ01234567");
			expect(mapping.creatorNameString).toBe("テスト声優");
			expect(mapping.rolesArray).toContain("voice");
			expect(mapping.rolesArray).toContain("scenario");
			expect(mapping.circleIdString).toBe("RG23954");
		});

		it("should convert to plain object", () => {
			const mapping = createTestMapping();
			const plain = mapping.toPlainObject();

			expect(plain).toMatchObject({
				id: "12345_RJ01234567",
				mappingId: "12345_RJ01234567",
				creatorId: "12345",
				workId: "RJ01234567",
				creatorName: "テスト声優",
				roles: ["voice"],
				circleId: "RG23954",
				isVoiceActor: true,
				isIllustrator: false,
				isScenarioWriter: false,
				hasMultipleRoles: false,
				isRecent: true,
			});
			expect(plain.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});
	});

	describe("equality", () => {
		it("should be equal for same composite ID", () => {
			const mapping1 = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"声優1",
				["voice"],
				"RG11111",
			);
			const mapping2 = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"声優2",
				["scenario"],
				"RG22222",
			);
			expect(mapping1.equals(mapping2)).toBe(true);
		});

		it("should not be equal for different creator IDs", () => {
			const mapping1 = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"声優",
				["voice"],
				"RG23954",
			);
			const mapping2 = CreatorWorkMappingEntity.create(
				"67890",
				"RJ01234567",
				"声優",
				["voice"],
				"RG23954",
			);
			expect(mapping1.equals(mapping2)).toBe(false);
		});

		it("should not be equal for different work IDs", () => {
			const mapping1 = CreatorWorkMappingEntity.create(
				"12345",
				"RJ01234567",
				"声優",
				["voice"],
				"RG23954",
			);
			const mapping2 = CreatorWorkMappingEntity.create(
				"12345",
				"RJ07654321",
				"声優",
				["voice"],
				"RG23954",
			);
			expect(mapping1.equals(mapping2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create a deep copy", () => {
			const original = createTestMapping();
			const clone = original.clone();

			expect(clone.equals(original)).toBe(true);
			expect(clone).not.toBe(original);
			expect(clone.mappingId).toBe(original.mappingId);
			expect(clone.creatorNameString).toBe(original.creatorNameString);
			expect(clone.rolesArray).toEqual(original.rolesArray);
		});
	});
});
