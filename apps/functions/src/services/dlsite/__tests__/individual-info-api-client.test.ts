/**
 * Individual Info API Client テスト
 */

import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	batchFetchIndividualInfo,
	fetchIndividualWorkInfo,
	type IndividualInfoAPIOptions,
} from "../individual-info-api-client";

// モックの設定
vi.mock("../../../infrastructure/management/user-agent-manager", () => ({
	generateDLsiteHeaders: vi.fn(() => ({
		"User-Agent": "Mozilla/5.0 (Test)",
		"Accept-Language": "ja-JP,ja;q=0.9",
	})),
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

import * as logger from "../../../shared/logger";

// グローバルfetchのモック
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe("Individual Info API Client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("fetchIndividualWorkInfo", () => {
		const mockWorkData = {
			workno: "RJ123456",
			product_id: "RJ123456",
			work_name: "テスト作品",
			circle: "テストサークル",
			price: "1000",
		};

		it("正常なAPIレスポンスで作品データを取得できる", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData])),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toEqual(mockWorkData);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.dlsite.com/maniax/api/=/product.json?workno=RJ123456",
				expect.objectContaining({
					method: "GET",
					headers: expect.any(Object),
				}),
			);
		});

		it("404エラーの場合nullを返す", async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				text: vi.fn().mockResolvedValue("Not Found"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ999999");

			expect(result).toBeNull();
		});

		it("403エラーの場合例外を投げる", async () => {
			const mockResponse = {
				ok: false,
				status: 403,
				text: vi.fn().mockResolvedValue("Forbidden"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow(
				"API access denied for RJ123456",
			);
		});

		it("500エラーの場合例外を投げる", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: vi.fn().mockResolvedValue("Server Error"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow(
				"API request failed: 500 Internal Server Error",
			);
		});

		it("JSONパースエラーの場合nullを返す", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue("invalid json"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toBeNull();
		});

		it("空配列レスポンスの場合nullを返す", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue("[]"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toBeNull();
		});

		it("非配列レスポンスの場合nullを返す", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue('{"error": "invalid"}'),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toBeNull();
		});

		it("worknoもproduct_idもない場合nullを返す", async () => {
			const invalidData = {
				work_name: "テスト作品",
				circle: "テストサークル",
			};
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([invalidData])),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toBeNull();
		});

		it("ネットワークエラーの場合例外を投げる", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow();
		});
	});

	describe("batchFetchIndividualInfo", () => {
		const mockWorkData1 = {
			workno: "RJ123456",
			product_id: "RJ123456",
			work_name: "テスト作品1",
		};
		const mockWorkData2 = {
			workno: "RJ123457",
			product_id: "RJ123457",
			work_name: "テスト作品2",
		};

		it("複数の作品データを正常に取得できる", async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
					headers: new Headers(),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData2])),
					headers: new Headers(),
				});

			const result = await batchFetchIndividualInfo(["RJ123456", "RJ123457"]);

			expect(result.results.size).toBe(2);
			expect(result.results.get("RJ123456")).toEqual(mockWorkData1);
			expect(result.results.get("RJ123457")).toEqual(mockWorkData2);
			expect(result.failedWorkIds).toHaveLength(0);
		});

		it("一部失敗した場合でも成功分を返す", async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
					headers: new Headers(),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					text: vi.fn().mockResolvedValue("Not Found"),
					headers: new Headers(),
				});

			const result = await batchFetchIndividualInfo(["RJ123456", "RJ999999"]);

			expect(result.results.size).toBe(1);
			expect(result.results.get("RJ123456")).toEqual(mockWorkData1);
			expect(result.failedWorkIds).toEqual(["RJ999999"]);
		});

		it("バッチサイズとディレイオプションが正しく動作する", async () => {
			const workIds = ["RJ123456", "RJ123457", "RJ123458"];

			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
				headers: new Headers(),
			});

			const startTime = Date.now();
			const result = await batchFetchIndividualInfo(workIds, {
				maxConcurrent: 2,
				batchDelay: 100,
			});
			const duration = Date.now() - startTime;

			expect(result.results.size).toBe(3);
			// バッチ間の待機時間を考慮して最低限の時間が経過していることを確認
			expect(duration).toBeGreaterThan(90);
		});

		it("空の配列を渡した場合空の結果を返す", async () => {
			const result = await batchFetchIndividualInfo([]);

			expect(result.results.size).toBe(0);
			expect(result.failedWorkIds).toHaveLength(0);
		});

		it("バッチ処理でエラーが発生した場合失敗として記録される", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			const result = await batchFetchIndividualInfo(["RJ123456"]);

			expect(result.results.size).toBe(0);
			expect(result.failedWorkIds).toEqual(["RJ123456"]);
		});
	});
});
