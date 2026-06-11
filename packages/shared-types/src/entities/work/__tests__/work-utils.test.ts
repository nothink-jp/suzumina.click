import { describe, expect, it } from "vitest";
import {
	getAgeCategoryDisplayName,
	getAgeCategoryStringDisplayName,
	getWorkCategoryDisplayName,
	getWorkCategoryDisplayNameSafe,
	getWorkCategoryDisplayText,
	getWorkLanguageDisplayName,
	getWorkLanguageDisplayNameSafe,
	normalizeLanguageCode,
} from "../work-utils";

describe("category 表示名", () => {
	it("既知カテゴリは日本語名", () => {
		expect(getWorkCategoryDisplayName("SOU")).toBe("ボイス・ASMR");
	});

	it("Safe 版は未知カテゴリをそのまま返す", () => {
		expect(getWorkCategoryDisplayNameSafe("SOU")).toBe("ボイス・ASMR");
		expect(getWorkCategoryDisplayNameSafe("UNKNOWN")).toBe("UNKNOWN");
	});

	it("originalCategoryText を優先し、無ければマッピング", () => {
		expect(getWorkCategoryDisplayText({ category: "SOU", originalCategoryText: "音声作品" })).toBe(
			"音声作品",
		);
		expect(getWorkCategoryDisplayText({ category: "SOU", originalCategoryText: "  " })).toBe(
			"ボイス・ASMR",
		);
		expect(getWorkCategoryDisplayText({ category: "RPG" })).toBe("ロールプレイング");
	});
});

describe("language 表示名", () => {
	it("既知言語は日本語名", () => {
		expect(getWorkLanguageDisplayName("ja")).toBe("日本語");
		expect(getWorkLanguageDisplayName("en")).toBe("英語");
	});

	it("Safe 版は未知言語をそのまま返す", () => {
		expect(getWorkLanguageDisplayNameSafe("ja")).toBe("日本語");
		expect(getWorkLanguageDisplayNameSafe("xx")).toBe("xx");
	});
});

describe("年齢カテゴリ表示名", () => {
	it("数値カテゴリ", () => {
		expect(getAgeCategoryDisplayName(1)).toBe("全年齢");
		expect(getAgeCategoryDisplayName(3)).toBe("18禁");
		expect(getAgeCategoryDisplayName(99)).toBe("不明");
	});

	it("文字列カテゴリ", () => {
		expect(getAgeCategoryStringDisplayName("general")).toBe("全年齢");
		expect(getAgeCategoryStringDisplayName("adult")).toBe("18禁");
		expect(getAgeCategoryStringDisplayName("unknown")).toBe("不明");
	});
});

describe("normalizeLanguageCode", () => {
	it("別名・大文字を正規化する", () => {
		expect(normalizeLanguageCode("japanese")).toBe("ja");
		expect(normalizeLanguageCode("EN-US")).toBe("en");
		expect(normalizeLanguageCode("chinese_simplified")).toBe("zh-cn");
	});

	it("未知コードは other", () => {
		expect(normalizeLanguageCode("klingon")).toBe("other");
	});
});
