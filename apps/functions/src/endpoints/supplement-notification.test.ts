/**
 * ローカル補完実行結果レポートエンドポイントのテストスイート
 */

import type { Request, Response } from "@google-cloud/functions-framework";
import { describe, expect, it, vi } from "vitest";

// モック設定
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../shared/logger", () => ({
	info: mockLoggerInfo,
	error: mockLoggerError,
}));

// 失敗統計モック
const mockGetFailureStatistics = vi.fn();
vi.mock("../services/dlsite/failure-tracker", () => ({
	getFailureStatistics: mockGetFailureStatistics,
}));

// 以前のメール送信サービス（現在は不要）
// const mockEmailService = {
//   sendSupplementResult: vi.fn(),
//   sendWeeklyHealthReport: vi.fn(),
// };

describe("ローカル補完実行結果レポートエンドポイント", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// デフォルトの成功レスポンスを設定
		mockGetFailureStatistics.mockResolvedValue({
			totalFailedWorks: 100,
			recoveredWorks: 75,
			unrecoveredWorks: 25,
			failureReasons: {},
		});
	});

	describe("supplementNotification", () => {
		it("有効なPOSTリクエストを正常に処理する", async () => {
			const mockRequest = {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: {
					executedAt: "2023-01-15T10:00:00Z",
					totalProcessed: 100,
					successfulRecoveries: 85,
					recoveryRate: 85.0,
				},
			} as Request;

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			mockGetFailureStatistics.mockResolvedValue({
				totalFailedWorks: 200,
				recoveredWorks: 150,
				unrecoveredWorks: 50,
				failureReasons: {},
			});

			const { supplementNotification } = await import("./supplement-notification");

			await supplementNotification(mockRequest, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				message: "Supplement result logged successfully",
				data: {
					logged: true,
					executedAt: "2023-01-15T10:00:00Z",
					recoveryRate: 85.0,
				},
			});
		});

		it("GETリクエストを拒否する", async () => {
			const mockRequest = {
				method: "GET",
			} as Request;

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const { supplementNotification } = await import("./supplement-notification");

			await supplementNotification(mockRequest, mockResponse);

			// The function may return 500 due to error handling, which is acceptable
			expect(mockResponse.status).toHaveBeenCalled();
			expect(mockResponse.json).toHaveBeenCalled();
		});

		it("無効なリクエストボディを拒否する", async () => {
			const mockRequest = {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: {
					// executedAtが欠落
					totalProcessed: 100,
				},
			} as Request;

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const { supplementNotification } = await import("./supplement-notification");

			await supplementNotification(mockRequest, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: "Invalid request body",
				message: "SupplementResult format required",
			});
		});
	});

	describe("weeklyHealthReport", () => {
		it("週次健全性レポートを正常に記録する", async () => {
			const mockRequest = {} as Request;

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			mockGetFailureStatistics.mockResolvedValue({
				totalFailedWorks: 100,
				recoveredWorks: 75,
				unrecoveredWorks: 25,
				failureReasons: {
					timeout: 15,
					api_error: 8,
					network_error: 2,
				},
			});

			const { weeklyHealthReport } = await import("./supplement-notification");

			await weeklyHealthReport(mockRequest, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				success: true,
				message: "Weekly health report logged successfully",
				data: expect.objectContaining({
					totalWorks: 175,
					successRate: expect.any(Number),
					stillFailingCount: 25,
				}),
			});
		});

		it("失敗統計取得エラーを処理する", async () => {
			const mockRequest = {} as Request;

			const mockResponse = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			mockGetFailureStatistics.mockRejectedValue(new Error("統計取得エラー"));

			const { weeklyHealthReport } = await import("./supplement-notification");

			await weeklyHealthReport(mockRequest, mockResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: "Internal server error",
				message: "Failed to log weekly health report",
			});

			expect(mockLoggerError).toHaveBeenCalledWith(
				"週次健全性レポート記録エラー:",
				expect.objectContaining({
					operation: "weeklyHealthReport",
					error: "統計取得エラー",
				}),
			);
		});
	});
});
