/**
 * Individual Info API Client テスト
 */

import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "../../../shared/logger";
import {
	batchFetchIndividualInfo,
	DLsiteRateLimitError,
	fetchIndividualWorkInfo,
	WORST_CASE_FETCH_MS,
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

		it("500エラーの場合リトライ後に例外を投げる", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: vi.fn().mockResolvedValue("Server Error"),
				headers: new Headers(),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow(
				"Server error for RJ123456 - retry needed",
			);

			// リトライが実行されたことを確認（MAX_RETRIES=2なので、初回+2回リトライ=3回）
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it("429エラーの場合リトライせずに DLsiteRateLimitError を投げる（SPR-408）", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				text: vi.fn().mockResolvedValue("Rate Limited"),
				headers: new Headers({ "retry-after": "300", "cf-ray": "abc", "set-cookie": "secret=1" }),
			});

			const error = await fetchIndividualWorkInfo("RJ123456").catch((e) => e);

			expect(error).toBeInstanceOf(DLsiteRateLimitError);
			expect(error.retryAfterSeconds).toBe(300);
			// 制限は約5分続くため、再試行は負荷を増やすだけ
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// 制限の窓を実測するためのヘッダだけを残す（set-cookie 等は残さない）
			expect(logger.warn).toHaveBeenCalledWith("Individual Info API レート制限: RJ123456", {
				status: 429,
				rateLimitHeaders: { "retry-after": "300", "cf-ray": "abc" },
			});
		});

		it("Retry-After つきの 404 はブロックとして DLsiteRateLimitError を投げる（SPR-423）", async () => {
			// 2026-11-16 実測: 404 + retry-after + 本文 []（作品が無いときの 404 には retry-after が付かない）
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
				text: vi.fn().mockResolvedValue("[]"),
				headers: new Headers({
					"retry-after": "3600",
					server: "cloudflare",
					"content-type": "application/json",
				}),
			});
			const silentFailureSink: never[] = [];

			const error = await fetchIndividualWorkInfo("RJ123456", { silentFailureSink }).catch(
				(e) => e,
			);

			expect(error).toBeInstanceOf(DLsiteRateLimitError);
			expect(error.retryAfterSeconds).toBe(3600);
			expect(mockFetch).toHaveBeenCalledTimes(1);
			// 「作品が無い」の集計には入れない
			expect(silentFailureSink).toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith("Individual Info API レート制限: RJ123456", {
				status: 404,
				rateLimitHeaders: {
					"retry-after": "3600",
					server: "cloudflare",
					"content-type": "application/json",
				},
			});
		});

		it("429 の Retry-After が HTTP 日付でも秒数に直し、無ければ undefined にする", async () => {
			const respond = (headers: Headers) =>
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 429,
					statusText: "Too Many Requests",
					text: vi.fn().mockResolvedValue(""),
					headers,
				});

			respond(new Headers({ "retry-after": new Date(Date.now() + 60_000).toUTCString() }));
			const dated = await fetchIndividualWorkInfo("RJ123456").catch((e) => e);
			expect(dated.retryAfterSeconds).toBeGreaterThan(55);
			expect(dated.retryAfterSeconds).toBeLessThanOrEqual(60);

			respond(new Headers());
			const none = await fetchIndividualWorkInfo("RJ123456").catch((e) => e);
			expect(none).toBeInstanceOf(DLsiteRateLimitError);
			expect(none.retryAfterSeconds).toBeUndefined();
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

		it("ネットワークエラーの場合リトライせず例外を投げる", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow();

			// 一過性と判定できないエラーはリトライ対象外（初回のみ）
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("リトライが成功した場合データを返す", async () => {
			const successResponse = {
				ok: true,
				status: 200,
				statusText: "OK",
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData])),
				headers: new Headers({ "content-type": "application/json" }),
			};

			// 初回は500エラー、リトライで成功
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					text: vi.fn().mockResolvedValue("Server Error"),
					headers: new Headers(),
				})
				.mockResolvedValueOnce(successResponse);

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toEqual(mockWorkData);
			expect(mockFetch).toHaveBeenCalledTimes(2); // 初回失敗 + リトライ成功
		});

		// AbortSignal.timeout() が投げるのは "TimeoutError"。以前は "retry needed" を含む
		// エラー（429/5xx）しかリトライ対象でなく、一過性の遅延がそのまま失敗計上されていた。
		it("タイムアウト（TimeoutError）はリトライしてから例外を投げる", async () => {
			mockFetch.mockRejectedValue(
				new DOMException("The operation was aborted due to timeout", "TimeoutError"),
			);

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow();

			// タイムアウトは1回あたり15秒を消費するためリトライ上限は1回（初回+1回=2回）
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("AbortError もリトライ対象になる", async () => {
			mockFetch.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));

			await expect(fetchIndividualWorkInfo("RJ123456")).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("タイムアウト後のリトライが成功した場合データを返す", async () => {
			mockFetch
				.mockRejectedValueOnce(
					new DOMException("The operation was aborted due to timeout", "TimeoutError"),
				)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: "OK",
					text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData])),
					headers: new Headers({ "content-type": "application/json" }),
				});

			const result = await fetchIndividualWorkInfo("RJ123456");

			expect(result).toEqual(mockWorkData);
			expect(mockFetch).toHaveBeenCalledTimes(2);
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

		it("404 と workno 無しの応答を、バッチ単位の WARN に理由つきで残す（SPR-423）", async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					text: vi.fn().mockResolvedValue("<html>blocked</html>"),
					headers: new Headers({
						server: "cloudflare",
						"cf-ray": "abc-NRT",
						"content-type": "text/html",
						"set-cookie": "secret=1",
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					text: vi.fn().mockResolvedValue(JSON.stringify([{ work_name: "IDなし" }])),
					headers: new Headers({ "content-type": "application/json" }),
				});

			const result = await batchFetchIndividualInfo(["RJ000001", "RJ000002"], { batchDelay: 0 });

			expect(result.failedWorkIds).toEqual(["RJ000001", "RJ000002"]);
			expect(logger.warn).toHaveBeenCalledWith("ログ省略の取得失敗の内訳: 2件", {
				attemptedCount: 2,
				http404Count: 1,
				missingWorknoCount: 1,
				samples: [
					{
						workId: "RJ000001",
						reason: "http_404",
						status: 404,
						headers: { server: "cloudflare", "cf-ray": "abc-NRT", "content-type": "text/html" },
						bodyHead: "<html>blocked</html>",
					},
					{
						workId: "RJ000002",
						reason: "missing_workno",
						status: 200,
						headers: { "content-type": "application/json" },
						bodyHead: '[{"work_name":"IDなし"}]',
					},
				],
			});
		});

		it("ログ省略の失敗が無ければ内訳の WARN を出さず、サンプルは3件までに抑える", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
				headers: new Headers(),
			});
			await batchFetchIndividualInfo(["RJ123456"], { batchDelay: 0 });
			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining("ログ省略の取得失敗の内訳"),
				expect.anything(),
			);

			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				text: vi.fn().mockResolvedValue("x".repeat(1000)),
				headers: new Headers(),
			});
			await batchFetchIndividualInfo(["RJ1", "RJ2", "RJ3", "RJ4"], { batchDelay: 0 });
			const [, payload] = (logger.warn as Mock).mock.calls.find(([message]) =>
				String(message).startsWith("ログ省略の取得失敗の内訳"),
			) as [string, { http404Count: number; samples: Array<{ bodyHead: string }> }];
			expect(payload.http404Count).toBe(4);
			expect(payload.samples).toHaveLength(3);
			expect(payload.samples[0]?.bodyHead).toHaveLength(300);
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

		it("429 を受けたサブバッチで打ち切り、残りは呼ばずに interruption で返す（SPR-408）", async () => {
			const ok = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
				headers: new Headers(),
			};
			const limited = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				text: vi.fn().mockResolvedValue(""),
				headers: new Headers({ "retry-after": "120" }),
			};
			// サブバッチ1: 2件成功 / サブバッチ2: 1件成功 + 1件 429 / サブバッチ3: 呼ばれない
			// （Retry-After つきの 404 も同じ DLsiteRateLimitError になるので、打ち切りの経路は共通）
			mockFetch
				.mockResolvedValueOnce(ok)
				.mockResolvedValueOnce(ok)
				.mockResolvedValueOnce(ok)
				.mockResolvedValueOnce(limited);

			const result = await batchFetchIndividualInfo(["RJ1", "RJ2", "RJ3", "RJ4", "RJ5", "RJ6"], {
				maxConcurrent: 2,
				batchDelay: 0,
			});

			expect(mockFetch).toHaveBeenCalledTimes(4);
			expect([...result.results.keys()]).toEqual(["RJ1", "RJ2", "RJ3"]);
			// 429 を受けた分と未着手分は「失敗」ではない（次の run でやり直す）
			expect(result.failedWorkIds).toEqual([]);
			expect(result.interruption).toEqual({
				reason: "rate_limit",
				retryAfterSeconds: 120,
				skippedWorkIds: ["RJ4", "RJ5", "RJ6"],
			});
			// 打ち切り分は失敗率に数えない＝部分劣化アラートの契約ログを出さない
			expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("API取得失敗が多数"));
		});

		it("打ち切り時の失敗率は、実際に呼んで結果が出た件数を分母にする", async () => {
			const limited = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				text: vi.fn().mockResolvedValue(""),
				headers: new Headers(),
			};
			// サブバッチ1: 2件とも 429 以外の失敗 / サブバッチ2: 429 で打ち切り
			mockFetch
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValue(limited);

			const workIds = Array.from({ length: 40 }, (_, i) => `RJ${i}`);
			const result = await batchFetchIndividualInfo(workIds, { maxConcurrent: 2, batchDelay: 0 });

			expect(result.failedWorkIds).toEqual(["RJ0", "RJ1"]);
			// 40件を分母にすると 5% で閾値（10%）未満になり、部分劣化を見逃す
			expect(logger.warn).toHaveBeenCalledWith("API取得失敗が多数: 2件 (失敗率100.0%)");
		});

		describe("deadlineAt（SPR-319）", () => {
			const okResponse = () => ({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
				headers: new Headers(),
			});

			it("最悪ケースは「タイムアウト間際の 5xx が続く」経路＝3回の試行 + 待ち 1秒・2秒", () => {
				expect(WORST_CASE_FETCH_MS).toBe(15000 * 3 + 1000 + 2000);
			});

			it("次のサブバッチが締め切りまでに終わる保証が無ければ、始める前に打ち切る", async () => {
				let now = 1_000_000;
				vi.spyOn(Date, "now").mockImplementation(() => now);
				// 1サブバッチに 20 秒かかる（タイムアウトとリトライで延びた状況）
				mockFetch.mockImplementation(async () => {
					now += 20_000;
					return okResponse();
				});

				const result = await batchFetchIndividualInfo(["RJ1", "RJ2", "RJ3"], {
					maxConcurrent: 1,
					batchDelay: 0,
					// 1回目（0秒）と2回目（20秒）は最悪ケースでも収まる。3回目（40秒）は収まらない
					deadlineAt: now + WORST_CASE_FETCH_MS + 30_000,
				});

				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect([...result.results.keys()]).toEqual(["RJ1", "RJ2"]);
				// 未着手分は「失敗」ではない（次の run でやり直す）
				expect(result.failedWorkIds).toEqual([]);
				expect(result.interruption).toEqual({ reason: "deadline", skippedWorkIds: ["RJ3"] });
			});

			it("最初から締め切りに収まらなければ、1件も呼ばずに全件を未着手で返す", async () => {
				const result = await batchFetchIndividualInfo(["RJ1", "RJ2"], {
					maxConcurrent: 2,
					batchDelay: 0,
					deadlineAt: Date.now() + WORST_CASE_FETCH_MS - 1,
				});

				expect(mockFetch).not.toHaveBeenCalled();
				expect(result.interruption).toEqual({
					reason: "deadline",
					skippedWorkIds: ["RJ1", "RJ2"],
				});
				expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("API取得失敗が多数"));
			});

			it("deadlineAt を渡さなければ、時間では打ち切らない", async () => {
				mockFetch.mockImplementation(async () => okResponse());

				const result = await batchFetchIndividualInfo(["RJ1", "RJ2"], {
					maxConcurrent: 1,
					batchDelay: 0,
				});

				expect(result.results.size).toBe(2);
				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect(result.interruption).toBeUndefined();
			});
		});

		it("打ち切りが無ければ interruption は undefined", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(JSON.stringify([mockWorkData1])),
				headers: new Headers(),
			});

			const result = await batchFetchIndividualInfo(["RJ123456"]);

			expect(result.interruption).toBeUndefined();
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
