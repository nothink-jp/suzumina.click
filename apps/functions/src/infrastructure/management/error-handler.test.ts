/**
 * Error Handler のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ErrorHandler,
	ErrorSeverity,
	ErrorType,
	getErrorHandler,
	handleError,
	RecoveryStrategy,
} from "./error-handler";

// loggerのモック
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

describe("ErrorHandler", () => {
	let errorHandler: ErrorHandler;

	beforeEach(() => {
		// シングルトンインスタンスをリセット
		(ErrorHandler as any).instance = undefined;
		errorHandler = ErrorHandler.getInstance();
	});

	describe("シングルトンパターン", () => {
		it("同一インスタンスを返す", () => {
			const instance1 = ErrorHandler.getInstance();
			const instance2 = ErrorHandler.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("エラー分類", () => {
		it("YouTube APIエラーを正しく分類する", async () => {
			const error = new Error("YouTube API quota exceeded");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "youtube-api",
			});

			expect(result.category).toContain("circuit_breaker");
		});

		it("DLsiteスクレイピングエラーを正しく分類する", async () => {
			const error = new Error("DLsite scraping failed");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "dlsite-scraping",
			});

			// リトライ機能が無効化されているため canContinue は false
			expect(result.canContinue).toBe(false);
			expect(result.category).toBe("retry_disabled");
		});

		it("Firestoreエラーを正しく分類する", async () => {
			const error = new Error("Firestore connection failed");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "firestore-write",
			});

			// リトライ機能が無効化されているため canContinue は false
			expect(result.canContinue).toBe(false);
			expect(result.category).toBe("retry_disabled");
		});

		it("ネットワークエラーを正しく分類する", async () => {
			const error = new Error("Network timeout occurred");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "network-request",
			});

			// リトライ機能が無効化されているため canContinue は false
			expect(result.canContinue).toBe(false);
			expect(result.category).toBe("retry_disabled");
		});
	});

	describe("復旧戦略", () => {
		it("リトライ戦略を実行する", async () => {
			const error = new Error("Network connection failed");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "retry-test",
			});

			// リトライ機能が無効化されているため失敗
			expect(result.recoverySuccessful).toBe(false);
			expect(result.category).toBe("retry_disabled");
		});

		it("フォールバック戦略を実行する", async () => {
			const error = new Error("DLsite structure changed");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "structure-test",
			});

			// フォールバック戦略は実行されるため canContinue は true
			expect(result.canContinue).toBe(true);
			expect(result.category).toBe("fallback_success");
		});

		it("部分スキップ戦略を実行する", async () => {
			const error = new Error("Parse validation failed");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "parse-test",
			});

			// 部分スキップ戦略は実行されるため canContinue は true
			expect(result.canContinue).toBe(true);
			expect(result.category).toBe("partial_skip");
		});
	});

	describe("サーキットブレーカー", () => {
		it("クォータ超過時にサーキットブレーカーを発動する", async () => {
			const error = new Error("YouTube quota exceeded");
			(error as any).code = 403;

			const result = await errorHandler.handleError(error, {
				function: "youtube",
				operation: "quota-test",
			});

			expect(result.canContinue).toBe(false);
			expect(result.category).toBe("circuit_breaker_activated");
		});
	});

	describe("エラー詳細", () => {
		it("追加情報を含むエラーを処理する", async () => {
			const error = new Error("Test error with details");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "detail-test",
				additionalInfo: {
					productId: "RJ123456",
					userId: "test-user",
				},
			});

			expect(result).toBeDefined();
		});

		it("エラーコードを含むエラーを処理する", async () => {
			const error = new Error("API error") as any;
			error.code = 500;

			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "code-test",
			});

			expect(result).toBeDefined();
		});
	});

	describe("ヘルパー関数", () => {
		it("getErrorHandler()が正しく動作する", () => {
			const handler = getErrorHandler();
			expect(handler).toBeInstanceOf(ErrorHandler);
		});

		it("handleError()ヘルパー関数が正しく動作する", async () => {
			const error = new Error("Helper function test");
			const result = await handleError(error, {
				function: "test",
				operation: "helper-test",
			});

			expect(result).toBeDefined();
			expect(result.canContinue).toBeDefined();
			expect(result.recoverySuccessful).toBeDefined();
		});
	});

	describe("設定対応", () => {
		it("自動復旧が無効の場合、復旧処理をスキップする", async () => {
			// 設定を無効にする
			(errorHandler as any).config.autoRecoveryEnabled = false;

			const error = new Error("Test error");
			const result = await errorHandler.handleError(error, {
				function: "test",
				operation: "no-recovery",
			});

			expect(result.recoverySuccessful).toBe(false);
			expect(result.category).toBe("manual_intervention_required");
		});
	});

	describe("エラー統計", () => {
		it("エラーカウントが正しく記録される", async () => {
			const error = new Error("Count test error");

			// 複数回同じエラーを発生させる
			await errorHandler.handleError(error, {
				function: "count-test",
				operation: "error-counting",
			});

			await errorHandler.handleError(error, {
				function: "count-test",
				operation: "error-counting",
			});

			// エラーカウントが記録されていることを確認
			const errorCount = (errorHandler as any).errorCount;
			expect(errorCount.size).toBeGreaterThan(0);
		});
	});
});

describe("ErrorType", () => {
	it("すべてのエラータイプが定義されている", () => {
		const expectedTypes = [
			"YOUTUBE_API_ERROR",
			"YOUTUBE_QUOTA_EXCEEDED",
			"DLSITE_SCRAPING_ERROR",
			"DLSITE_STRUCTURE_CHANGED",
			"FIRESTORE_ERROR",
			"FIRESTORE_BATCH_ERROR",
			"PARSING_ERROR",
			"VALIDATION_ERROR",
			"NETWORK_ERROR",
			"TIMEOUT_ERROR",
			"CONFIGURATION_ERROR",
			"DATA_QUALITY_ERROR",
			"METADATA_ERROR",
			"UNKNOWN_ERROR",
		];

		for (const type of expectedTypes) {
			expect(ErrorType[type as keyof typeof ErrorType]).toBe(type);
		}
	});
});

describe("ErrorSeverity", () => {
	it("すべての深刻度が定義されている", () => {
		expect(ErrorSeverity.LOW).toBe("LOW");
		expect(ErrorSeverity.MEDIUM).toBe("MEDIUM");
		expect(ErrorSeverity.HIGH).toBe("HIGH");
		expect(ErrorSeverity.CRITICAL).toBe("CRITICAL");
	});
});

describe("RecoveryStrategy", () => {
	it("すべての復旧戦略が定義されている", () => {
		const expectedStrategies = [
			"NONE",
			"RETRY",
			"FALLBACK",
			"PARTIAL_SKIP",
			"GRACEFUL_DEGRADATION",
			"CIRCUIT_BREAKER",
		];

		for (const strategy of expectedStrategies) {
			expect(RecoveryStrategy[strategy as keyof typeof RecoveryStrategy]).toBe(strategy);
		}
	});
});
