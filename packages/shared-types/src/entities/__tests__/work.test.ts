import { describe, expect, it } from "vitest";
import {
	convertToFrontendWork,
	deserializeWorkForRCC,
	deserializeWorkListResult,
	type FrontendDLsiteWorkData,
	FrontendDLsiteWorkSchema,
	LocalePriceSchema,
	type OptimizedFirestoreDLsiteWorkData,
	OptimizedFirestoreDLsiteWorkSchema,
	type PriceInfo,
	PriceInfoSchema,
	RankingInfoSchema,
	RatingDetailSchema,
	type RatingInfo,
	RatingInfoSchema,
	SalesStatusSchema,
	type SampleImage,
	SampleImageSchema,
	serializeWorkForRSC,
	serializeWorkListResult,
	WorkCategorySchema,
	type WorkListResult,
	WorkListResultSchema,
	WorkPaginationParamsSchema,
} from "../work";

// テスト用のデータ定義
const validPriceInfo: PriceInfo = {
	current: 1100,
	original: 1320,
	currency: "JPY",
	discount: 20,
	point: 110,
};

const validRatingInfo: RatingInfo = {
	stars: 4.5,
	count: 125,
	reviewCount: 89,
	ratingDetail: [
		{ review_point: 5, count: 75, ratio: 60 },
		{ review_point: 4, count: 30, ratio: 24 },
		{ review_point: 3, count: 15, ratio: 12 },
		{ review_point: 2, count: 3, ratio: 2 },
		{ review_point: 1, count: 2, ratio: 2 },
	],
	averageDecimal: 4.53,
};

const validSampleImages: SampleImage[] = [
	{
		thumb: "https://example.com/sample1.jpg",
		width: 320,
		height: 240,
	},
	{
		thumb: "https://example.com/sample2.jpg",
		width: 320,
		height: 240,
	},
];

const validFirestoreWork: OptimizedFirestoreDLsiteWorkData = {
	id: "work-123",
	productId: "RJ236867",
	title: "夏の苦い思い出",
	circle: "テストサークル",
	voiceActors: ["涼花みなせ", "他の声優"],
	scenario: ["テストシナリオライター"],
	illustration: ["テストイラストレーター"],
	music: ["テスト作曲家"],
	author: [],
	description: "テスト作品の説明文です。",
	category: "SOU",
	workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ236867.html",
	thumbnailUrl: "https://example.com/thumbnail.jpg",
	price: validPriceInfo,
	// userEvaluationCountは削除 - OptimizedFirestoreDLsiteWorkDataに存在しない
	rating: validRatingInfo,
	ageRating: "R-18",
	genres: ["耳舐め", "バイノーラル", "癒し"],
	sampleImages: validSampleImages,
	lastFetchedAt: "2023-01-02T12:00:00Z",
	createdAt: "2023-01-01T10:00:00Z",
	updatedAt: "2023-01-02T12:00:00Z",
	// OptimizedFirestoreDLsiteWorkDataの必須フィールド
	releaseDate: "2023-01-01",
	releaseDateISO: "2023-01-01",
	releaseDateDisplay: "2023年01月01日",
	dataSources: {
		searchResult: {
			lastFetched: "2023-01-02T12:00:00Z",
			genres: ["ASMR", "癒し"],
			basicInfo: {} as any,
		},
	},
};

const validFrontendWork: FrontendDLsiteWorkData = {
	...validFirestoreWork,
	displayPrice: "1,100円（元：1,320円）",
	discountText: "20%OFF",
	ratingText: "★4.5 (125件)",
	relativeUrl: "/maniax/work/=/product_id/RJ236867.html",
	createdAtISO: "2023-01-01T10:00:00Z",
	lastFetchedAtISO: "2023-01-02T12:00:00Z",
	updatedAtISO: "2023-01-02T12:00:00Z",
	// convertToFrontendWorkで追加されるフィールド
};

