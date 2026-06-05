import { describe, expect, it } from "vitest";
import {
	getSupportedCategoryIds,
	getYouTubeCategoryName,
	isValidCategoryId,
} from "../youtube-category-utils";

describe("getYouTubeCategoryName", () => {
	it("未指定は null", () => {
		expect(getYouTubeCategoryName(undefined)).toBeNull();
		expect(getYouTubeCategoryName("")).toBeNull();
	});
	it("既知カテゴリは日本語名", () => {
		expect(getYouTubeCategoryName("10")).toBe("音楽");
		expect(getYouTubeCategoryName("20")).toBe("ゲーム");
	});
	it("未知カテゴリは『カテゴリ{id}』", () => {
		expect(getYouTubeCategoryName("999")).toBe("カテゴリ999");
	});
});

describe("getSupportedCategoryIds", () => {
	it("既知カテゴリ ID 一覧を返す", () => {
		const ids = getSupportedCategoryIds();
		expect(ids).toContain("10");
		expect(ids.length).toBeGreaterThan(10);
	});
});

describe("isValidCategoryId", () => {
	it("既知は true、未知は false", () => {
		expect(isValidCategoryId("10")).toBe(true);
		expect(isValidCategoryId("999")).toBe(false);
	});
});
