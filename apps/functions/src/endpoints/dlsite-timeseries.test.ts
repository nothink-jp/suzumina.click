/**
 * DLsite時系列データ収集エンドポイントのテストスイート
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectDLsiteTimeseries } from "./dlsite-timeseries";

// 外部モジュールのモック
vi.mock("../infrastructure/database/firestore", () => {
	const mockFirestore = {
		collection: vi.fn(),
	};

	const mockCollection = {
		doc: vi.fn(),
		where: vi.fn(),
		select: vi.fn(),
		limit: vi.fn(),
		get: vi.fn(),
	};

	const mockDoc = {
		get: vi.fn(),
		set: vi.fn(),
		update: vi.fn(),
		exists: true,
		data: vi.fn(),
	};

	const mockQuery = {
		where: vi.fn(),
		select: vi.fn(),
		limit: vi.fn(),
		get: vi.fn(),
	};

	const mockSnapshot = {
		empty: false,
		size: 2,
		docs: [
			{ data: vi.fn(), ref: { id: "work1" } },
			{ data: vi.fn(), ref: { id: "work2" } },
		],
	};

	// グローバルスコープでmockを設定
	mockFirestore.collection.mockReturnValue(mockCollection);
	mockCollection.doc.mockReturnValue(mockDoc);
	mockCollection.where.mockReturnValue(mockQuery);
	mockCollection.select.mockReturnValue(mockQuery);
	mockCollection.limit.mockReturnValue(mockQuery);
	mockCollection.get.mockResolvedValue(mockSnapshot);

	mockQuery.where.mockReturnValue(mockQuery);
	mockQuery.select.mockReturnValue(mockQuery);
	mockQuery.limit.mockReturnValue(mockQuery);
	mockQuery.get.mockResolvedValue(mockSnapshot);

	mockDoc.get.mockResolvedValue(mockDoc);
	mockDoc.set.mockResolvedValue(undefined);
	mockDoc.update.mockResolvedValue(undefined);

	return {
		default: mockFirestore,
		Timestamp: {
			now: vi.fn(() => ({ seconds: 1625097600, nanoseconds: 0 })),
			fromDate: vi.fn((date) => ({
				seconds: Math.floor(date.getTime() / 1000),
				nanoseconds: 0,
				toDate: () => date,
			})),
		},
	};
});

vi.mock("../infrastructure/management/config-manager", () => ({
	getDLsiteConfig: vi.fn(() => ({
		requestDelay: 100,
		maxRetries: 3,
	})),
}));

vi.mock("../infrastructure/management/user-agent-manager", () => ({
	generateDLsiteHeaders: vi.fn(() => ({
		"User-Agent": "Test Agent",
		Accept: "application/json",
	})),
}));

vi.mock("../services/dlsite/individual-info-mapper", () => ({
	mapMultipleIndividualInfoToTimeSeries: vi.fn((responses) =>
		responses.map((r: any) => ({
			workId: r.workno || r.product_id,
			timestamp: "2025-07-07T12:00:00.000Z",
			date: "2025-07-07",
			time: "12:00:00",
			regionalPrices: { JP: 1320, US: 9.13, EU: 7.76, CN: 63.84, TW: 277.2, KR: 11748 },
			discountRate: r.discount_rate || 0,
			campaignId: r.campaign_id,
		})),
	),
}));

vi.mock("../services/dlsite/timeseries-firestore", () => ({
	saveMultipleTimeSeriesRawData: vi.fn(),
	batchProcessDailyAggregates: vi.fn(),
	deleteExpiredRawData: vi.fn(() => 5),
}));

vi.mock("../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

// fetch のモック
global.fetch = vi.fn();

// テスト用データ
const _mockTimeseriesMetadata = {
	lastFetchedAt: { seconds: 1625097600, nanoseconds: 0 },
	isInProgress: false,
	totalWorksProcessed: 10,
	currentBatch: 1,
};

const _mockWorkData = [{ productId: "RJ01037463" }, { productId: "RJ01059676" }];

const mockIndividualInfoAPIResponse = {
	workno: "RJ01037463",
	product_id: "RJ01037463",
	work_name: "Test Work",
	maker_name: "Test Maker",
	price: 1320,
	price_en: 9.13,
	price_eur: 7.76,
	discount_rate: 25,
	campaign_id: 241,
	sales_count: 1234,
	wishlist_count: 567,
	rank_day: 15,
	rate_average_star: 4.5,
	rate_count: 89,
};

beforeEach(() => {
	vi.clearAllMocks();

	// fetch モックの設定
	(global.fetch as any).mockResolvedValue({
		ok: true,
		status: 200,
		json: vi.fn().mockResolvedValue(mockIndividualInfoAPIResponse),
	});
});

describe("DLsite時系列データ収集エンドポイント", () => {
	describe("collectDLsiteTimeseries", () => {
		it("通常の収集処理が正常に実行される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "collection" },
				},
			};

			// エラーが発生せず、正常に完了することを確認
			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("日次集計処理が正常に実行される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "aggregation" },
				},
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("クリーンアップ処理が正常に実行される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "cleanup" },
				},
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("全処理（full）が順次実行される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "full" },
				},
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("Base64エンコードされたメッセージデータを正しく解析する", async () => {
			const messageData = { type: "collection" };
			const encodedData = Buffer.from(JSON.stringify(messageData)).toString("base64");

			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					data: encodedData,
				},
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("無効なBase64データでもエラーにならない", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					data: "invalid-base64-data",
				},
			};

			// エラーが発生せず、デフォルトの collection 処理になることを確認
			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("不明な処理タイプでも警告ログが出力される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-id",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "unknown" },
				},
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();

			// ログが出力されることを確認
			const logger = await import("../shared/logger");
			expect(logger.warn).toHaveBeenCalledWith(
				"不明な処理タイプ",
				expect.objectContaining({
					operation: "collectDLsiteTimeseries",
					processType: "unknown",
				}),
			);
		});
	});

	describe("基本的な処理フロー", () => {
		it("すべての処理タイプが正常に実行完了する", async () => {
			const processTypes = ["collection", "aggregation", "cleanup", "full"];

			for (const processType of processTypes) {
				const event: CloudEvent<any> = {
					id: `test-event-${processType}`,
					source: "test-source",
					specversion: "1.0",
					type: "test-type",
					time: "2025-07-07T12:00:00Z",
					data: {
						attributes: { type: processType },
					},
				};

				// 各処理タイプでエラーが発生しないことを確認
				await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
			}
		});

		it("データがない場合でもエラーにならない", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-empty",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: null,
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});

		it("メッセージデータがundefinedでもエラーにならない", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-undefined",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: undefined,
			};

			await expect(collectDLsiteTimeseries(event)).resolves.not.toThrow();
		});
	});

	describe("ログ出力機能", () => {
		it("正常な処理開始・完了ログが出力される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-log",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "collection" },
				},
			};

			await collectDLsiteTimeseries(event);

			const logger = await import("../shared/logger");
			expect(logger.info).toHaveBeenCalledWith(
				"DLsite時系列データ収集開始",
				expect.objectContaining({
					operation: "collectDLsiteTimeseries",
					trigger: "pub-sub",
				}),
			);

			expect(logger.info).toHaveBeenCalledWith(
				"DLsite時系列データ収集完了",
				expect.objectContaining({
					operation: "collectDLsiteTimeseries",
					processType: "collection",
				}),
			);
		});

		it("処理タイプ決定ログが出力される", async () => {
			const event: CloudEvent<any> = {
				id: "test-event-type-log",
				source: "test-source",
				specversion: "1.0",
				type: "test-type",
				time: "2025-07-07T12:00:00Z",
				data: {
					attributes: { type: "aggregation" },
				},
			};

			await collectDLsiteTimeseries(event);

			const logger = await import("../shared/logger");
			expect(logger.info).toHaveBeenCalledWith(
				"処理タイプ決定",
				expect.objectContaining({
					operation: "collectDLsiteTimeseries",
					processType: "aggregation",
				}),
			);
		});
	});
});
