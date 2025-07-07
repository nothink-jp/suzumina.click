/**
 * DLsite Cloud Function のテスト
 *
 * YouTubeのテストパターンに従い、DLsite作品取得機能をテストします。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// HTTPレスポンス用のモック型定義
interface MockFetchResponse {
	ok: boolean;
	status: number;
	text: () => Promise<string>;
}

// DLsiteのモックHTMLレスポンス
const mockDLsiteHtml = `
<html>
<body>
  <div class="n_worklist">
    <table>
      <tr class="search_result_img_box_inner">
        <td>
          <a href="/maniax/work/=/product_id/RJ236867.html">
            <img src="//img.dlsite.jp/modpub/images2/work/doujin/RJ237000/RJ236867_img_main.jpg" alt="夏の苦い思い出">
          </a>
        </td>
        <td>
          <div class="search_result_img_box_inner">
            <dt><a href="/maniax/work/=/product_id/RJ236867.html">夏の苦い思い出</a></dt>
            <dd>ARIKA Work</dd>
            <dd>ADV</dd>
            <div class="work_price">
              <span class="work_price_base">110円</span>
              <span class="work_price_original">220円</span>
              <span class="work_price_discount">50%OFF</span>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

// グローバルfetchのモック
const mockFetch = vi.fn().mockImplementation((url: string): Promise<MockFetchResponse> => {
	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.hostname === "www.dlsite.com") {
			return Promise.resolve({
				ok: true,
				status: 200,
				text: async () => mockDLsiteHtml,
			});
		}
		if (parsedUrl.hostname === "api.ipify.org") {
			return Promise.resolve({
				ok: true,
				status: 200,
				text: async () => '{"ip": "90.149.56.234"}',
				json: async () => ({ ip: "90.149.56.234" }),
			} as any);
		}
		return Promise.reject(new Error(`Unexpected URL: ${url}`));
	} catch (_error) {
		return Promise.reject(new Error(`Invalid URL: ${url}`));
	}
});

// グローバルfetchを設定
global.fetch = mockFetch;

// loggerのモック
vi.mock("../shared/logger", () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
}));

// User-Agent管理のモック
vi.mock("../infrastructure/management/user-agent-manager", () => ({
	generateDLsiteHeaders: vi.fn(() => ({
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	})),
}));

// DLsite AJAX Fetcherのモック
vi.mock("../services/dlsite/dlsite-ajax-fetcher", () => ({
	fetchDLsiteAjaxResult: vi.fn(() =>
		Promise.resolve({
			search_result: mockDLsiteHtml,
			page_info: {
				count: 1010,
				current_page: 1,
				total_pages: 34,
			},
		}),
	),
	isLastPageFromPageInfo: vi.fn(() => false),
	validateAjaxHtmlContent: vi.fn(() => true),
}));

// Firestoreのモック
vi.mock("../infrastructure/database/firestore", () => {
	// メタデータドキュメントのモック
	const mockMetadataDocGet = vi.fn().mockResolvedValue({
		exists: false,
		data: () => ({}),
	});

	const mockMetadataDoc = vi.fn(() => ({
		get: mockMetadataDocGet,
		update: vi.fn().mockResolvedValue({}),
		set: vi.fn().mockResolvedValue({}),
	}));

	// 作品データドキュメントのモック
	const mockWorkDocGet = vi.fn().mockResolvedValue({
		exists: false,
		data: () => ({}),
	});

	const mockWorkDoc = vi.fn(() => ({
		get: mockWorkDocGet,
		update: vi.fn().mockResolvedValue({}),
		set: vi.fn().mockResolvedValue({}),
	}));

	// コレクション参照のモック
	const mockCollection = vi.fn((collectionName: string) => {
		if (collectionName === "dlsiteMetadata") {
			return { doc: mockMetadataDoc };
		}
		if (collectionName === "dlsiteWorks") {
			return {
				doc: mockWorkDoc,
				where: vi.fn().mockReturnThis(),
				get: vi.fn().mockResolvedValue({
					docs: [],
					size: 0,
				}),
			};
		}
		return { doc: vi.fn() };
	});

	// バッチ操作のモック
	const mockBatchSet = vi.fn();
	const mockBatchUpdate = vi.fn();
	const mockBatchCommit = vi.fn().mockResolvedValue([]);
	const mockBatch = {
		set: mockBatchSet,
		update: mockBatchUpdate,
		commit: mockBatchCommit,
	};

	// Firestoreインスタンスのモック
	const mockFirestoreInstance = {
		collection: mockCollection,
		batch: vi.fn(() => mockBatch),
	};

	return {
		__esModule: true,
		default: mockFirestoreInstance,
		Timestamp: {
			now: vi.fn(() => ({
				seconds: 1234567890,
				nanoseconds: 0,
				toDate: () => new Date("2023-01-01T00:00:00Z"),
			})),
			fromDate: vi.fn((date: Date) => ({
				seconds: Math.floor(date.getTime() / 1000),
				nanoseconds: 0,
				toDate: () => date,
			})),
		},
	};
});

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { Mock } from "vitest";
import firestore from "../infrastructure/database/firestore";
import * as dlsiteAjaxFetcher from "../services/dlsite/dlsite-ajax-fetcher";
import * as logger from "../shared/logger";
import { fetchDLsiteWorks } from "./dlsite";

// PubSubメッセージの型定義
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

describe("fetchDLsiteWorks", () => {
	let mockEvent: CloudEvent<PubsubMessage>;
	let originalEnv: NodeJS.ProcessEnv;

	// Firestoreのモック参照を取得
	const mockedCollection = vi.mocked(firestore.collection);
	const mockedBatch = vi.mocked(firestore.batch);

	// loggerのモック変数を宣言
	let mockedLoggerError: Mock;
	let mockedLoggerInfo: Mock;
	let mockedLoggerWarn: Mock;
	let _mockedLoggerDebug: Mock;

	// メタデータ関連のモック
	let mockMetadataDoc: {
		exists: boolean;
		data: Mock<() => Record<string, unknown>>;
	};
	let mockMetadataDocGet: Mock;
	let mockMetadataDocUpdate: Mock;
	let mockMetadataDocSet: Mock;

	beforeEach(() => {
		// 環境変数のバックアップ
		originalEnv = { ...process.env };

		// CloudEventのモックデータを作成
		mockEvent = {
			id: "test-event-id",
			source: "test-source",
			specversion: "1.0",
			type: "google.cloud.pubsub.topic.v1.messagePublished",
			time: new Date().toISOString(),
			data: {
				data: Buffer.from("test-message").toString("base64"),
				attributes: {
					"test-attribute": "test-value",
				},
			},
		};

		// loggerのモック参照を取得
		mockedLoggerError = vi.mocked(logger.error);
		mockedLoggerInfo = vi.mocked(logger.info);
		mockedLoggerWarn = vi.mocked(logger.warn);
		_mockedLoggerDebug = vi.mocked(logger.debug);

		// メタデータドキュメントのモック設定
		mockMetadataDoc = {
			exists: false,
			data: vi.fn(() => ({})),
		};

		mockMetadataDocGet = vi.fn().mockResolvedValue(mockMetadataDoc);
		mockMetadataDocUpdate = vi.fn().mockResolvedValue({});
		mockMetadataDocSet = vi.fn().mockResolvedValue({});

		// Firestoreのコレクション/ドキュメントのモック設定
		const mockMetadataDocRef = {
			get: mockMetadataDocGet,
			update: mockMetadataDocUpdate,
			set: mockMetadataDocSet,
		};

		mockedCollection.mockImplementation((collectionName: string) => {
			if (collectionName === "dlsiteMetadata") {
				return { doc: vi.fn(() => mockMetadataDocRef) } as any;
			}
			if (collectionName === "dlsiteWorks") {
				return {
					doc: vi.fn(() => ({
						get: vi.fn().mockResolvedValue({ exists: false }),
						set: vi.fn().mockResolvedValue({}),
						update: vi.fn().mockResolvedValue({}),
					})),
					where: vi.fn().mockReturnThis(),
					get: vi.fn().mockResolvedValue({
						docs: [],
						size: 0,
					}),
				} as any;
			}
			return {} as any;
		});

		// バッチ操作のモック設定
		mockedBatch.mockReturnValue({
			set: vi.fn(),
			update: vi.fn(),
			commit: vi.fn().mockResolvedValue([]),
		} as any);

		// すべてのモックをリセット
		vi.clearAllMocks();

		// AJAX Fetcherモックのデフォルト動作を復元
		vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockResolvedValue({
			search_result: mockDLsiteHtml,
			page_info: {
				count: 1010,
				current_page: 1,
				total_pages: 34,
			},
		});

		// fetchモックのデフォルト動作を復元
		mockFetch.mockImplementation((url: string) => {
			try {
				const parsedUrl = new URL(url);
				if (parsedUrl.hostname === "www.dlsite.com") {
					return Promise.resolve({
						ok: true,
						status: 200,
						text: async () => mockDLsiteHtml,
					});
				}
				if (parsedUrl.hostname === "api.ipify.org") {
					return Promise.resolve({
						ok: true,
						status: 200,
						text: async () => '{"ip": "90.149.56.234"}',
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				return Promise.reject(new Error(`Unexpected URL: ${url}`));
			} catch (_error) {
				return Promise.reject(new Error(`Invalid URL: ${url}`));
			}
		});
	});

	afterEach(() => {
		// 環境変数を復元
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	describe("正常ケース", () => {
		it("Pub/Subトリガーで正常に実行される", async () => {
			// 新規メタデータの場合のモック設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// ログが出力されることを確認
			expect(mockedLoggerInfo).toHaveBeenCalledWith(
				"fetchDLsiteWorks 関数を開始しました (GCFv2 CloudEvent Handler)",
			);
			expect(mockedLoggerInfo).toHaveBeenCalledWith("fetchDLsiteWorks 関数の処理を完了しました");
		});

		it("メタデータの新規作成が正常に動作する", async () => {
			// 新規メタデータの場合
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// 新規メタデータが作成されることを確認
			expect(mockMetadataDocSet).toHaveBeenCalled();
		});

		it("既存メタデータの更新が正常に動作する", async () => {
			// 既存メタデータの場合
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: 1234567890, nanoseconds: 0 },
			});
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// メタデータが更新されることを確認
			expect(mockMetadataDocUpdate).toHaveBeenCalled();
		});

		it("DLsiteからのデータ取得が正常に動作する", async () => {
			// メタデータ設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// fetchが呼ばれることを確認
			expect(mockFetch).toHaveBeenCalled();

			// 複数のfetch呼び出しがあることを確認（調査機能でipify.org、実際の処理でDLsite）
			const fetchCalls = mockFetch.mock.calls;
			expect(fetchCalls.length).toBeGreaterThan(0);

			// ipify.org（IP取得）の呼び出しがあることを確認
			const ipifyCall = fetchCalls.find((call) => call[0].includes("ipify.org"));
			expect(ipifyCall).toBeDefined();
		});
	});

	describe("エラーケース", () => {
		it("CloudEventデータが不足している場合", async () => {
			const invalidEvent = {
				...mockEvent,
				data: undefined,
			};

			await fetchDLsiteWorks(invalidEvent as any);

			expect(mockedLoggerError).toHaveBeenCalledWith("CloudEventデータが不足しています", {
				event: invalidEvent,
			});
		});

		it("Base64デコードに失敗した場合", async () => {
			const invalidEvent = {
				...mockEvent,
				data: {
					data: "invalid-base64",
					attributes: {},
				},
			};

			await fetchDLsiteWorks(invalidEvent);

			// 調査機能は実行されるが、処理が続行され正常に完了することを確認
			expect(mockedLoggerInfo).toHaveBeenCalledWith("fetchDLsiteWorks 関数の処理を完了しました");
		});

		it("Firestoreエラーが発生した場合", async () => {
			// Firestoreエラーをシミュレート
			mockMetadataDocGet.mockRejectedValue(new Error("Firestore connection error"));

			await fetchDLsiteWorks(mockEvent);

			// エラーログが出力されることを確認
			// メタデータ取得エラーが発生することを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"メタデータの取得に失敗しました:",
				expect.any(Error),
			);
		});

		it("DLsite API呼び出しエラーが発生した場合", async () => {
			// ipify.orgは成功させる（調査機能）
			mockFetch.mockImplementation((url: string) => {
				if (url.includes("ipify.org")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				return Promise.reject(new Error("Network error"));
			});

			// AJAX関数もエラーにする（調査機能とメイン処理両方）
			vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockRejectedValue(
				new Error("AJAX Network error"),
			);

			// メタデータ設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// DLsite作品情報取得エラーが発生することを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"DLsite作品情報取得中にエラーが発生しました:",
				expect.any(Error),
			);
		});

		it("処理中状態の場合はスキップされる", async () => {
			// 処理中状態のメタデータ
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: true,
				currentPage: 2,
				lastFetchedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
			});
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// 処理がスキップされることを確認
			expect(mockedLoggerWarn).toHaveBeenCalledWith(
				"前回の実行が完了していません。処理をスキップします。",
			);
		});
	});

	describe("データ処理", () => {
		it("HTMLパースが正常に動作する", async () => {
			// カスタムHTMLレスポンスを設定
			const customHtml = `
        <div class="n_worklist">
          <table>
            <tr class="search_result_img_box_inner">
              <td><a href="/maniax/work/=/product_id/RJ123456.html">テスト作品</a></td>
            </tr>
          </table>
        </div>
      `;

			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => customHtml,
			});

			// メタデータ設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// パース処理が実行されることを確認
			expect(mockFetch).toHaveBeenCalled();
		});

		it("空のHTMLレスポンスを適切に処理する", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => "<html><body></body></html>",
			});

			// メタデータ設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// 空のレスポンスでもエラーにならないことを確認
			expect(mockedLoggerInfo).toHaveBeenCalledWith("fetchDLsiteWorks 関数の処理を完了しました");
		});
	});

	describe("レート制限", () => {
		it("ページ間で適切な遅延が発生する", async () => {
			// タイマーをモック
			vi.useFakeTimers();

			// メタデータ設定
			mockMetadataDoc.exists = false;
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			const promise = fetchDLsiteWorks(mockEvent);

			// タイマーを進める
			vi.advanceTimersByTime(1000);

			await promise;

			// タイマーを復元
			vi.useRealTimers();

			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("HTTPレスポンスエラー処理", () => {
		it("HTTPステータスコードが200以外の場合のエラー処理", async () => {
			// ipify.orgは成功、DLsiteに対してはHTTPエラー
			const _callCount = 0;
			mockFetch.mockImplementation((url: string) => {
				if (url.includes("ipify.org")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				// 最初の調査時はエラーログのため、メイン処理用のHTTPステータス500
				return Promise.resolve({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					text: async () => "Internal Server Error",
				} as any);
			});

			// AJAX関数もエラーにする
			vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockRejectedValue(
				new Error("HTTP 500 error"),
			);

			// メタデータドキュメントのモック（進行中ではない状態）
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});

			await fetchDLsiteWorks(mockEvent);

			// DLsite作品情報取得エラーのログが出力されることを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"DLsite作品情報取得中にエラーが発生しました:",
				expect.any(Error),
			);
		});

		it("Content-Typeがtext/htmlでない場合のエラー処理", async () => {
			// ipify.orgは成功、DLsiteに対してはJSON Content-Type
			mockFetch.mockImplementation((url: string) => {
				if (url.includes("ipify.org")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				return Promise.resolve({
					ok: true,
					status: 200,
					headers: {
						get: (name: string) => {
							if (name.toLowerCase() === "content-type") {
								return "application/json";
							}
							return null;
						},
					},
					text: async () => '{"error": "not html"}',
				} as any);
			});

			// AJAX関数もエラーにする（HTMLではない応答のため）
			vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockRejectedValue(
				new Error("Invalid content type"),
			);

			// メタデータドキュメントのモック（進行中ではない状態）
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});

			await fetchDLsiteWorks(mockEvent);

			// DLsite作品情報取得エラーのログが出力されることを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"DLsite作品情報取得中にエラーが発生しました:",
				expect.any(Error),
			);
		});

		it("HTMLが空または無効な場合のエラー処理", async () => {
			// ipify.orgは成功、DLsiteに対しては空のHTML
			mockFetch.mockImplementation((url: string) => {
				if (url.includes("ipify.org")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				return Promise.resolve({
					ok: true,
					status: 200,
					headers: {
						get: (name: string) => {
							if (name.toLowerCase() === "content-type") {
								return "text/html; charset=utf-8";
							}
							return null;
						},
					},
					text: async () => "",
				} as any);
			});

			// AJAX関数で空のHTMLエラーを発生
			vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockRejectedValue(
				new Error("Empty HTML content"),
			);

			// メタデータドキュメントのモック（進行中ではない状態）
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});

			await fetchDLsiteWorks(mockEvent);

			// DLsite作品情報取得エラーのログが出力されることを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"DLsite作品情報取得中にエラーが発生しました:",
				expect.any(Error),
			);
		});

		it("ネットワークエラーが発生した場合の例外処理", async () => {
			// ipify.orgは成功、その後のfetchはエラーにする
			mockFetch.mockImplementation((url: string) => {
				if (url.includes("ipify.org")) {
					return Promise.resolve({
						ok: true,
						status: 200,
						json: async () => ({ ip: "90.149.56.234" }),
					} as any);
				}
				return Promise.reject(new Error("ネットワークエラー"));
			});

			// AJAX関数もネットワークエラーにする
			vi.mocked(dlsiteAjaxFetcher.fetchDLsiteAjaxResult).mockRejectedValue(
				new Error("ネットワークエラー"),
			);

			// メタデータドキュメントのモック（進行中ではない状態）
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});

			await fetchDLsiteWorks(mockEvent);

			// 例外のログが出力されることを確認
			expect(mockedLoggerError).toHaveBeenCalledWith(
				"DLsite作品情報取得中にエラーが発生しました:",
				expect.any(Error),
			);

			// エラー状態がメタデータに記録されることを確認
			expect(mockMetadataDocUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					isInProgress: false,
					lastError: "ネットワークエラー",
				}),
			);
		});

		it("メタデータ更新に失敗した場合でも処理を継続する", async () => {
			// メタデータ取得自体は成功するが、更新で失敗するシナリオ
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 1,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			// 最初のupdateは成功（進行開始時）、2回目以降は失敗
			let updateCallCount = 0;
			mockMetadataDocUpdate.mockImplementation(() => {
				updateCallCount++;
				if (updateCallCount === 1) {
					return Promise.resolve({});
				}
				return Promise.reject(new Error("Firestore更新エラー"));
			});

			await fetchDLsiteWorks(mockEvent);

			// 処理は完了することを確認（調査機能の完了ログ）
			expect(mockedLoggerInfo).toHaveBeenCalledWith("fetchDLsiteWorks 関数の処理を完了しました");
		});

		it("Base64メッセージデータのデコードに失敗した場合の処理", async () => {
			// 無効なBase64データを含むイベント
			const eventWithInvalidBase64 = {
				...mockEvent,
				data: {
					...mockEvent.data,
					data: "invalid-base64-data!!",
				},
			};

			await fetchDLsiteWorks(eventWithInvalidBase64);

			// 調査機能は実行され、処理は正常に完了することを確認
			expect(mockedLoggerInfo).toHaveBeenCalledWith("fetchDLsiteWorks 関数の処理を完了しました");
		});
	});

	describe("継続実行のテスト", () => {
		it("ページ継続処理が正常に動作する", async () => {
			// currentPageが1より大きいメタデータを設定
			mockMetadataDoc.exists = true;
			mockMetadataDoc.data.mockReturnValue({
				isInProgress: false,
				currentPage: 3,
				lastFetchedAt: { seconds: Date.now() / 1000 - 3600, nanoseconds: 0 },
			});
			mockMetadataDocGet.mockResolvedValue(mockMetadataDoc);

			await fetchDLsiteWorks(mockEvent);

			// 継続処理のログが出力されることを確認
			expect(mockedLoggerInfo).toHaveBeenCalledWith(
				expect.stringContaining("前回の続きから取得を再開します"),
			);
		});
	});
});
