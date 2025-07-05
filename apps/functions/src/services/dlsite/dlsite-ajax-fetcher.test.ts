/**
 * DLsite AJAX Fetcher テスト
 */

import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type DLsiteAjaxResponse,
	estimateItemCountFromHtml,
	fetchDLsiteAjaxResult,
	isLastPageFromPageInfo,
	validateAjaxHtmlContent,
} from "./dlsite-ajax-fetcher";

// モックの設定
vi.mock("../../infrastructure/management/config-manager", () => ({
	getDLsiteConfig: vi.fn(() => ({
		timeoutMs: 30000,
		requestDelay: 1000,
		maxPagesPerExecution: 10,
		maxRetries: 3,
		retryDelayMs: 1000,
		itemsPerPage: 100,
	})),
}));

vi.mock("../../infrastructure/management/user-agent-manager", () => ({
	generateDLsiteHeaders: vi.fn(() => ({
		"User-Agent": "Mozilla/5.0 (Test)",
		"Accept-Language": "ja-JP,ja;q=0.9",
	})),
}));

vi.mock("../../shared/logger", () => ({
	info: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

// fetch のモック
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe("DLsite AJAX Fetcher", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchDLsiteAjaxResult", () => {
		it("正常なレスポンスを処理できる", async () => {
			const mockResponse: DLsiteAjaxResponse = {
				search_result:
					'<div id="search_result_list"><ul class="n_worklist"><li data-list_item_product_id="RJ123456"></li></ul></div>',
				page_info: {
					count: 1471,
					first_indice: 1,
					last_indice: 30,
				},
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: "OK",
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				text: async () => JSON.stringify(mockResponse),
			});

			const result = await fetchDLsiteAjaxResult(1);

			expect(result).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/",
				expect.objectContaining({
					headers: expect.objectContaining({
						accept: "application/json",
						"Content-Type": "application/json",
					}),
					method: "GET",
				}),
			);
		});

		it("ページ2以降の場合、正しいURLを構築する", async () => {
			const mockResponse: DLsiteAjaxResponse = {
				search_result: '<div id="search_result_list"></div>',
				page_info: {
					count: 1471,
					first_indice: 31,
					last_indice: 60,
				},
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				text: async () => JSON.stringify(mockResponse),
			});

			await fetchDLsiteAjaxResult(2);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/page/2",
				expect.any(Object),
			);
		});

		it("無効なページ番号でエラーを投げる", async () => {
			await expect(fetchDLsiteAjaxResult(0)).rejects.toThrow(
				"無効なページ番号: 0. ページ番号は1以上である必要があります。",
			);
		});

		it("HTTPエラーを適切に処理する", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				headers: new Headers({
					"Content-Type": "text/html",
				}),
				text: async () => "Page not found",
			});

			await expect(fetchDLsiteAjaxResult(1)).rejects.toThrow(
				"DLsite AJAX リクエストが失敗しました: 404 Not Found",
			);
		});

		it("JSONパースエラーを適切に処理する", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				text: async () => "Invalid JSON content",
			});

			await expect(fetchDLsiteAjaxResult(1)).rejects.toThrow(
				"DLsite AJAX APIから無効なJSONレスポンスが返されました",
			);
		});

		it("HTMLレスポンスを適切に処理する", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "text/html; charset=utf-8",
				}),
				text: async () => "<html><body>メンテナンス中</body></html>",
			});

			await expect(fetchDLsiteAjaxResult(1)).rejects.toThrow(
				"DLsiteはメンテナンス中です。しばらく待ってから再試行してください。",
			);
		});

		it("レート制限HTMLレスポンスを適切に処理する", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "text/html",
				}),
				text: async () => "<html><body>アクセス制限中です</body></html>",
			});

			await expect(fetchDLsiteAjaxResult(1)).rejects.toThrow(
				"DLsiteのレート制限に達しました。しばらく待ってから再試行してください。",
			);
		});

		it("不正なレスポンス構造でエラーを投げる", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({
					"Content-Type": "application/json",
				}),
				text: async () => JSON.stringify({ invalid: "response" }),
			});

			await expect(fetchDLsiteAjaxResult(1)).rejects.toThrow(
				"DLsite AJAX APIから不正なレスポンス構造が返されました",
			);
		});
	});

	describe("validateAjaxHtmlContent", () => {
		it("有効なHTMLコンテンツを検証できる", () => {
			const validHtml = `
				<div id="search_result_list">
					<ul class="n_worklist">
						<li data-list_item_product_id="RJ123456"></li>
					</ul>
				</div>
			`;

			expect(validateAjaxHtmlContent(validHtml)).toBe(true);
		});

		it("空のHTMLコンテンツは無効と判定する", () => {
			expect(validateAjaxHtmlContent("")).toBe(false);
			expect(validateAjaxHtmlContent("   ")).toBe(false);
		});

		it("必須要素が不足している場合は無効と判定する", () => {
			const invalidHtml = "<div>Invalid content</div>";
			expect(validateAjaxHtmlContent(invalidHtml)).toBe(false);
		});
	});

	describe("isLastPageFromPageInfo", () => {
		it("最終ページを正しく判定できる", () => {
			const pageInfo = {
				count: 100,
				first_indice: 91,
				last_indice: 100,
			};

			// 100件で30件/ページの場合、4ページ目が最終
			expect(isLastPageFromPageInfo(pageInfo, 4)).toBe(true);
			expect(isLastPageFromPageInfo(pageInfo, 3)).toBe(false);
		});

		it("1ページしかない場合も正しく判定できる", () => {
			const pageInfo = {
				count: 25,
				first_indice: 1,
				last_indice: 25,
			};

			expect(isLastPageFromPageInfo(pageInfo, 1)).toBe(true);
		});
	});

	describe("estimateItemCountFromHtml", () => {
		it("HTML内の作品数を正しくカウントできる", () => {
			const html = `
				<li data-list_item_product_id="RJ123456"></li>
				<li data-list_item_product_id="RJ234567"></li>
				<li data-list_item_product_id="RJ345678"></li>
			`;

			expect(estimateItemCountFromHtml(html)).toBe(3);
		});

		it("作品が存在しない場合は0を返す", () => {
			const html = "<div>No products</div>";
			expect(estimateItemCountFromHtml(html)).toBe(0);
		});
	});
});
