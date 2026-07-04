import { describe, expect, it } from "vitest";
import { ContactCategorySchema, FirestoreContactDataSchema } from "../contact";

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

	describe("FirestoreContactDataSchema", () => {
		const validData = {
			category: "bug",
			subject: "テスト件名",
			content: "テスト本文です。10文字以上あります。",
			ipAddress: "1.2.3.4",
			userAgent: "test-agent",
			createdAt: "2026-07-04T00:00:00.000Z",
			timestamp: "2026-07-04T00:00:00.000Z",
		};

		it("書き込み実体と同じ形を受理する（email は省略可）", () => {
			expect(() => FirestoreContactDataSchema.parse(validData)).not.toThrow();
			expect(() =>
				FirestoreContactDataSchema.parse({ ...validData, email: "a@example.com" }),
			).not.toThrow();
		});

		it("admin 時代の status/priority を要求しない（SPR-241 で撤去済み）", () => {
			const parsed = FirestoreContactDataSchema.parse(validData);
			expect(parsed).not.toHaveProperty("status");
			expect(parsed).not.toHaveProperty("priority");
		});

		it("content は 10 文字未満を拒否する", () => {
			expect(() => FirestoreContactDataSchema.parse({ ...validData, content: "短い" })).toThrow();
		});
	});
});
