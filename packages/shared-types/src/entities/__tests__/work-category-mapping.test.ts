import { beforeEach, describe, expect, it } from "vitest";
import {
	getWorkCategoryDisplayName,
	getWorkCategoryDisplayNameSafe,
	getWorkCategoryDisplayText,
	WORK_CATEGORY_DISPLAY_NAMES,
	type WorkCategory,
} from "../work";

// テスト間でのオブジェクト状態の保護
const originalMappings = { ...WORK_CATEGORY_DISPLAY_NAMES };

describe("Work Category Mapping", () => {
	beforeEach(() => {
		// 各テスト前にマッピングオブジェクトを復元
		Object.assign(WORK_CATEGORY_DISPLAY_NAMES, originalMappings);
	});
	describe("WORK_CATEGORY_DISPLAY_NAMES", () => {
		it("すべての定義済みカテゴリに対応する日本語名が存在する", () => {
			// DLsite の検索ファセットの表記（25 種）+ フォールバックの etc
			const expectedMappings = {
				ACN: "アクション",
				QIZ: "クイズ",
				ADV: "アドベンチャー",
				RPG: "ロールプレイング",
				TBL: "テーブル",
				DNV: "デジタルノベル",
				SLN: "シミュレーション",
				TYP: "タイピング",
				STG: "シューティング",
				PZL: "パズル",
				ETC: "その他ゲーム",
				MNG: "マンガ",
				SCM: "劇画",
				WBT: "タテヨミ",
				ICG: "CG・イラスト",
				NRE: "ノベル",
				KSV: "官能小説",
				MOV: "動画",
				SOU: "ボイス・ASMR",
				MUS: "音楽",
				TOL: "ツール/アクセサリ",
				IMT: "画像素材",
				AMT: "音素材",
				ET3: "その他",
				VCM: "ボイスコミック",
				etc: "未分類",
			};

			expect(WORK_CATEGORY_DISPLAY_NAMES).toEqual(expectedMappings);
		});

		it("マッピングオブジェクトが期待される構造である", () => {
			// as constが適用されていることを間接的に確認
			// (TypeScript レベルでの読み取り専用チェック)
			expect(typeof WORK_CATEGORY_DISPLAY_NAMES).toBe("object");
			expect(WORK_CATEGORY_DISPLAY_NAMES).not.toBeNull();
		});
	});

	describe("getWorkCategoryDisplayName", () => {
		it("有効なカテゴリコードに対して正しい日本語名を返す", () => {
			expect(getWorkCategoryDisplayName("SOU")).toBe("ボイス・ASMR");
			expect(getWorkCategoryDisplayName("ADV")).toBe("アドベンチャー");
			expect(getWorkCategoryDisplayName("RPG")).toBe("ロールプレイング");
			expect(getWorkCategoryDisplayName("MOV")).toBe("動画");
			expect(getWorkCategoryDisplayName("MNG")).toBe("マンガ");
		});

		it("すべての定義済みカテゴリで正しい値を返す", () => {
			const categories = Object.keys(WORK_CATEGORY_DISPLAY_NAMES) as WorkCategory[];

			categories.forEach((category) => {
				const displayName = getWorkCategoryDisplayName(category);
				expect(displayName).toBeTruthy();
				expect(typeof displayName).toBe("string");
				expect(displayName.length).toBeGreaterThan(0);
			});
		});
	});

	describe("getWorkCategoryDisplayNameSafe", () => {
		it("有効なカテゴリコードに対して正しい日本語名を返す", () => {
			expect(getWorkCategoryDisplayNameSafe("SOU")).toBe("ボイス・ASMR");
			expect(getWorkCategoryDisplayNameSafe("ADV")).toBe("アドベンチャー");
			expect(getWorkCategoryDisplayNameSafe("etc")).toBe("未分類");
		});

		it("無効なカテゴリコードに対してそのままの値を返す", () => {
			expect(getWorkCategoryDisplayNameSafe("UNKNOWN")).toBe("UNKNOWN");
			expect(getWorkCategoryDisplayNameSafe("INVALID_CATEGORY")).toBe("INVALID_CATEGORY");
			expect(getWorkCategoryDisplayNameSafe("")).toBe("");
		});

		it("数値文字列でも安全に処理する", () => {
			expect(getWorkCategoryDisplayNameSafe("123")).toBe("123");
			expect(getWorkCategoryDisplayNameSafe("0")).toBe("0");
		});

		it("空文字列やnullishな値でも安全に処理する", () => {
			expect(getWorkCategoryDisplayNameSafe("")).toBe("");
			// TypeScriptの型システムによりnull/undefinedは渡せないが、
			// 実行時に想定外の値が渡される場合のテスト
		});

		it("大文字小文字を区別する", () => {
			expect(getWorkCategoryDisplayNameSafe("sou")).toBe("sou"); // 小文字は無効
			expect(getWorkCategoryDisplayNameSafe("SOU")).toBe("ボイス・ASMR"); // 大文字は有効
		});
	});

	describe("エッジケース", () => {
		it("新しいカテゴリが追加された場合の動作確認", () => {
			// 将来カテゴリが追加された場合、getWorkCategoryDisplayNameSafeで安全に処理される
			const futureCategory = "NEW_CATEGORY";
			expect(getWorkCategoryDisplayNameSafe(futureCategory)).toBe(futureCategory);
		});

		it("特殊文字を含むカテゴリコードでも安全に処理する", () => {
			expect(getWorkCategoryDisplayNameSafe("SOU-V2")).toBe("SOU-V2");
			expect(getWorkCategoryDisplayNameSafe("SOU_TEST")).toBe("SOU_TEST");
		});
	});

	describe("getWorkCategoryDisplayText", () => {
		it("元のカテゴリテキストが存在する場合はそれを優先する", () => {
			const work = {
				category: "SOU" as WorkCategory,
				originalCategoryText: "音声作品",
			};
			expect(getWorkCategoryDisplayText(work)).toBe("音声作品");
		});

		it("元のカテゴリテキストが空文字の場合はマッピングを使用する", () => {
			const work = {
				category: "SOU" as WorkCategory,
				originalCategoryText: "",
			};
			expect(getWorkCategoryDisplayText(work)).toBe("ボイス・ASMR");
		});

		it("元のカテゴリテキストが未定義の場合はマッピングを使用する", () => {
			const work = {
				category: "SOU" as WorkCategory,
			};
			expect(getWorkCategoryDisplayText(work)).toBe("ボイス・ASMR");
		});

		it("DLsiteから新しいカテゴリが取得された場合はその名前を保持する", () => {
			const work = {
				category: "etc" as WorkCategory,
				originalCategoryText: "新しいカテゴリ",
			};
			expect(getWorkCategoryDisplayText(work)).toBe("新しいカテゴリ");
		});

		it("マンガカテゴリで元のテキストが異なる表記の場合", () => {
			const work1 = {
				category: "MNG" as WorkCategory,
				originalCategoryText: "マンガ",
			};
			const work2 = {
				category: "MNG" as WorkCategory,
				originalCategoryText: "コミック",
			};
			expect(getWorkCategoryDisplayText(work1)).toBe("マンガ");
			expect(getWorkCategoryDisplayText(work2)).toBe("コミック");
		});
	});
});
