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
	optimizeDateFormats,
	parseSizeToBytes,
} from "../work-utils";

describe("optimizeDateFormats", () => {
	it("日本語日付を ISO に変換する", () => {
		expect(optimizeDateFormats("2023年03月05日")).toEqual({
			original: "2023年03月05日",
			iso: "2023-03-05",
			display: "2023年03月05日",
		});
	});

	it("ISO 日付を日本語表示に変換する", () => {
		expect(optimizeDateFormats("2023-03-05")).toEqual({
			original: "2023-03-05",
			iso: "2023-03-05",
			display: "2023年03月05日",
		});
	});

	it("どちらにも一致しない場合は original/display のみ返す", () => {
		expect(optimizeDateFormats("不明")).toEqual({
			original: "不明",
			display: "不明",
		});
	});
});

describe("parseSizeToBytes", () => {
	it("未指定は undefined", () => {
		expect(parseSizeToBytes(undefined)).toBeUndefined();
		expect(parseSizeToBytes("")).toBeUndefined();
	});

	it("単位ごとにバイト換算する", () => {
		expect(parseSizeToBytes("1KB")).toBe(1024);
		expect(parseSizeToBytes("2 MB")).toBe(2 * 1024 * 1024);
		expect(parseSizeToBytes("1.5GB")).toBe(Math.round(1.5 * 1024 ** 3));
	});

	it("単位の大文字小文字を問わない", () => {
		expect(parseSizeToBytes("10mb")).toBe(10 * 1024 * 1024);
	});

	it("マッチしない文字列は undefined", () => {
		expect(parseSizeToBytes("わからない")).toBeUndefined();
	});
});

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
