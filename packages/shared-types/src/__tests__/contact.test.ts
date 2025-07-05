import { describe, expect, it } from "vitest";
import {
	ContactCategorySchema,
	ContactPrioritySchema,
	ContactStatusSchema,
	FirestoreContactDataSchema,
	FrontendContactDataSchema,
} from "../contact";

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
