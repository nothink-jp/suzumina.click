import { describe, expect, it } from "vitest";
import { WorkId } from "../work-id";

describe("WorkId", () => {
	describe("create", () => {
		it("should create valid work ID", () => {
			const result = WorkId.create("RJ12345678");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("RJ12345678");
			}
		});

		it("should accept various DLsite ID formats", () => {
			const formats = ["RJ12345678", "RE12345678", "RG12345678", "BJ12345678", "VJ12345678"];
			for (const format of formats) {
				const result = WorkId.create(format);
				expect(result.isOk()).toBe(true);
			}
		});

		it("should return error for invalid format", () => {
			const invalidCases = [
				{ input: "", error: "Work ID cannot be empty" },
				{ input: "   ", error: "Work ID cannot be empty" },
				{ input: "R12345678", error: "Work ID must match pattern" },
				{ input: "RJA12345678", error: "Work ID must match pattern" },
				{ input: "rj12345678", error: "Work ID must match pattern" },
				{ input: "12345678", error: "Work ID must match pattern" },
			];

			for (const { input, error } of invalidCases) {
				const result = WorkId.create(input);
				expect(result.isErr()).toBe(true);
				if (result.isErr()) {
					expect(result.error.message).toContain(error);
				}
			}
		});
	});

	describe("createDLsiteWorkId", () => {
		it("should create valid DLsite work ID", () => {
			const result = WorkId.createDLsiteWorkId("RJ12345678");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("RJ12345678");
			}
		});

		it("should accept 6-8 digit formats", () => {
			const validCases = ["RJ123456", "RJ1234567", "RJ12345678"];
			for (const input of validCases) {
				const result = WorkId.createDLsiteWorkId(input);
				expect(result.isOk()).toBe(true);
			}
		});

		it("should reject non-DLsite formats", () => {
			const invalidCases = ["RE12345678", "RJ12345", "RJ123456789", "BJ12345678"];
			for (const input of invalidCases) {
				const result = WorkId.createDLsiteWorkId(input);
				expect(result.isErr()).toBe(true);
			}
		});
	});

	describe("fromString", () => {
		it("should create WorkId from valid string", () => {
			const result = WorkId.fromString("RJ12345678");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("RJ12345678");
			}
		});

		it("should return error for invalid string", () => {
			const invalidCases = ["invalid", "", "12345678"];
			for (const input of invalidCases) {
				const result = WorkId.fromString(input);
				expect(result.isErr()).toBe(true);
			}
		});

		it("should return error for non-string input", () => {
			const nonStringCases = [null, undefined, 12345678, {}, []];
			for (const input of nonStringCases) {
				const result = WorkId.fromString(input);
				expect(result.isErr()).toBe(true);
				if (result.isErr()) {
					expect(result.error.message).toContain("must be a string");
				}
			}
		});
	});

	describe("fromPlainObject", () => {
		it("should create WorkId from plain string", () => {
			const result = WorkId.fromPlainObject("RJ12345678");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.toString()).toBe("RJ12345678");
			}
		});
	});

	describe("getType", () => {
		it("should return ID type prefix", () => {
			const cases = [
				{ input: "RJ12345678", expected: "RJ" },
				{ input: "RE12345678", expected: "RE" },
				{ input: "BJ12345678", expected: "BJ" },
			];

			for (const { input, expected } of cases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.getType()).toBe(expected);
				}
			}
		});
	});

	describe("getNumericPart", () => {
		it("should return numeric part as number", () => {
			const cases = [
				{ input: "RJ12345678", expected: 12345678 },
				{ input: "RJ00001234", expected: 1234 },
				{ input: "RE99999999", expected: 99999999 },
			];

			for (const { input, expected } of cases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.getNumericPart()).toBe(expected);
				}
			}
		});
	});

	describe("isDLsiteWorkId", () => {
		it("should return true for strict RJ format with 8 digits", () => {
			const validCases = ["RJ12345678", "RJ00000001"];
			for (const input of validCases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.isDLsiteWorkId()).toBe(true);
				}
			}
		});

		it("should return false for non-RJ prefix", () => {
			const invalidCases = ["RE12345678", "BJ12345678"];
			for (const input of invalidCases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.isDLsiteWorkId()).toBe(false);
				}
			}
		});

		it("should return false for RJ with wrong digit count", () => {
			const invalidCases = ["RJ123456", "RJ1234567", "RJ123456789"];
			for (const input of invalidCases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.isDLsiteWorkId()).toBe(false);
				}
			}
		});
	});

	describe("isDLsiteWorkIdLoose", () => {
		it("should return true for RJ with 6-8 digits", () => {
			const validCases = ["RJ123456", "RJ1234567", "RJ12345678"];
			for (const input of validCases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.isDLsiteWorkIdLoose()).toBe(true);
				}
			}
		});

		it("should return false for non-RJ prefix", () => {
			const result = WorkId.create("RE12345678");
			if (result.isOk()) {
				expect(result.value.isDLsiteWorkIdLoose()).toBe(false);
			}
		});

		it("should return false for wrong digit count", () => {
			const invalidCases = ["RJ12345", "RJ123456789"];
			for (const input of invalidCases) {
				const result = WorkId.create(input);
				if (result.isOk()) {
					expect(result.value.isDLsiteWorkIdLoose()).toBe(false);
				}
			}
		});
	});

	describe("toString", () => {
		it("should return the work ID value", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				expect(result.value.toString()).toBe("RJ12345678");
			}
		});
	});

	describe("toJSON", () => {
		it("should return the work ID value", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				expect(result.value.toJSON()).toBe("RJ12345678");
			}
		});
	});

	describe("toPlainObject", () => {
		it("should return the work ID value", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				expect(result.value.toPlainObject()).toBe("RJ12345678");
			}
		});
	});

	describe("equals", () => {
		it("should return true for same work ID", () => {
			const result1 = WorkId.create("RJ12345678");
			const result2 = WorkId.create("RJ12345678");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it("should return false for different work ID", () => {
			const result1 = WorkId.create("RJ12345678");
			const result2 = WorkId.create("RJ87654321");
			if (result1.isOk() && result2.isOk()) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});

		it("should return false for non-WorkId object", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				expect(result.value.equals("RJ12345678" as any)).toBe(false);
				expect(result.value.equals(null as any)).toBe(false);
				expect(result.value.equals(undefined as any)).toBe(false);
			}
		});
	});

	describe("clone", () => {
		it("should create a copy of the WorkId", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				const cloned = result.value.clone();
				expect(cloned).toBeInstanceOf(WorkId);
				expect(cloned.toString()).toBe("RJ12345678");
				expect(cloned.equals(result.value)).toBe(true);
			}
		});
	});

	describe("validation", () => {
		it("should validate correctly", () => {
			const result = WorkId.create("RJ12345678");
			if (result.isOk()) {
				expect(result.value.isValid()).toBe(true);
				expect(result.value.getValidationErrors()).toHaveLength(0);
			}
		});
	});

	describe("static helpers", () => {
		it("should validate DLsite work ID format", () => {
			expect(WorkId.isValidDLsiteWorkId("RJ12345678")).toBe(true);
			expect(WorkId.isValidDLsiteWorkId("RJ00000001")).toBe(true);
			expect(WorkId.isValidDLsiteWorkId("RJ99999999")).toBe(true);

			expect(WorkId.isValidDLsiteWorkId("RE12345678")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("RJ123456")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("RJ123456789")).toBe(false);
			expect(WorkId.isValidDLsiteWorkId("")).toBe(false);
		});

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
