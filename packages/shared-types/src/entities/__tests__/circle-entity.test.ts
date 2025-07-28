import { describe, expect, it } from "vitest";
import type { CircleData } from "../circle-creator";
import { CircleEntity, CircleId, CircleName, WorkCount } from "../circle-entity";

describe("CircleId", () => {
	describe("constructor", () => {
		it("should create a valid CircleId", () => {
			const id = new CircleId("RG23954");
			expect(id.toString()).toBe("RG23954");
		});

		it("should throw error for empty ID", () => {
			expect(() => new CircleId("")).toThrow("Circle ID cannot be empty");
			expect(() => new CircleId("  ")).toThrow("Circle ID cannot be empty");
		});

		it("should throw error for invalid format", () => {
			expect(() => new CircleId("123")).toThrow("Invalid circle ID format");
			expect(() => new CircleId("RG")).toThrow("Invalid circle ID format");
			expect(() => new CircleId("RGabc")).toThrow("Invalid circle ID format");
			expect(() => new CircleId("rg123")).toThrow("Invalid circle ID format");
		});
	});

	describe("toUrl", () => {
		it("should generate correct DLsite URL", () => {
			const id = new CircleId("RG23954");
			expect(id.toUrl()).toBe(
				"https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG23954.html",
			);
		});
	});

	describe("equals", () => {
		it("should return true for same IDs", () => {
			const id1 = new CircleId("RG23954");
			const id2 = new CircleId("RG23954");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should return false for different IDs", () => {
			const id1 = new CircleId("RG23954");
			const id2 = new CircleId("RG12345");
			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe("CircleName", () => {
	describe("constructor", () => {
		it("should create a valid CircleName with Japanese only", () => {
			const name = new CircleName("テストサークル");
			expect(name.japanese).toBe("テストサークル");
			expect(name.english).toBeUndefined();
		});

		it("should create a valid CircleName with both Japanese and English", () => {
			const name = new CircleName("テストサークル", "Test Circle");
			expect(name.japanese).toBe("テストサークル");
			expect(name.english).toBe("Test Circle");
		});

		it("should throw error for empty name", () => {
			expect(() => new CircleName("")).toThrow("Circle name cannot be empty");
			expect(() => new CircleName("  ")).toThrow("Circle name cannot be empty");
		});
	});

	describe("toDisplayString", () => {
		it("should return Japanese name by default", () => {
			const name = new CircleName("テストサークル", "Test Circle");
			expect(name.toDisplayString()).toBe("テストサークル");
		});

		it("should return Japanese name for ja locale", () => {
			const name = new CircleName("テストサークル", "Test Circle");
			expect(name.toDisplayString("ja")).toBe("テストサークル");
		});

		it("should return English name for en locale if available", () => {
			const name = new CircleName("テストサークル", "Test Circle");
			expect(name.toDisplayString("en")).toBe("Test Circle");
		});

		it("should return Japanese name for en locale if English not available", () => {
			const name = new CircleName("テストサークル");
			expect(name.toDisplayString("en")).toBe("テストサークル");
		});
	});

	describe("getSearchableText", () => {
		it("should return Japanese name only if no English", () => {
			const name = new CircleName("テストサークル");
			expect(name.getSearchableText()).toBe("テストサークル");
		});

		it("should return both names if English available", () => {
			const name = new CircleName("テストサークル", "Test Circle");
			expect(name.getSearchableText()).toBe("テストサークル Test Circle");
		});
	});
});

describe("WorkCount", () => {
	describe("constructor", () => {
		it("should create valid WorkCount", () => {
			const count = new WorkCount(5);
			expect(count.toNumber()).toBe(5);
		});

		it("should accept zero", () => {
			const count = new WorkCount(0);
			expect(count.toNumber()).toBe(0);
		});

		it("should throw error for negative numbers", () => {
			expect(() => new WorkCount(-1)).toThrow("Work count must be a non-negative integer");
		});

		it("should throw error for non-integers", () => {
			expect(() => new WorkCount(1.5)).toThrow("Work count must be a non-negative integer");
		});
	});

	describe("increment", () => {
		it("should increment the count", () => {
			const count = new WorkCount(5);
			const incremented = count.increment();
			expect(incremented.toNumber()).toBe(6);
			expect(count.toNumber()).toBe(5); // Original unchanged
		});
	});

	describe("decrement", () => {
		it("should decrement the count", () => {
			const count = new WorkCount(5);
			const decremented = count.decrement();
			expect(decremented.toNumber()).toBe(4);
			expect(count.toNumber()).toBe(5); // Original unchanged
		});

		it("should throw error when decrementing from zero", () => {
			const count = new WorkCount(0);
			expect(() => count.decrement()).toThrow("Cannot decrement work count below 0");
		});
	});
});

describe("CircleEntity", () => {
	const createTestCircle = () => {
		return CircleEntity.create("RG23954", "テストサークル", "Test Circle", 10);
	};

	describe("create", () => {
		it("should create a new circle entity", () => {
			const circle = createTestCircle();
			expect(circle.circleId).toBe("RG23954");
			expect(circle.circleName).toBe("テストサークル");
			expect(circle.circleNameEn).toBe("Test Circle");
			expect(circle.workCountNumber).toBe(10);
		});

		it("should create with default work count", () => {
			const circle = CircleEntity.create("RG23954", "テストサークル");
			expect(circle.workCountNumber).toBe(0);
		});
	});

	describe("business logic", () => {
		it("should check if circle has works", () => {
			const circleWithWorks = createTestCircle();
			const circleWithoutWorks = CircleEntity.create("RG12345", "空サークル");

			expect(circleWithWorks.hasWorks()).toBe(true);
			expect(circleWithoutWorks.hasWorks()).toBe(false);
		});

		it("should check if circle is new", () => {
			const newCircle = createTestCircle();
			expect(newCircle.isNewCircle()).toBe(true);

			// Create old circle
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 60);
			const oldCircle = new CircleEntity(
				new CircleId("RG12345"),
				new CircleName("古いサークル"),
				new WorkCount(5),
				oldDate,
				new Date(),
			);
			expect(oldCircle.isNewCircle()).toBe(false);
		});

		it("should check if circle is active", () => {
			const activeCircle = createTestCircle();
			expect(activeCircle.isActive()).toBe(true);

			// Create inactive circle
			const inactiveDate = new Date();
			inactiveDate.setDate(inactiveDate.getDate() - 120);
			const inactiveCircle = new CircleEntity(
				new CircleId("RG12345"),
				new CircleName("非アクティブサークル"),
				new WorkCount(5),
				inactiveDate,
				inactiveDate,
			);
			expect(inactiveCircle.isActive()).toBe(false);
		});
	});

	describe("updates", () => {
		it("should update work count", async () => {
			const circle = createTestCircle();
			// Add small delay to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));
			const updated = circle.updateWorkCount(20);

			expect(updated.workCountNumber).toBe(20);
			expect(circle.workCountNumber).toBe(10); // Original unchanged
			expect(updated.lastUpdated.getTime()).toBeGreaterThan(circle.lastUpdated.getTime());
		});

		it("should increment work count", () => {
			const circle = createTestCircle();
			const incremented = circle.incrementWorkCount();

			expect(incremented.workCountNumber).toBe(11);
			expect(circle.workCountNumber).toBe(10); // Original unchanged
		});

		it("should update name", () => {
			const circle = createTestCircle();
			const updated = circle.updateName("新しい名前", "New Name");

			expect(updated.circleName).toBe("新しい名前");
			expect(updated.circleNameEn).toBe("New Name");
			expect(circle.circleName).toBe("テストサークル"); // Original unchanged
		});
	});

	describe("validation", () => {
		it("should validate a valid circle", () => {
			const circle = createTestCircle();
			expect(circle.isValid()).toBe(true);
			expect(circle.getValidationErrors()).toHaveLength(0);
		});

		it("should detect date validation errors", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);

			// When createdAt is in the future, it's also after lastUpdated
			// The entity checks createdAt > lastUpdated first
			expect(
				() =>
					new CircleEntity(
						new CircleId("RG23954"),
						new CircleName("テスト"),
						new WorkCount(0),
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
					new CircleEntity(
						new CircleId("RG23954"),
						new CircleName("テスト"),
						new WorkCount(0),
						futureDate,
						futureDate,
					),
			).toThrow("Created date cannot be in the future");
		});
	});

	describe("serialization", () => {
		it("should convert to Firestore format", () => {
			const circle = createTestCircle();
			const firestore = circle.toFirestore();

			expect(firestore.circleId).toBe("RG23954");
			expect(firestore.name).toBe("テストサークル");
			expect(firestore.nameEn).toBe("Test Circle");
			expect(firestore.workCount).toBe(10);
			expect(firestore.createdAt).toBeInstanceOf(Date);
			expect(firestore.lastUpdated).toBeInstanceOf(Date);
		});

		it("should create from Firestore data", () => {
			const firestoreData: CircleData = {
				circleId: "RG23954",
				name: "テストサークル",
				nameEn: "Test Circle",
				workCount: 10,
				createdAt: new Date(),
				lastUpdated: new Date(),
			};

			const circle = CircleEntity.fromFirestoreData(firestoreData);
			expect(circle.circleId).toBe("RG23954");
			expect(circle.circleName).toBe("テストサークル");
			expect(circle.circleNameEn).toBe("Test Circle");
			expect(circle.workCountNumber).toBe(10);
		});

		it("should convert to plain object", () => {
			const circle = createTestCircle();
			const plain = circle.toPlainObject();

			expect(plain).toMatchObject({
				id: "RG23954",
				circleId: "RG23954",
				name: "テストサークル",
				nameEn: "Test Circle",
				workCount: 10,
				url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG23954.html",
				isNew: true,
				isActive: true,
				hasWorks: true,
			});
			expect(plain.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(plain.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});
	});

	describe("equality", () => {
		it("should be equal for same circle ID", () => {
			const circle1 = CircleEntity.create("RG23954", "サークル1");
			const circle2 = CircleEntity.create("RG23954", "サークル2");
			expect(circle1.equals(circle2)).toBe(true);
		});

		it("should not be equal for different circle IDs", () => {
			const circle1 = CircleEntity.create("RG23954", "サークル");
			const circle2 = CircleEntity.create("RG12345", "サークル");
			expect(circle1.equals(circle2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create a deep copy", () => {
			const original = createTestCircle();
			const clone = original.clone();

			expect(clone.equals(original)).toBe(true);
			expect(clone).not.toBe(original);
			expect(clone.circleId).toBe(original.circleId);
			expect(clone.circleName).toBe(original.circleName);
			expect(clone.workCountNumber).toBe(original.workCountNumber);
		});
	});
});
