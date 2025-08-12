import { describe, expect, it } from "vitest";
import { type Brand, createBrandFactory } from "../branded-types";

describe("branded-types", () => {
	describe("createBrandFactory", () => {
		// テスト用のブランド型定義
		type TestBrand = Brand<string, "TestBrand">;
		const TestBrand = createBrandFactory<TestBrand>(
			(value) => value.length > 0 && value.length < 10,
			(value) => `Invalid TestBrand: ${value}`,
		);

		describe("of", () => {
			it("有効な値でブランド型を作成できる", () => {
				const result = TestBrand.of("valid");
				expect(result).toBe("valid");
			});

			it("無効な値でエラーをスローする", () => {
				expect(() => TestBrand.of("")).toThrow("Invalid TestBrand: ");
				expect(() => TestBrand.of("toolongvalue")).toThrow("Invalid TestBrand: toolongvalue");
			});
		});

		describe("tryOf", () => {
			it("有効な値でブランド型を作成できる", () => {
				const result = TestBrand.tryOf("valid");
				expect(result).toBe("valid");
			});

			it("無効な値でundefinedを返す", () => {
				expect(TestBrand.tryOf("")).toBeUndefined();
				expect(TestBrand.tryOf("toolongvalue")).toBeUndefined();
			});
		});

		describe("isValid", () => {
			it("有効な文字列でtrueを返す", () => {
				expect(TestBrand.isValid("valid")).toBe(true);
			});

			it("無効な文字列でfalseを返す", () => {
				expect(TestBrand.isValid("")).toBe(false);
				expect(TestBrand.isValid("toolongvalue")).toBe(false);
			});

			it("文字列以外の値でfalseを返す", () => {
				expect(TestBrand.isValid(123)).toBe(false);
				expect(TestBrand.isValid(null)).toBe(false);
				expect(TestBrand.isValid(undefined)).toBe(false);
				expect(TestBrand.isValid({})).toBe(false);
			});
		});

		describe("parse", () => {
			it("有効な文字列をパースできる", () => {
				const result = TestBrand.parse("valid");
				expect(result).toBe("valid");
			});

			it("無効な文字列でエラーをスローする", () => {
				expect(() => TestBrand.parse("")).toThrow("Invalid TestBrand: ");
			});

			it("文字列以外の値でエラーをスローする", () => {
				expect(() => TestBrand.parse(123)).toThrow("Expected string, got number");
				expect(() => TestBrand.parse(null)).toThrow("Expected string, got object");
				expect(() => TestBrand.parse(undefined)).toThrow("Expected string, got undefined");
			});
		});
	});

	describe("Brand type", () => {
		it("異なるブランドは型レベルで区別される", () => {
			type BrandA = Brand<string, "A">;
			type BrandB = Brand<string, "B">;

			const a = "test" as BrandA;
			const b = "test" as BrandB;

			// TypeScriptの型チェックで、これらは異なる型として扱われる
			// @ts-expect-error - 異なるブランド型は代入できない
			const _: BrandA = b;
			// @ts-expect-error - 異なるブランド型は代入できない
			const __: BrandB = a;

			expect(a).toBe("test");
			expect(b).toBe("test");
		});
	});
});
