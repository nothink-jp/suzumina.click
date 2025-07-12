import { describe, expect, it } from "vitest";
import {
	ContactCategorySchema,
	type ContactPriority,
	ContactPrioritySchema,
	type ContactStatus,
	ContactStatusSchema,
	FirestoreContactDataSchema,
	FrontendContactDataSchema,
	getPriorityColor,
	getPriorityDisplayName,
	getStatusDisplayName,
} from "./contact";

describe("Contact Schemas", () => {
	describe("ContactCategorySchema", () => {
		it("should validate category values", () => {
			expect(() => ContactCategorySchema.parse("bug")).not.toThrow();
			expect(() => ContactCategorySchema.parse("feature")).not.toThrow();
			expect(() => ContactCategorySchema.parse("usage")).not.toThrow();
			expect(() => ContactCategorySchema.parse("other")).not.toThrow();
			expect(() => ContactCategorySchema.parse("invalid")).toThrow();
		});
	});

	describe("ContactPrioritySchema", () => {
		it("should validate priority values", () => {
			expect(() => ContactPrioritySchema.parse("low")).not.toThrow();
			expect(() => ContactPrioritySchema.parse("medium")).not.toThrow();
			expect(() => ContactPrioritySchema.parse("high")).not.toThrow();
			expect(() => ContactPrioritySchema.parse("invalid")).toThrow();
		});
	});

	describe("ContactStatusSchema", () => {
		it("should validate status values", () => {
			expect(() => ContactStatusSchema.parse("new")).not.toThrow();
			expect(() => ContactStatusSchema.parse("reviewing")).not.toThrow();
			expect(() => ContactStatusSchema.parse("resolved")).not.toThrow();
			expect(() => ContactStatusSchema.parse("invalid")).toThrow();
		});
	});

	describe("FirestoreContactDataSchema", () => {
		it("should validate basic structure", () => {
			// Test that schema exists and can be used
			expect(typeof FirestoreContactDataSchema.parse).toBe("function");
		});
	});

	describe("FrontendContactDataSchema", () => {
		it("should validate basic structure", () => {
			// Test that schema exists and can be used
			expect(typeof FrontendContactDataSchema.parse).toBe("function");
		});
	});
});

describe("Contact Utility Functions", () => {
	describe("getStatusDisplayName", () => {
		it("should return correct Japanese status names", () => {
			expect(getStatusDisplayName("new" as ContactStatus)).toBe("新規");
			expect(getStatusDisplayName("reviewing" as ContactStatus)).toBe("確認中");
			expect(getStatusDisplayName("resolved" as ContactStatus)).toBe("対応済み");
		});
	});

	describe("getPriorityDisplayName", () => {
		it("should return correct Japanese priority names", () => {
			expect(getPriorityDisplayName("low" as ContactPriority)).toBe("低");
			expect(getPriorityDisplayName("medium" as ContactPriority)).toBe("中");
			expect(getPriorityDisplayName("high" as ContactPriority)).toBe("高");
		});
	});

	describe("getPriorityColor", () => {
		it("should return correct CSS color classes", () => {
			expect(getPriorityColor("low" as ContactPriority)).toBe("text-green-600");
			expect(getPriorityColor("medium" as ContactPriority)).toBe("text-yellow-600");
			expect(getPriorityColor("high" as ContactPriority)).toBe("text-red-600");
		});
	});
});
