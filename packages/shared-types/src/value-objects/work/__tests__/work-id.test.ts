import { describe, expect, it } from "vitest";
import { WorkId } from "../work-id";

describe("WorkId", () => {
	describe("constructor", () => {
		it("should create valid work ID", () => {
			const workId = new WorkId("RJ12345678");
			expect(workId.toString()).toBe("RJ12345678");
		});

		it("should accept various DLsite ID formats", () => {
			expect(() => new WorkId("RJ12345678")).not.toThrow();
			expect(() => new WorkId("RE12345678")).not.toThrow();
			expect(() => new WorkId("RG12345678")).not.toThrow();
			expect(() => new WorkId("BJ12345678")).not.toThrow();
			expect(() => new WorkId("VJ12345678")).not.toThrow();
		});

		it("should throw error for invalid format", () => {
			expect(() => new WorkId("")).toThrow("Invalid Work ID: ");
			expect(() => new WorkId("   ")).toThrow("Invalid Work ID:    ");
			expect(() => new WorkId("R12345678")).toThrow("Invalid Work ID: R12345678");
			expect(() => new WorkId("RJA12345678")).toThrow("Invalid Work ID: RJA12345678");
			expect(() => new WorkId("rj12345678")).toThrow("Invalid Work ID: rj12345678");
			expect(() => new WorkId("12345678")).toThrow("Invalid Work ID: 12345678");
		});
	});

	describe("getType", () => {
		it("should return ID type prefix", () => {
			expect(new WorkId("RJ12345678").getType()).toBe("RJ");
			expect(new WorkId("RE12345678").getType()).toBe("RE");
			expect(new WorkId("BJ12345678").getType()).toBe("BJ");
		});
	});

	describe("getNumericPart", () => {
		it("should return numeric part as number", () => {
			expect(new WorkId("RJ12345678").getNumericPart()).toBe(12345678);
			expect(new WorkId("RJ00001234").getNumericPart()).toBe(1234);
			expect(new WorkId("RE99999999").getNumericPart()).toBe(99999999);
		});
	});

	describe("isDLsiteWorkId", () => {
		it("should return true for strict RJ format with 8 digits", () => {
			expect(new WorkId("RJ12345678").isDLsiteWorkId()).toBe(true);
			expect(new WorkId("RJ00000001").isDLsiteWorkId()).toBe(true);
		});

		it("should return false for non-RJ prefix", () => {
			expect(new WorkId("RE12345678").isDLsiteWorkId()).toBe(false);
			expect(new WorkId("BJ12345678").isDLsiteWorkId()).toBe(false);
		});

		it("should return false for RJ with wrong digit count", () => {
			expect(new WorkId("RJ123456").isDLsiteWorkId()).toBe(false);
			expect(new WorkId("RJ1234567").isDLsiteWorkId()).toBe(false);
			expect(new WorkId("RJ123456789").isDLsiteWorkId()).toBe(false);
		});
	});

	describe("isDLsiteWorkIdLoose", () => {
		it("should return true for RJ with 6-8 digits", () => {
			expect(new WorkId("RJ123456").isDLsiteWorkIdLoose()).toBe(true);
			expect(new WorkId("RJ1234567").isDLsiteWorkIdLoose()).toBe(true);
			expect(new WorkId("RJ12345678").isDLsiteWorkIdLoose()).toBe(true);
		});

		it("should return false for non-RJ prefix", () => {
			expect(new WorkId("RE12345678").isDLsiteWorkIdLoose()).toBe(false);
		});

		it("should return false for wrong digit count", () => {
			expect(new WorkId("RJ12345").isDLsiteWorkIdLoose()).toBe(false);
			expect(new WorkId("RJ123456789").isDLsiteWorkIdLoose()).toBe(false);
		});
	});

	describe("toString", () => {
		it("should return the work ID value", () => {
			const workId = new WorkId("RJ12345678");
			expect(workId.toString()).toBe("RJ12345678");
		});
	});

	describe("toJSON", () => {
		it("should return the work ID value", () => {
			const workId = new WorkId("RJ12345678");
			expect(workId.toJSON()).toBe("RJ12345678");
		});
	});

	describe("equals", () => {
		it("should return true for same work ID", () => {
			const workId1 = new WorkId("RJ12345678");
			const workId2 = new WorkId("RJ12345678");
			expect(workId1.equals(workId2)).toBe(true);
		});

		it("should return false for different work ID", () => {
			const workId1 = new WorkId("RJ12345678");
			const workId2 = new WorkId("RJ87654321");
			expect(workId1.equals(workId2)).toBe(false);
		});

		it("should return false for non-WorkId object", () => {
			const workId = new WorkId("RJ12345678");
			expect(workId.equals("RJ12345678" as any)).toBe(false);
			expect(workId.equals(null as any)).toBe(false);
			expect(workId.equals(undefined as any)).toBe(false);
		});
	});

	describe("fromString", () => {
		it("should create WorkId from valid string", () => {
			const workId = WorkId.fromString("RJ12345678");
			expect(workId).toBeInstanceOf(WorkId);
			expect(workId?.toString()).toBe("RJ12345678");
		});

		it("should return null for invalid string", () => {
			expect(WorkId.fromString("invalid")).toBeNull();
			expect(WorkId.fromString("")).toBeNull();
			expect(WorkId.fromString("12345678")).toBeNull();
		});

		it("should return null for non-string input", () => {
			expect(WorkId.fromString(null)).toBeNull();
			expect(WorkId.fromString(undefined)).toBeNull();
			expect(WorkId.fromString(12345678)).toBeNull();
			expect(WorkId.fromString({})).toBeNull();
			expect(WorkId.fromString([])).toBeNull();
		});
	});

	describe("create", () => {
		it("should create WorkId instance", () => {
			const workId = WorkId.create("RJ12345678");
			expect(workId).toBeInstanceOf(WorkId);
			expect(workId.toString()).toBe("RJ12345678");
		});

		it("should throw for invalid input", () => {
			expect(() => WorkId.create("invalid")).toThrow("Invalid Work ID: invalid");
		});
	});

	describe("isValidDLsiteWorkId", () => {
		it("should validate strict DLsite work ID format", () => {
			expect(WorkId.isValidDLsiteWorkId("RJ12345678")).toBe(true);
			expect(WorkId.isValidDLsiteWorkId("RJ00000001")).toBe(true);
			expect(WorkId.isValidDLsiteWorkId("RJ99999999")).toBe(true);

			expect(WorkId.isValidDLsiteWorkId("RE12345678")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("RJ123456")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("RJ123456789")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("")).toBe(false);
		});
	});

	describe("isValidDLsiteWorkIdLoose", () => {
		it("should validate loose DLsite work ID format", () => {
			expect(WorkId.isValidDLsiteWorkIdLoose("RJ123456")).toBe(true);
			expect(WorkId.isValidDLsiteWorkIdLoose("RJ1234567")).toBe(true);
			expect(WorkId.isValidDLsiteWorkIdLoose("RJ12345678")).toBe(true);

			expect(WorkId.isValidDLsiteWorkIdLoose("RE12345678")).toBe(false);
			expect(WorkId.isValidDLsiteWorkIdLoose("RJ12345")).toBe(false);
			expect(WorkId.isValidDLsiteWorkIdLoose("RJ123456789")).toBe(false);
			expect(WorkId.isValidDLsiteWorkIdLoose("")).toBe(false);
		});
	});
});
