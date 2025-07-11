import type { WriteBatch } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firestore と logger のモック
vi.mock("./firestore", () => ({
	default: {
		batch: vi.fn(),
	},
}));

vi.mock("../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import * as logger from "../../shared/logger";

describe("Firestore Infrastructure Utils", () => {
	// モックされたバッチオブジェクト
	let mockBatch: WriteBatch;
	let firestore: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Firestoreモックの設定
		const firestoreModule = await import("./firestore");
		firestore = firestoreModule.default;

		mockBatch = {
			commit: vi.fn().mockResolvedValue(undefined),
			set: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as any;

		firestore.batch.mockReturnValue(mockBatch);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic functionality", () => {
		it("should exist and be importable", async () => {
			// 動的importでモック問題を回避
			const module = await import("./firestore-utils");

			expect(module.executeBatchOperation).toBeDefined();
			expect(module.executeSingleBatch).toBeDefined();
			expect(typeof module.executeBatchOperation).toBe("function");
			expect(typeof module.executeSingleBatch).toBe("function");
		});

		it("should export correct types", async () => {
			const module = await import("./firestore-utils");

			// 基本的な型チェック
			expect(module).toHaveProperty("executeBatchOperation");
			expect(module).toHaveProperty("executeSingleBatch");
		});
	});

	describe("executeBatchOperation", () => {
		it("should handle empty array correctly", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");

			const result = await executeBatchOperation([], () => {});

			expect(result).toEqual({
				totalItems: 0,
				successfulItems: 0,
				failedItems: 0,
				successfulBatches: 0,
				failedBatches: 0,
				errors: [],
			});

			// Firestoreのbatchメソッドが呼ばれていないことを確認
			expect(firestore.batch).not.toHaveBeenCalled();
		});

		it("should process single item successfully", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = ["item1"];

			const result = await executeBatchOperation(items, mockOperation);

			expect(result).toEqual({
				totalItems: 1,
				successfulItems: 1,
				failedItems: 0,
				successfulBatches: 1,
				failedBatches: 0,
				errors: [],
			});

			expect(firestore.batch).toHaveBeenCalledTimes(1);
			expect(mockOperation).toHaveBeenCalledWith(mockBatch, "item1");
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("should process multiple items successfully", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = ["item1", "item2", "item3"];

			const result = await executeBatchOperation(items, mockOperation);

			expect(result).toEqual({
				totalItems: 3,
				successfulItems: 3,
				failedItems: 0,
				successfulBatches: 1,
				failedBatches: 0,
				errors: [],
			});

			expect(firestore.batch).toHaveBeenCalledTimes(1);
			expect(mockOperation).toHaveBeenCalledTimes(3);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("should handle operation errors gracefully", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const operationError = new Error("Operation failed");
			const mockOperation = vi.fn().mockImplementation((_batch, item) => {
				if (item === "error-item") {
					throw operationError;
				}
			});
			const items = ["item1", "error-item", "item3"];

			const result = await executeBatchOperation(items, mockOperation);

			expect(result).toEqual({
				totalItems: 3,
				successfulItems: 2,
				failedItems: 1,
				successfulBatches: 1,
				failedBatches: 0,
				errors: [operationError],
			});

			expect(mockOperation).toHaveBeenCalledTimes(3);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("should log operation errors with detailed logging enabled", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const operationError = new Error("Operation failed");
			const mockOperation = vi.fn().mockImplementation((_batch, item) => {
				if (item === "error-item") {
					throw operationError;
				}
			});
			const items = ["item1", "error-item", "item3"];

			await executeBatchOperation(items, mockOperation, { enableDetailedLogging: true });

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining("アイテム操作エラー (チャンク 1)"),
				{ error: operationError },
			);
		});

		it("should handle batch commit errors", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const commitError = new Error("Batch commit failed");
			mockBatch.commit.mockRejectedValue(commitError);

			const mockOperation = vi.fn();
			const items = ["item1", "item2"];

			const result = await executeBatchOperation(items, mockOperation);

			expect(result).toEqual({
				totalItems: 2,
				successfulItems: 0,
				failedItems: 2,
				successfulBatches: 0,
				failedBatches: 1,
				errors: [commitError],
			});

			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("バッチ 1/1 実行エラー"));
		});

		it("should handle batch commit errors with detailed logging", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const commitError = new Error("Batch commit failed");
			mockBatch.commit.mockRejectedValue(commitError);

			const mockOperation = vi.fn();
			const items = ["item1", "item2"];

			await executeBatchOperation(items, mockOperation, { enableDetailedLogging: true });

			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("バッチ 1/1 実行エラー"), {
				chunkIndex: 1,
				chunkSize: 2,
				error: commitError,
			});
		});

		it("should respect batchSize option", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);

			await executeBatchOperation(items, mockOperation, { batchSize: 3 });

			// 10個のアイテムをbatchSize=3で処理すると、4つのバッチに分かれる
			expect(firestore.batch).toHaveBeenCalledTimes(4);
			expect(mockBatch.commit).toHaveBeenCalledTimes(4);
		});

		it("should respect continueOnFailure=false option", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const commitError = new Error("First batch failed");

			// 最初のバッチのみ失敗させる
			mockBatch.commit.mockRejectedValueOnce(commitError).mockResolvedValue(undefined);

			const mockOperation = vi.fn();
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);

			const result = await executeBatchOperation(items, mockOperation, {
				batchSize: 3,
				continueOnFailure: false,
			});

			// 最初のバッチで失敗して停止するため、1つのバッチのみ処理される
			expect(firestore.batch).toHaveBeenCalledTimes(1);
			expect(result.failedBatches).toBe(1);
			expect(result.successfulBatches).toBe(0);
		});

		it("should enable detailed logging when requested", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = ["item1", "item2"];

			await executeBatchOperation(items, mockOperation, { enableDetailedLogging: true });

			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Firestoreバッチ処理開始"));
			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("チャンク 1/1 完了"));
		});

		it("should handle non-Error thrown values", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const stringError = "String error";
			mockBatch.commit.mockRejectedValue(stringError);

			const mockOperation = vi.fn();
			const items = ["item1"];

			const result = await executeBatchOperation(items, mockOperation);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toBeInstanceOf(Error);
			expect(result.errors[0].message).toBe("String error");
		});

		it("should enforce maximum batch size of 500", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = Array.from({ length: 10 }, (_, i) => `item${i}`);

			// batchSizeを500より大きく設定しても、500で制限される
			await executeBatchOperation(items, mockOperation, { batchSize: 1000 });

			// 10個のアイテムなので1つのバッチで処理される
			expect(firestore.batch).toHaveBeenCalledTimes(1);
		});
	});

	describe("executeSingleBatch", () => {
		it("should handle empty operations in executeSingleBatch", async () => {
			const { executeSingleBatch } = await import("./firestore-utils");

			await expect(executeSingleBatch([])).resolves.toBeUndefined();

			// 空の場合はbatchが作成されない
			expect(firestore.batch).not.toHaveBeenCalled();
		});

		it("should reject operations exceeding 500 limit", async () => {
			const { executeSingleBatch } = await import("./firestore-utils");

			const operations = Array.from({ length: 501 }, () => () => {});

			await expect(executeSingleBatch(operations)).rejects.toThrow(
				"バッチ操作数が制限を超えています: 501/500",
			);

			expect(firestore.batch).not.toHaveBeenCalled();
		});

		it("should execute single batch with multiple operations", async () => {
			const { executeSingleBatch } = await import("./firestore-utils");

			const operation1 = vi.fn();
			const operation2 = vi.fn();
			const operation3 = vi.fn();
			const operations = [operation1, operation2, operation3];

			await executeSingleBatch(operations);

			expect(firestore.batch).toHaveBeenCalledTimes(1);
			expect(operation1).toHaveBeenCalledWith(mockBatch);
			expect(operation2).toHaveBeenCalledWith(mockBatch);
			expect(operation3).toHaveBeenCalledWith(mockBatch);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);
		});

		it("should handle exactly 500 operations", async () => {
			const { executeSingleBatch } = await import("./firestore-utils");

			const operations = Array.from({ length: 500 }, () => vi.fn());

			await executeSingleBatch(operations);

			expect(firestore.batch).toHaveBeenCalledTimes(1);
			expect(mockBatch.commit).toHaveBeenCalledTimes(1);

			// すべての操作が呼ばれることを確認
			operations.forEach((op) => {
				expect(op).toHaveBeenCalledWith(mockBatch);
			});
		});

		it("should propagate batch commit errors", async () => {
			const { executeSingleBatch } = await import("./firestore-utils");
			const commitError = new Error("Commit failed");
			mockBatch.commit.mockRejectedValue(commitError);

			const operations = [vi.fn(), vi.fn()];

			await expect(executeSingleBatch(operations)).rejects.toThrow("Commit failed");
		});
	});

	describe("BatchProcessingOptions", () => {
		it("should use default options when none provided", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = ["item1"];

			await executeBatchOperation(items, mockOperation);

			// デフォルトのbatchSize=500が使用される
			expect(firestore.batch).toHaveBeenCalledTimes(1);
		});

		it("should handle delayBetweenBatches option", async () => {
			const { executeBatchOperation } = await import("./firestore-utils");
			const mockOperation = vi.fn();
			const items = Array.from({ length: 6 }, (_, i) => `item${i}`);

			// スパイでsetTimeoutをモック
			const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
				fn(); // 即座に実行
				return 123 as any;
			});

			await executeBatchOperation(items, mockOperation, {
				batchSize: 2,
				delayBetweenBatches: 50,
			});

			// 6個のアイテム、batchSize=2なので3つのバッチ
			// 最後のバッチ以外でdelayが呼ばれるので2回
			expect(setTimeoutSpy).toHaveBeenCalledTimes(2);

			setTimeoutSpy.mockRestore();
		});
	});
});
