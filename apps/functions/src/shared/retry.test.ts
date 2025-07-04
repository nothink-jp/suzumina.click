import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ApiError, retryApiCall } from "./retry";

// sleepのモックを作成
vi.mock("./retry", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./retry")>();
	return {
		...actual,
		// sleepをモック化してタイマーの使用を回避
		sleep: vi.fn().mockImplementation(() => Promise.resolve()),
	};
});

// loggerのモックを作成
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

import * as logger from "./logger";

/**
 * タイマーを実行し、保留中のプロミスが解決されるのを待つヘルパー関数
 */
async function runTimersAndPromises() {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 10));
}

describe("リトライユーティリティ", () => {
	// モック関数の取得
	const mockedWarn = vi.mocked(logger.warn);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("sleep関数", () => {
		// 本来のsleep関数を使って簡単にテスト（モックはスキップ）
		it("指定した時間だけ待機すること", async () => {
			// このテストでは実際にモックを使わないでテスト
			const originalSleep = (await vi.importActual<typeof import("./retry")>("./retry")).sleep;

			// 非常に短い時間でテスト
			const delay = 10;
			const startTime = Date.now();

			await originalSleep(delay);

			const elapsedTime = Date.now() - startTime;
			expect(elapsedTime).toBeGreaterThanOrEqual(delay - 5); // 誤差を考慮
		});
	});

	describe("retryApiCall関数", () => {
		it("正常な呼び出しの場合は結果をそのまま返すこと", async () => {
			const expectedResult = { data: "成功" };
			const apiCall = vi.fn().mockResolvedValue(expectedResult);

			const result = await retryApiCall(apiCall);

			expect(result).toEqual(expectedResult);
			expect(apiCall).toHaveBeenCalledTimes(1);
			expect(mockedWarn).not.toHaveBeenCalled();
		});

		it("一時的なエラー後にリトライして成功すること", { timeout: 1000 }, async () => {
			const expectedResult = { data: "リトライ後に成功" };
			const apiCall = vi
				.fn()
				.mockRejectedValueOnce(new Error("一時的なエラー"))
				.mockResolvedValueOnce(expectedResult);

			// リトライ処理を開始（短い遅延時間を明示的に設定）
			const resultPromise = retryApiCall(apiCall, { delayMs: 100 });

			// タイマーを完全に実行
			await runTimersAndPromises();

			// 結果を検証
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
			expect(apiCall).toHaveBeenCalledTimes(2);
			expect(mockedWarn).toHaveBeenCalledTimes(1);
			expect(mockedWarn).toHaveBeenCalledWith(expect.stringContaining("API呼び出しに失敗しました"));
		});

		it("カスタムリトライオプションが適用されること", { timeout: 2000 }, async () => {
			const expectedResult = { data: "カスタムリトライ後に成功" };
			const apiCall = vi
				.fn()
				.mockRejectedValueOnce(new Error("一時的なエラー1"))
				.mockRejectedValueOnce(new Error("一時的なエラー2"))
				.mockRejectedValueOnce(new Error("一時的なエラー3"))
				.mockResolvedValueOnce(expectedResult);

			// カスタム設定で遅延時間を短く設定
			const resultPromise = retryApiCall(apiCall, {
				maxAttempts: 5,
				delayMs: 100,
			});

			// タイマーを完全に実行
			await runTimersAndPromises();

			// 結果を検証
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
			expect(apiCall).toHaveBeenCalledTimes(4);
			expect(mockedWarn).toHaveBeenCalledTimes(3);
		});

		it("特定のエラーコードの場合はリトライをスキップすること", async () => {
			// クォータ超過エラーなど、リトライすべきでないエラー
			const quotaError: ApiError = { code: 403, message: "クォータ超過エラー" };
			const apiCall = vi.fn().mockRejectedValue(quotaError);

			await expect(retryApiCall(apiCall)).rejects.toEqual(quotaError);
			expect(apiCall).toHaveBeenCalledTimes(1); // リトライなし
			expect(mockedWarn).not.toHaveBeenCalled();
		});

		it("エラーオブジェクトがcodeプロパティを持たない場合でもリトライが行われること", async () => {
			const expectedResult = { data: "リトライ成功" };
			const errorWithoutCode = new Error("codeプロパティのないエラー");
			const apiCall = vi
				.fn()
				.mockRejectedValueOnce(errorWithoutCode)
				.mockResolvedValueOnce(expectedResult);

			// リトライ処理を開始（短い遅延時間を明示的に設定）
			const resultPromise = retryApiCall(apiCall, { delayMs: 100 });

			// タイマーを完全に実行
			await runTimersAndPromises();

			// 結果を検証
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
			expect(apiCall).toHaveBeenCalledTimes(2);
			expect(mockedWarn).toHaveBeenCalledTimes(1);
			expect(mockedWarn).toHaveBeenCalledWith(expect.stringContaining("API呼び出しに失敗しました"));
		});

		it("カスタムのスキップコードが適用されること", async () => {
			// 404エラーをスキップ対象に設定
			const notFoundError: ApiError = {
				code: 404,
				message: "リソースが見つかりません",
			};
			const apiCall = vi.fn().mockRejectedValue(notFoundError);

			// 404をスキップ対象に追加
			await expect(retryApiCall(apiCall, { skipRetryCodes: [404] })).rejects.toEqual(notFoundError);
			expect(apiCall).toHaveBeenCalledTimes(1); // リトライなし
			expect(mockedWarn).not.toHaveBeenCalled();
		});

		it("最大リトライ回数に達した後は例外をスローすること", async () => {
			// すべてのリトライが失敗するケース
			const persistentError = new Error("継続的なエラー");
			const apiCall = vi.fn().mockRejectedValue(persistentError);

			// リトライ処理を開始（最大試行回数2回、短い遅延時間で設定）
			const resultPromise = retryApiCall(apiCall, {
				maxAttempts: 2,
				delayMs: 50,
			});

			// タイマーを実行
			await runTimersAndPromises();

			// 最終的に例外がスローされることを確認
			await expect(resultPromise).rejects.toEqual(persistentError);

			// 初回 + リトライ1回 = 合計2回呼び出されることを確認
			expect(apiCall).toHaveBeenCalledTimes(2);

			// 警告ログが1回出力されることを確認（初回の失敗時）
			expect(mockedWarn).toHaveBeenCalledTimes(1);
			expect(mockedWarn).toHaveBeenCalledWith(expect.stringContaining("残りリトライ回数: 1"));
		});

		it("skipRetryCodesが空の配列の場合はすべてのエラーコードでリトライすること", async () => {
			const expectedResult = { data: "空の配列でリトライ成功" };
			// 通常はスキップされる403エラー
			const quotaError: ApiError = {
				code: 403,
				message: "通常はスキップされるエラー",
			};

			const apiCall = vi
				.fn()
				.mockRejectedValueOnce(quotaError)
				.mockResolvedValueOnce(expectedResult);

			// 空の配列を指定して、すべてのエラーでリトライするように設定
			const resultPromise = retryApiCall(apiCall, {
				skipRetryCodes: [],
				delayMs: 50,
			});

			// タイマーを実行
			await runTimersAndPromises();

			// 結果を検証
			const result = await resultPromise;
			expect(result).toEqual(expectedResult);
			expect(apiCall).toHaveBeenCalledTimes(2);
			expect(mockedWarn).toHaveBeenCalledTimes(1);
		});
	});
});