describe("WorkCategorySchema", () => {
	it("有効な作品カテゴリを検証できる", () => {
		const validCategories = [
			"ADV",
			"SOU",
			"RPG",
			"MOV",
			"MNG",
			"GAM",
			"CG",
			"TOL",
			"ET3",
			"SLN",
			"ACN",
			"PZL",
			"QIZ",
			"TBL",
			"DGT",
			"etc",
		];

		validCategories.forEach((category) => {
			expect(WorkCategorySchema.safeParse(category).success).toBe(true);
		});
	});

	it("無効な作品カテゴリでエラーが発生する", () => {
		expect(WorkCategorySchema.safeParse("INVALID").success).toBe(false);
		expect(WorkCategorySchema.safeParse(123).success).toBe(false);
		expect(WorkCategorySchema.safeParse(null).success).toBe(false);
	});
});

describe("PriceInfoSchema", () => {
	it("有効な価格情報を検証できる", () => {
		const result = PriceInfoSchema.safeParse(validPriceInfo);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.current).toBe(1100);
			expect(result.data.original).toBe(1320);
			expect(result.data.discount).toBe(20);
			expect(result.data.currency).toBe("JPY");
		}
	});

	it("最小限の価格情報も有効である", () => {
		const minimalPrice = {
			current: 800,
		};

		const result = PriceInfoSchema.safeParse(minimalPrice);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.currency).toBe("JPY"); // デフォルト値
		}
	});

	it("負の価格でエラーが発生する", () => {
		const invalidPrice = {
			current: -100,
		};

		const result = PriceInfoSchema.safeParse(invalidPrice);
		expect(result.success).toBe(false);
	});

	it("割引率が100を超える場合エラーが発生する", () => {
		const invalidDiscount = {
			current: 500,
			discount: 150,
		};

		const result = PriceInfoSchema.safeParse(invalidDiscount);
		expect(result.success).toBe(false);
	});
});

describe("RatingDetailSchema", () => {
	it("有効な評価詳細を検証できる", () => {
		const validDetail = {
			review_point: 5,
			count: 100,
			ratio: 80,
		};

		const result = RatingDetailSchema.safeParse(validDetail);
		expect(result.success).toBe(true);
	});

	it("評価ポイントが範囲外でエラーが発生する", () => {
		const invalidDetail = {
			review_point: 6, // 1-5の範囲外
			count: 100,
			ratio: 80,
		};

		const result = RatingDetailSchema.safeParse(invalidDetail);
		expect(result.success).toBe(false);
	});

	it("割合が100を超える場合エラーが発生する", () => {
		const invalidDetail = {
			review_point: 5,
			count: 100,
			ratio: 150, // 100を超過
		};

		const result = RatingDetailSchema.safeParse(invalidDetail);
		expect(result.success).toBe(false);
	});
});

describe("RatingInfoSchema", () => {
	it("有効な評価情報を検証できる", () => {
		const result = RatingInfoSchema.safeParse(validRatingInfo);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.stars).toBe(4.5);
			expect(result.data.count).toBe(125);
			expect(result.data.ratingDetail).toHaveLength(5);
		}
	});

	it("最小限の評価情報も有効である", () => {
		const minimalRating = {
			stars: 3.0,
			count: 50,
		};

		const result = RatingInfoSchema.safeParse(minimalRating);
		expect(result.success).toBe(true);
	});

	it("星評価が範囲外でエラーが発生する", () => {
		const invalidRating = {
			stars: 6.0, // 0-5の範囲外
			count: 50,
		};

		const result = RatingInfoSchema.safeParse(invalidRating);
		expect(result.success).toBe(false);
	});
});

describe("SampleImageSchema", () => {
	it("有効なサンプル画像情報を検証できる", () => {
		const result = SampleImageSchema.safeParse(validSampleImages[0]);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.thumb).toBe("https://example.com/sample1.jpg");
			expect(result.data.width).toBe(320);
			expect(result.data.height).toBe(240);
		}
	});

	it("URLのみでも有効である", () => {
		const minimalImage = {
			thumb: "https://example.com/sample.jpg",
		};

		const result = SampleImageSchema.safeParse(minimalImage);
		expect(result.success).toBe(true);
	});

	it("無効なURLでエラーが発生する", () => {
		const invalidImage = {
			thumb: "invalid-url",
		};

		const result = SampleImageSchema.safeParse(invalidImage);
		expect(result.success).toBe(false);
	});
});

