/**
 * Parser Config のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getCategoryMapping,
	getFieldConfig,
	getParserConfigManager,
	ParserConfigManager,
} from "./parser-config";

// loggerのモック
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

describe("ParserConfigManager", () => {
	let configManager: ParserConfigManager;

	beforeEach(() => {
		// シングルトンインスタンスをリセット
		(ParserConfigManager as any).instance = undefined;
		configManager = ParserConfigManager.getInstance();
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = ParserConfigManager.getInstance();
			const instance2 = ParserConfigManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("フィールド設定取得", () => {
		it("productId設定を取得する", () => {
			const config = configManager.getFieldConfig("productId");

			expect(config).toBeDefined();
			expect(config.selectors).toBeDefined();
			expect(config.validation).toBeDefined();
			expect(config.selectors.primary).toContain("a[href*='/product_id/']");
			expect(config.validation.required).toBe(true);
			expect(config.validation.pattern).toEqual(/^RJ\d{6,8}$/);
		});

		it("title設定を取得する", () => {
			const config = configManager.getFieldConfig("title");

			expect(config).toBeDefined();
			expect(config.selectors.primary).toContain(".work_name a");
			expect(config.validation.required).toBe(true);
		});

		it("category設定を取得する", () => {
			const config = configManager.getFieldConfig("category");

			expect(config).toBeDefined();
			expect(config.selectors.primary).toContain(".work_category");
			expect(config.validation.required).toBe(true);
		});

		it("価格関連設定を取得する", () => {
			const currentPriceConfig = configManager.getFieldConfig("currentPrice");
			const originalPriceConfig = configManager.getFieldConfig("originalPrice");

			expect(currentPriceConfig).toBeDefined();
			expect(originalPriceConfig).toBeDefined();
			expect(currentPriceConfig.validation.required).toBe(true);
			expect(originalPriceConfig.validation.required).toBe(false);
		});
	});

	describe("カテゴリマッピング", () => {
		it("カテゴリマッピングを取得する", () => {
			const mapping = configManager.getCategoryMapping();

			expect(mapping).toBeDefined();
			expect(mapping.type_ADV).toBe("ADV");
			expect(mapping.type_SOU).toBe("SOU");
			expect(mapping.type_RPG).toBe("RPG");
			expect(mapping.type_MOV).toBe("MOV");
			expect(mapping.type_MNG).toBe("MNG");
			expect(mapping.type_GAM).toBe("GAM");
		});

		it("すべてのカテゴリが定義されている", () => {
			const mapping = configManager.getCategoryMapping();

			const expectedCategories = [
				"type_ADV",
				"type_SOU",
				"type_RPG",
				"type_MOV",
				"type_MNG",
				"type_GAM",
				"type_CG",
				"type_TOL",
				"type_ET3",
				"type_SLN",
				"type_ACN",
				"type_PZL",
				"type_QIZ",
				"type_TBL",
				"type_DGT",
			];

			for (const category of expectedCategories) {
				expect(mapping[category]).toBeDefined();
				expect(typeof mapping[category]).toBe("string");
			}
		});
	});

	describe("解析結果記録", () => {
		it("成功結果を記録する", () => {
			configManager.recordParsingResult("productId", true);
			configManager.recordParsingResult("productId", true);
			configManager.recordParsingResult("productId", false);

			const stats = configManager.getStats();
			expect(stats.productId).toBeDefined();
			expect(stats.productId.successRate).toBeCloseTo(0.667, 2); // 2/3
			expect(stats.productId.total).toBe(3);
		});

		it("失敗結果を記録する", () => {
			configManager.recordParsingResult("title", false);
			configManager.recordParsingResult("title", false);
			configManager.recordParsingResult("title", true);

			const stats = configManager.getStats();
			expect(stats.title).toBeDefined();
			expect(stats.title.successRate).toBeCloseTo(0.333, 2); // 1/3
			expect(stats.title.total).toBe(3);
		});

		it("複数フィールドの統計を管理する", () => {
			configManager.recordParsingResult("productId", true);
			configManager.recordParsingResult("title", false);
			configManager.recordParsingResult("category", true);

			const stats = configManager.getStats();
			expect(Object.keys(stats)).toContain("productId");
			expect(Object.keys(stats)).toContain("title");
			expect(Object.keys(stats)).toContain("category");
		});
	});

	describe("設定検証", () => {
		it("すべてのフィールド設定が有効", () => {
			const config = (configManager as any).config;

			expect(config.version).toBeDefined();
			expect(config.lastUpdated).toBeDefined();
			expect(config.enabled).toBe(true);
			expect(config.fields).toBeDefined();
			expect(config.categoryMapping).toBeDefined();

			// 各フィールド設定の検証
			const fieldNames = [
				"productId",
				"title",
				"circle",
				"author",
				"category",
				"workUrl",
				"thumbnailUrl",
				"currentPrice",
				"originalPrice",
				"discount",
				"point",
				"stars",
				"ratingCount",
				"reviewCount",
				"salesCount",
				"ageRating",
				"tags",
				"description",
			];

			for (const fieldName of fieldNames) {
				const fieldConfig = config.fields[fieldName];
				expect(fieldConfig).toBeDefined();
				expect(fieldConfig.selectors).toBeDefined();
				expect(fieldConfig.validation).toBeDefined();
				expect(fieldConfig.selectors.primary).toBeDefined();
				expect(Array.isArray(fieldConfig.selectors.primary)).toBe(true);
				expect(fieldConfig.selectors.minSuccessRate).toBeGreaterThan(0);
				expect(fieldConfig.selectors.minSuccessRate).toBeLessThanOrEqual(1);
			}
		});

		it("必須フィールドが正しく設定されている", () => {
			const requiredFields = [
				"productId",
				"title",
				"circle",
				"category",
				"workUrl",
				"currentPrice",
			];

			for (const fieldName of requiredFields) {
				const config = configManager.getFieldConfig(fieldName as any);
				expect(config.validation.required).toBe(true);
			}
		});

		it("オプショナルフィールドが正しく設定されている", () => {
			const optionalFields = ["author", "originalPrice", "discount", "point", "stars"];

			for (const fieldName of optionalFields) {
				const config = configManager.getFieldConfig(fieldName as any);
				expect(config.validation.required).toBe(false);
			}
		});
	});

	describe("セレクター設定", () => {
		it("セレクターの優先順位が正しい", () => {
			const config = configManager.getFieldConfig("productId");

			expect(config.selectors.primary.length).toBeGreaterThan(0);
			expect(config.selectors.secondary.length).toBeGreaterThan(0);
			expect(config.selectors.fallback.length).toBeGreaterThan(0);
		});

		it("成功率閾値が適切", () => {
			const importantFields = ["productId", "title", "workUrl"];

			for (const fieldName of importantFields) {
				const config = configManager.getFieldConfig(fieldName as any);
				expect(config.selectors.minSuccessRate).toBeGreaterThanOrEqual(0.8);
			}
		});
	});

	describe("バリデーション設定", () => {
		it("productIdのパターンバリデーション", () => {
			const config = configManager.getFieldConfig("productId");
			const pattern = config.validation.pattern;

			expect(pattern).toBeDefined();
			expect(pattern!.test("RJ123456")).toBe(true);
			expect(pattern!.test("RJ12345678")).toBe(true);
			expect(pattern!.test("RJ12345")).toBe(false);
			expect(pattern!.test("VJ123456")).toBe(false);
		});

		it("workUrlのパターンバリデーション", () => {
			const config = configManager.getFieldConfig("workUrl");
			const pattern = config.validation.pattern;

			expect(pattern).toBeDefined();
			expect(pattern!.test("https://www.dlsite.com/work")).toBe(true);
			expect(pattern!.test("http://www.dlsite.com/work")).toBe(true);
			expect(pattern!.test("www.dlsite.com/work")).toBe(false);
		});

		it("カスタムバリデーター", () => {
			const config = configManager.getFieldConfig("productId");
			const validator = config.validation.customValidator;

			expect(validator).toBeDefined();
			expect(validator!("RJ12345678")).toBe(true);
			expect(validator!("RJ123456")).toBe(true); // 8文字なので true
			expect(validator!("RJ12345")).toBe(false); // 7文字なので false
		});
	});
});

describe("ヘルパー関数", () => {
	beforeEach(() => {
		(ParserConfigManager as any).instance = undefined;
	});

	describe("getParserConfigManager", () => {
		it("シングルトンインスタンスを返す", () => {
			const manager1 = getParserConfigManager();
			const manager2 = getParserConfigManager();

			expect(manager1).toBe(manager2);
			expect(manager1).toBeInstanceOf(ParserConfigManager);
		});
	});

	describe("getFieldConfig", () => {
		it("フィールド設定を取得する", () => {
			const config = getFieldConfig("productId");

			expect(config).toBeDefined();
			expect(config.selectors).toBeDefined();
			expect(config.validation).toBeDefined();
		});
	});

	describe("getCategoryMapping", () => {
		it("カテゴリマッピングを取得する", () => {
			const mapping = getCategoryMapping();

			expect(mapping).toBeDefined();
			expect(mapping.type_ADV).toBe("ADV");
		});
	});
});

describe("デフォルト値とトランスフォーマー", () => {
	let configManager: ParserConfigManager;

	beforeEach(() => {
		(ParserConfigManager as any).instance = undefined;
		configManager = ParserConfigManager.getInstance();
	});

	it("currentPriceにトランスフォーマーが設定されている", () => {
		const config = configManager.getFieldConfig("currentPrice");
		expect(config.transformer).toBeDefined();

		// トランスフォーマーの動作テスト
		const transformer = config.transformer!;
		expect(transformer("1,000円")).toBe(1000);
	});

	it("originalPriceにトランスフォーマーが設定されている", () => {
		const config = configManager.getFieldConfig("originalPrice");
		expect(config.transformer).toBeDefined();

		// トランスフォーマーの動作テスト
		const transformer = config.transformer!;
		expect(transformer("1,000円")).toBe(1000);
		expect(transformer("500")).toBe(500);
	});

	it("discountにトランスフォーマーが設定されている", () => {
		const config = configManager.getFieldConfig("discount");
		expect(config.transformer).toBeDefined();

		const transformer = config.transformer!;
		expect(transformer("20%OFF")).toBe(20);
		expect(transformer("50% OFF")).toBe(50);
	});
});

describe("統計リセット機能", () => {
	let configManager: ParserConfigManager;

	beforeEach(() => {
		(ParserConfigManager as any).instance = undefined;
		configManager = ParserConfigManager.getInstance();
	});

	it("統計をリセットできる", () => {
		// 統計データを追加
		configManager.recordParsingResult("productId", true);
		configManager.recordParsingResult("title", false);

		// リセット前の確認
		let stats = configManager.getStats();
		expect(Object.keys(stats).length).toBeGreaterThan(0);

		// リセット実行
		(configManager as any).stats.clear();

		// リセット後の確認
		stats = configManager.getStats();
		expect(Object.keys(stats).length).toBe(0);
	});
});

describe("エラーハンドリング", () => {
	let configManager: ParserConfigManager;

	beforeEach(() => {
		(ParserConfigManager as any).instance = undefined;
		configManager = ParserConfigManager.getInstance();
	});

	it("存在しないフィールドでもエラーにならない", () => {
		expect(() => {
			configManager.recordParsingResult("nonExistentField", true);
		}).not.toThrow();
	});

	it("不正な統計値でもエラーにならない", () => {
		expect(() => {
			configManager.recordParsingResult("productId", true);
			// statsを直接操作して不正な値を設定
			const stats = (configManager as any).stats;
			stats.set("productId", { success: -1, total: 0 });
			configManager.getStats();
		}).not.toThrow();
	});
});
