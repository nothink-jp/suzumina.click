import { describe, expect, it } from "vitest";
import type { CreatorRole } from "../../value-objects/work/creator-type";
import { CreatorEntity, CreatorId, CreatorName, CreatorRoles } from "../creator-entity";

describe("CreatorId", () => {
	describe("constructor", () => {
		it("should create a valid CreatorId", () => {
			const id = new CreatorId("12345");
			expect(id.toString()).toBe("12345");
		});

		it("should throw error for empty ID", () => {
			expect(() => new CreatorId("")).toThrow("Creator ID cannot be empty");
			expect(() => new CreatorId("  ")).toThrow("Creator ID cannot be empty");
		});

		it("should throw error for non-numeric ID", () => {
			expect(() => new CreatorId("abc")).toThrow("Invalid creator ID format");
			expect(() => new CreatorId("123abc")).toThrow("Invalid creator ID format");
			expect(() => new CreatorId("RG123")).toThrow("Invalid creator ID format");
		});
	});

	describe("equals", () => {
		it("should return true for same IDs", () => {
			const id1 = new CreatorId("12345");
			const id2 = new CreatorId("12345");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const id1 = new CreatorId("12345");
			const id2 = new CreatorId("67890");
			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe("CreatorName", () => {
	describe("constructor", () => {
		it("should create a valid CreatorName", () => {
			const name = new CreatorName("田中太郎");
			expect(name.toString()).toBe("田中太郎");
		});

		it("should throw error for empty name", () => {
			expect(() => new CreatorName("")).toThrow("Creator name cannot be empty");
			expect(() => new CreatorName("  ")).toThrow("Creator name cannot be empty");
		});
	});

	describe("getSearchableText", () => {
		it("should return the name for searchable text", () => {
			const name = new CreatorName("声優太郎");
			expect(name.getSearchableText()).toBe("声優太郎");
		});
	});

	describe("equals", () => {
		it("should return true for same names", () => {
			const name1 = new CreatorName("田中太郎");
			const name2 = new CreatorName("田中太郎");
			expect(name1.equals(name2)).toBe(true);
		});

		it("should return false for different names", () => {
			const name1 = new CreatorName("田中太郎");
			const name2 = new CreatorName("山田花子");
			expect(name1.equals(name2)).toBe(false);
		});
	});
});

describe("CreatorRoles", () => {
	describe("constructor", () => {
		it("should create valid CreatorRoles with single role", () => {
			const roles = new CreatorRoles(["voice"]);
			expect(roles.toArray()).toEqual(["voice"]);
		});

		it("should create valid CreatorRoles with multiple roles", () => {
			const roles = new CreatorRoles(["voice", "scenario"]);
			expect(roles.toArray()).toEqual(["voice", "scenario"]);
		});

		it("should remove duplicates", () => {
			const roles = new CreatorRoles(["voice", "voice", "scenario"]);
			expect(roles.toArray()).toEqual(["voice", "scenario"]);
		});

		it("should sort roles by priority", () => {
			const roles = new CreatorRoles(["music", "voice", "scenario"]);
			expect(roles.toArray()).toEqual(["voice", "scenario", "music"]);
		});

		it("should throw error for empty roles", () => {
			expect(() => new CreatorRoles([])).toThrow("Creator must have at least one role");
		});

		it("should throw error for invalid role", () => {
			expect(() => new CreatorRoles(["invalid" as CreatorRole])).toThrow("Invalid creator role");
		});
	});

	describe("hasRole", () => {
		it("should return true if role exists", () => {
			const roles = new CreatorRoles(["voice", "scenario"]);
			expect(roles.hasRole("voice")).toBe(true);
			expect(roles.hasRole("scenario")).toBe(true);
		});

		it("should return false if role does not exist", () => {
			const roles = new CreatorRoles(["voice"]);
			expect(roles.hasRole("illustration")).toBe(false);
		});
	});

	describe("addRole", () => {
		it("should add a new role", () => {
			const roles = new CreatorRoles(["voice"]);
			const updated = roles.addRole("scenario");
			expect(updated.toArray()).toEqual(["voice", "scenario"]);
			expect(roles.toArray()).toEqual(["voice"]); // Original unchanged
		});

		it("should not duplicate existing role", () => {
			const roles = new CreatorRoles(["voice"]);
			const updated = roles.addRole("voice");
			expect(updated.toArray()).toEqual(["voice"]);
		});
	});

	describe("removeRole", () => {
		it("should remove a role", () => {
			const roles = new CreatorRoles(["voice", "scenario"]);
			const updated = roles.removeRole("scenario");
			expect(updated.toArray()).toEqual(["voice"]);
			expect(roles.toArray()).toEqual(["voice", "scenario"]); // Original unchanged
		});

		it("should throw error when removing last role", () => {
			const roles = new CreatorRoles(["voice"]);
			expect(() => roles.removeRole("voice")).toThrow("Cannot remove the last role from creator");
		});
	});

	describe("toDisplayString", () => {
		it("should return single role label", () => {
			const roles = new CreatorRoles(["voice"]);
			expect(roles.toDisplayString()).toBe("声優");
		});

		it("should return multiple role labels joined", () => {
			const roles = new CreatorRoles(["voice", "scenario"]);
			expect(roles.toDisplayString()).toBe("声優 / シナリオ");
		});
	});

	describe("getPrimaryRole", () => {
		it("should return the first role by priority", () => {
			const roles = new CreatorRoles(["music", "voice"]);
			expect(roles.getPrimaryRole()).toBe("voice");
		});
	});
});

describe("CreatorEntity", () => {
	const createTestCreator = () => {
		return CreatorEntity.create("12345", "テスト声優", ["voice"], 10);
	};

	describe("create", () => {
		it("should create a new creator entity", () => {
			const creator = createTestCreator();
			expect(creator.creatorId).toBe("12345");
			expect(creator.creatorName).toBe("テスト声優");
			expect(creator.creatorRoles).toEqual(["voice"]);
			expect(creator.workCount).toBe(10);
		});

		it("should create with multiple roles", () => {
			const creator = CreatorEntity.create("12345", "マルチクリエイター", ["voice", "scenario"]);
			expect(creator.creatorRoles).toEqual(["voice", "scenario"]);
		});

		it("should create with default work count", () => {
			const creator = CreatorEntity.create("12345", "新人声優", ["voice"]);
			expect(creator.workCount).toBe(0);
		});
	});

	describe("business logic", () => {
		it("should check if creator has works", () => {
			const creatorWithWorks = createTestCreator();
			const creatorWithoutWorks = CreatorEntity.create("67890", "新人声優", ["voice"]);

			expect(creatorWithWorks.hasWorks()).toBe(true);
			expect(creatorWithoutWorks.hasWorks()).toBe(false);
		});

		it("should check if creator is new", () => {
			const newCreator = createTestCreator();
			expect(newCreator.isNewCreator()).toBe(true);

			// Create old creator
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 60);
			const oldCreator = new CreatorEntity(
				new CreatorId("12345"),
				new CreatorName("ベテラン声優"),
				new CreatorRoles(["voice"]),
				50,
				oldDate,
				new Date(),
			);
			expect(oldCreator.isNewCreator()).toBe(false);
		});

		it("should check if creator is active", () => {
			const activeCreator = createTestCreator();
			expect(activeCreator.isActive()).toBe(true);

			// Create inactive creator
			const inactiveDate = new Date();
			inactiveDate.setDate(inactiveDate.getDate() - 120);
			const inactiveCreator = new CreatorEntity(
				new CreatorId("12345"),
				new CreatorName("引退声優"),
				new CreatorRoles(["voice"]),
				20,
				inactiveDate,
				inactiveDate,
			);
			expect(inactiveCreator.isActive()).toBe(false);
		});

		it("should check if creator has specific role", () => {
			const creator = CreatorEntity.create("12345", "声優", ["voice", "scenario"]);
			expect(creator.hasRole("voice")).toBe(true);
			expect(creator.hasRole("scenario")).toBe(true);
			expect(creator.hasRole("illustration")).toBe(false);
		});

		it("should check if creator is voice actor", () => {
			const voiceActor = CreatorEntity.create("12345", "声優", ["voice", "scenario"]);
			const illustrator = CreatorEntity.create("67890", "イラストレーター", ["illustration"]);

			expect(voiceActor.isVoiceActor()).toBe(true);
			expect(illustrator.isVoiceActor()).toBe(false);
		});
	});

	describe("updates", () => {
		it("should update work count", async () => {
			const creator = createTestCreator();
			// Add small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));
			const updated = creator.updateWorkCount(20);

			expect(updated.workCount).toBe(20);
			expect(creator.workCount).toBe(10); // Original unchanged
			expect(updated.lastUpdated.getTime()).toBeGreaterThan(creator.lastUpdated.getTime());
		});

		it("should increment work count", () => {
			const creator = createTestCreator();
			const incremented = creator.incrementWorkCount();

			expect(incremented.workCount).toBe(11);
			expect(creator.workCount).toBe(10); // Original unchanged
		});

		it("should decrement work count", () => {
			const creator = createTestCreator();
			const decremented = creator.decrementWorkCount();

			expect(decremented.workCount).toBe(9);
			expect(creator.workCount).toBe(10); // Original unchanged
		});

		it("should throw error when decrementing from zero", () => {
			const creator = CreatorEntity.create("12345", "新人", ["voice"], 0);
			expect(() => creator.decrementWorkCount()).toThrow("Cannot decrement work count below 0");
		});

		it("should update name", () => {
			const creator = createTestCreator();
			const updated = creator.updateName("新しい名前");

			expect(updated.creatorName).toBe("新しい名前");
			expect(creator.creatorName).toBe("テスト声優"); // Original unchanged
		});

		it("should add role", () => {
			const creator = createTestCreator();
			const updated = creator.addRole("scenario");

			expect(updated.creatorRoles).toEqual(["voice", "scenario"]);
			expect(creator.creatorRoles).toEqual(["voice"]); // Original unchanged
		});

		it("should remove role", () => {
			const creator = CreatorEntity.create("12345", "マルチ", ["voice", "scenario"]);
			const updated = creator.removeRole("scenario");

			expect(updated.creatorRoles).toEqual(["voice"]);
			expect(creator.creatorRoles).toEqual(["voice", "scenario"]); // Original unchanged
		});
	});

	describe("validation", () => {
		it("should validate a valid creator", () => {
			const creator = createTestCreator();
			expect(creator.isValid()).toBe(true);
			expect(creator.getValidationErrors()).toHaveLength(0);
		});

		it("should detect date validation errors", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			// When createdAt is in the future, it's also after lastUpdated
			// The entity checks createdAt > lastUpdated first
			expect(
				() =>
					new CreatorEntity(
						new CreatorId("12345"),
						new CreatorName("テスト"),
						new CreatorRoles(["voice"]),
						0,
						futureDate,
						new Date(),
					),
			).toThrow("Created date cannot be after last updated date");
		});

		it("should detect future date errors", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			// Test future date validation when both dates are the same
			expect(
				() =>
					new CreatorEntity(
						new CreatorId("12345"),
						new CreatorName("テスト"),
						new CreatorRoles(["voice"]),
						0,
						futureDate,
						futureDate,
					),
			).toThrow("Created date cannot be in the future");
		});

		it("should detect invalid work count", () => {
			expect(
				() =>
					new CreatorEntity(
						new CreatorId("12345"),
						new CreatorName("テスト"),
						new CreatorRoles(["voice"]),
						-1,
						new Date(),
						new Date(),
					),
			).toThrow("Work count must be a non-negative integer");
		});
	});

	describe("serialization", () => {
		it("should convert to Firestore format", () => {
			const creator = createTestCreator();
			const firestore = creator.toFirestore();

			expect(firestore.creatorId).toBe("12345");
			expect(firestore.creatorName).toBe("テスト声優");
			expect(firestore.types).toEqual(["voice"]);
			expect(firestore.workCount).toBe(10);
			expect(firestore.createdAt).toBeInstanceOf(Date);
			expect(firestore.lastUpdated).toBeInstanceOf(Date);
		});

		it("should create from Firestore data", () => {
			const firestoreData = {
				creatorId: "12345",
				creatorName: "テスト声優",
				types: ["voice", "scenario"] as CreatorRole[],
				workCount: 10,
				createdAt: new Date(),
				lastUpdated: new Date(),
			};

			const creator = CreatorEntity.fromFirestoreData(firestoreData);
			expect(creator.creatorId).toBe("12345");
			expect(creator.creatorName).toBe("テスト声優");
			expect(creator.creatorRoles).toEqual(["voice", "scenario"]);
			expect(creator.workCount).toBe(10);
		});

		it("should handle missing lastUpdated in Firestore data", () => {
			const firestoreData = {
				creatorId: "12345",
				creatorName: "テスト声優",
				types: ["voice"] as CreatorRole[],
				createdAt: new Date(),
			};

			const creator = CreatorEntity.fromFirestoreData(firestoreData);
			expect(creator.createdAt.getTime()).toBe(creator.lastUpdated.getTime());
		});

		it("should convert to plain object", () => {
			const creator = createTestCreator();
			const plain = creator.toPlainObject();

			expect(plain).toMatchObject({
				id: "12345",
				creatorId: "12345",
				name: "テスト声優",
				types: ["voice"],
				workCount: 10,
			});
			expect(plain.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(plain.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});
	});

	describe("equality", () => {
		it("should be equal for same creator ID", () => {
			const creator1 = CreatorEntity.create("12345", "声優1", ["voice"]);
			const creator2 = CreatorEntity.create("12345", "声優2", ["scenario"]);
			expect(creator1.equals(creator2)).toBe(true);
		});

		it("should not be equal for different creator IDs", () => {
			const creator1 = CreatorEntity.create("12345", "声優", ["voice"]);
			const creator2 = CreatorEntity.create("67890", "声優", ["voice"]);
			expect(creator1.equals(creator2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create a deep copy", () => {
			const original = createTestCreator();
			const clone = original.clone();

			expect(clone.equals(original)).toBe(true);
			expect(clone).not.toBe(original);
			expect(clone.creatorId).toBe(original.creatorId);
			expect(clone.creatorName).toBe(original.creatorName);
			expect(clone.workCount).toBe(original.workCount);
		});
	});
});