describe("RankingInfoSchema", () => {
	it("有効なランキング情報を検証できる", () => {
		const validRanking = {
			term: "day" as const,
			category: "voice",
			rank: 1,
			rank_date: "2023-01-01",
		};

		const result = RankingInfoSchema.safeParse(validRanking);
		expect(result.success).toBe(true);
	});

	it("無効な期間でエラーが発生する", () => {
		const invalidRanking = {
			term: "invalid",
			category: "voice",
			rank: 1,
			rank_date: "2023-01-01",
		};

		const result = RankingInfoSchema.safeParse(invalidRanking);
		expect(result.success).toBe(false);
	});
});

describe("LocalePriceSchema", () => {
	it("有効な多通貨価格情報を検証できる", () => {
		const validLocalePrice = {
			currency: "USD",
			price: 12.99,
			priceString: "$12.99",
		};

		const result = LocalePriceSchema.safeParse(validLocalePrice);
		expect(result.success).toBe(true);
	});

	it("負の価格でエラーが発生する", () => {
		const invalidPrice = {
			currency: "USD",
			price: -5.0,
			priceString: "-$5.00",
		};

		const result = LocalePriceSchema.safeParse(invalidPrice);
		expect(result.success).toBe(false);
	});
});

describe("SalesStatusSchema", () => {
	it("有効な販売状態を検証できる", () => {
		const validStatus = {
			isSale: true,
			onSale: 1,
			isDiscount: true,
			isPointup: false,
			isFree: false,
			isRental: false,
			isSoldOut: false,
		};

		const result = SalesStatusSchema.safeParse(validStatus);
		expect(result.success).toBe(true);
	});

	it("空のオブジェクトも有効である", () => {
		const result = SalesStatusSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

describe("OptimizedFirestoreDLsiteWorkSchema", () => {
	it("有効なFirestore作品データを検証できる", () => {
		const result = OptimizedFirestoreDLsiteWorkSchema.safeParse(validFirestoreWork);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.productId).toBe("RJ236867");
			expect(result.data.title).toBe("夏の苦い思い出");
			expect(result.data.voiceActors).toContain("涼花みなせ");
			expect(result.data.price.current).toBe(1100);
		}
	});

	it("必須フィールドが不足している場合エラーが発生する", () => {
		const invalidData = { ...validFirestoreWork };
		(invalidData as any).productId = undefined;

		const result = OptimizedFirestoreDLsiteWorkSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("無効な日時形式でエラーが発生する", () => {
		const invalidData = {
			...validFirestoreWork,
			createdAt: "invalid-date",
		};

		const result = OptimizedFirestoreDLsiteWorkSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("空の文字列のタイトルでエラーが発生する", () => {
		const invalidData = {
			...validFirestoreWork,
			title: "",
		};

		const result = OptimizedFirestoreDLsiteWorkSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});
});

describe("FrontendDLsiteWorkSchema", () => {
	it("有効なフロントエンド作品データを検証できる", () => {
		const result = FrontendDLsiteWorkSchema.safeParse(validFrontendWork);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.displayPrice).toBe("1,100円（元：1,320円）");
			expect(result.data.discountText).toBe("20%OFF");
			expect(result.data.ratingText).toBe("★4.5 (125件)");
			expect(result.data.relativeUrl).toBe("/maniax/work/=/product_id/RJ236867.html");
		}
	});

	it("フロントエンド固有フィールドが必須である", () => {
		const dataWithoutFrontendFields = { ...validFirestoreWork };

		const result = FrontendDLsiteWorkSchema.safeParse(dataWithoutFrontendFields);
		expect(result.success).toBe(false);
	});
});

describe("WorkListResultSchema", () => {
	it("有効な作品リスト結果を検証できる", () => {
		const validResult: WorkListResult = {
			works: [validFrontendWork],
			hasMore: true,
			lastWork: validFrontendWork,
			totalCount: 100,
		};

		const result = WorkListResultSchema.safeParse(validResult);
		expect(result.success).toBe(true);
	});

	it("空の作品リストも有効である", () => {
		const emptyResult = {
			works: [],
			hasMore: false,
		};

		const result = WorkListResultSchema.safeParse(emptyResult);
		expect(result.success).toBe(true);
	});
});

describe("WorkPaginationParamsSchema", () => {
	it("有効なページネーションパラメータを検証できる", () => {
		const validParams = {
			limit: 20,
			startAfter: "RJ236867",
			author: "涼花みなせ",
			category: "SOU" as const,
		};

		const result = WorkPaginationParamsSchema.safeParse(validParams);
		expect(result.success).toBe(true);
	});

	it("limitが負の数でエラーが発生する", () => {
		const invalidParams = {
			limit: -10,
		};

		const result = WorkPaginationParamsSchema.safeParse(invalidParams);
		expect(result.success).toBe(false);
	});
});

describe("convertToFrontendWork", () => {
	it("Firestoreデータを正しくフロントエンド形式に変換できる", () => {
		const result = convertToFrontendWork(validFirestoreWork);

		expect(result.id).toBe(validFirestoreWork.id);
		expect(result.productId).toBe(validFirestoreWork.productId);
		expect(result.displayPrice).toBe("1100円（元：1320円）");
		expect(result.discountText).toBe("20%OFF");
		expect(result.ratingText).toBe("★4.5 (125件)");
		expect(result.relativeUrl).toBe("/maniax/work/=/product_id/RJ236867.html");
	});

	it("割引なしの価格を正しく表示できる", () => {
		const workWithoutDiscount = {
			...validFirestoreWork,
			price: {
				current: 1000,
				currency: "JPY",
			},
		};

		const result = convertToFrontendWork(workWithoutDiscount);
		expect(result.displayPrice).toBe("1000円");
		expect(result.discountText).toBeUndefined();
	});

	it("評価なしの作品も正しく処理できる", () => {
		const workWithoutRating = { ...validFirestoreWork };
		(workWithoutRating as any).rating = undefined;

		const result = convertToFrontendWork(workWithoutRating);
		expect(result.ratingText).toBeUndefined();
	});

	it("スキーマ検証エラー時にフォールバックデータを返す", () => {
		const invalidData = {
			...validFirestoreWork,
			// 必須フィールドを削除してエラーを発生させる
			title: "", // 空文字はminLength(1)でエラー
		};

		const result = convertToFrontendWork(invalidData);

		// フォールバックデータが返されることを確認
		expect(result.id).toBe(invalidData.id);
		expect(result.productId).toBe(invalidData.productId);
		expect(result.title).toBe(""); // フォールバック時は元のtitleがそのまま保持される
		expect(result.circle).toBe(invalidData.circle);
		expect(result.displayPrice).toBe("1100円（元：1320円）"); // 割引情報が含まれるため
		expect(result.relativeUrl).toBe("/maniax/work/=/product_id/RJ236867.html");
		expect(result.createdAtISO).toBe(invalidData.createdAt);
		expect(result.lastFetchedAtISO).toBe(invalidData.lastFetchedAt);
		expect(result.updatedAtISO).toBe(invalidData.updatedAt);
	});
});

describe("serializeWorkForRSC/deserializeWorkForRCC", () => {
	it("フロントエンドデータを正しくシリアライズ・デシリアライズできる", () => {
		const serialized = serializeWorkForRSC(validFrontendWork);
		expect(typeof serialized).toBe("string");

		const deserialized = deserializeWorkForRCC(serialized);
		// 主要なフィールドが正しく保持されていることを確認
		expect(deserialized.id).toBe(validFrontendWork.id);
		expect(deserialized.productId).toBe(validFrontendWork.productId);
		expect(deserialized.title).toBe(validFrontendWork.title);
		expect(deserialized.displayPrice).toBe(validFrontendWork.displayPrice);
		expect(deserialized.discountText).toBe(validFrontendWork.discountText);
		expect(deserialized.ratingText).toBe(validFrontendWork.ratingText);
		expect(deserialized.relativeUrl).toBe(validFrontendWork.relativeUrl);
		// OptimizedFirestoreDLsiteWorkDataから継承されたフィールドも含まれる
		expect(deserialized.dataSources).toEqual(validFrontendWork.dataSources);
	});

	it("不正なJSON文字列でエラーが発生する", () => {
		const invalidJson = "invalid json";

		expect(() => {
			deserializeWorkForRCC(invalidJson);
		}).toThrow("データの形式が無効です");
	});

	it("スキーマ検証エラーでエラーが発生する", () => {
		const invalidData = {
			id: "test",
			// その他の必須フィールドが不足
		};

		const serialized = JSON.stringify(invalidData);

		expect(() => {
			deserializeWorkForRCC(serialized);
		}).toThrow("データの形式が無効です");
	});
});

describe("serializeWorkListResult/deserializeWorkListResult", () => {
	it("リスト結果を正しくシリアライズ・デシリアライズできる", () => {
		const validResult: WorkListResult = {
			works: [validFrontendWork],
			hasMore: true,
			lastWork: validFrontendWork,
			totalCount: 50,
		};

		const serialized = serializeWorkListResult(validResult);
		expect(typeof serialized).toBe("string");

		const deserialized = deserializeWorkListResult(serialized);

		// 基本構造が正しく保持されていることを確認
		expect(deserialized.works).toHaveLength(1);
		expect(deserialized.hasMore).toBe(true);
		expect(deserialized.totalCount).toBe(50);

		// 作品データの主要フィールドが正しく保持されていることを確認
		const deserializedWork = deserialized.works[0];
		expect(deserializedWork).toBeDefined();
		expect(deserializedWork?.id).toBe(validFrontendWork.id);
		expect(deserializedWork?.productId).toBe(validFrontendWork.productId);
		expect(deserializedWork?.title).toBe(validFrontendWork.title);
		expect(deserializedWork?.displayPrice).toBe(validFrontendWork.displayPrice);
		expect(deserializedWork?.discountText).toBe(validFrontendWork.discountText);
		expect(deserializedWork?.ratingText).toBe(validFrontendWork.ratingText);

		// lastWorkも同様に検証
		expect(deserialized.lastWork?.id).toBe(validFrontendWork.id);
		expect(deserialized.lastWork?.productId).toBe(validFrontendWork.productId);
	});

	it("空のリスト結果も正しく処理できる", () => {
		const emptyResult: WorkListResult = {
			works: [],
			hasMore: false,
			totalCount: 0,
		};

		const serialized = serializeWorkListResult(emptyResult);
		const deserialized = deserializeWorkListResult(serialized);
		expect(deserialized).toEqual(emptyResult);
	});

	it("不正なデータでフォールバック値を返す", () => {
		const invalidJson = "invalid json";

		const result = deserializeWorkListResult(invalidJson);
		expect(result).toEqual({ works: [], hasMore: false });
	});

	it("スキーマ検証エラーでフォールバック値を返す", () => {
		const invalidData = {
			works: "not-an-array",
			hasMore: "not-a-boolean",
		};

		const serialized = JSON.stringify(invalidData);
		const result = deserializeWorkListResult(serialized);
		expect(result).toEqual({ works: [], hasMore: false });
	});

	it("大きなリストも正しく処理できる", () => {
		const largeList: WorkListResult = {
			works: Array(50).fill(validFrontendWork),
			hasMore: true,
			lastWork: validFrontendWork,
			totalCount: 500,
		};

		const serialized = serializeWorkListResult(largeList);
		const deserialized = deserializeWorkListResult(serialized);
		expect(deserialized.works.length).toBe(50);
		expect(deserialized.hasMore).toBe(true);
		expect(deserialized.totalCount).toBe(500);
	});
});
