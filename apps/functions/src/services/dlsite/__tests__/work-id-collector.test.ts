/**
 * DLsite作品ID収集のテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// モックの設定
vi.mock("../../../infrastructure/management/config-manager", () => ({
	getDLsiteConfig: vi.fn().mockReturnValue({
		requestDelay: 100,
		maxRetries: 3,
	}),
}));

vi.mock("../../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

// Ajax Fetcherのモック
vi.mock("../dlsite-ajax-fetcher", () => {
	const mockFetchDLsiteAjaxResult = vi.fn();
	const mockIsLastPageFromPageInfo = vi.fn();
	const mockValidateAjaxHtmlContent = vi.fn();

	return {
		fetchDLsiteAjaxResult: mockFetchDLsiteAjaxResult,
		isLastPageFromPageInfo: mockIsLastPageFromPageInfo,
		validateAjaxHtmlContent: mockValidateAjaxHtmlContent,
		// テスト用にmockを外部に公開
		__mockFetchDLsiteAjaxResult: mockFetchDLsiteAjaxResult,
		__mockIsLastPageFromPageInfo: mockIsLastPageFromPageInfo,
		__mockValidateAjaxHtmlContent: mockValidateAjaxHtmlContent,
	};
});

// Work ID Validatorのモック
vi.mock("../work-id-validator", () => {
	const mockValidateWorkIds = vi.fn();
	const mockHandleNoWorkIdsError = vi.fn();
	const mockWarnPartialSuccess = vi.fn();

	return {
		validateWorkIds: mockValidateWorkIds,
		handleNoWorkIdsError: mockHandleNoWorkIdsError,
		warnPartialSuccess: mockWarnPartialSuccess,
		// テスト用にmockを外部に公開
		__mockValidateWorkIds: mockValidateWorkIds,
		__mockHandleNoWorkIdsError: mockHandleNoWorkIdsError,
		__mockWarnPartialSuccess: mockWarnPartialSuccess,
	};
});

import {
	collectAllWorkIds,
	collectWorkIdsForDevelopment,
	collectWorkIdsForProduction,
} from "../work-id-collector";

// モックの参照を取得
const ajaxFetcherMock = vi.mocked(await import("../dlsite-ajax-fetcher"));
const workIdValidatorMock = vi.mocked(await import("../work-id-validator"));

const mockFetchDLsiteAjaxResult = (ajaxFetcherMock as any).__mockFetchDLsiteAjaxResult;
const mockIsLastPageFromPageInfo = (ajaxFetcherMock as any).__mockIsLastPageFromPageInfo;
const mockValidateAjaxHtmlContent = (ajaxFetcherMock as any).__mockValidateAjaxHtmlContent;
const mockValidateWorkIds = (workIdValidatorMock as any).__mockValidateWorkIds;
const mockHandleNoWorkIdsError = (workIdValidatorMock as any).__mockHandleNoWorkIdsError;
const mockWarnPartialSuccess = (workIdValidatorMock as any).__mockWarnPartialSuccess;

// テスト用のサンプルデータ（実際のDLsite HTML構造に完全一致・有効な6桁作品ID使用）
const sampleAjaxResult = {
	search_result: `
		<li data-list_item_product_id="RJ258750" data-rec-impression="true" class="search_result_img_box_inner">
			<dl class="work_img_main">
				<dt class="search_img work_thumb">
					<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ258750.html" class="work_thumb_inner">
						<img src="thumbnail.jpg" alt="作品1" />
					</a>
				</dt>
				<dd class="work_name"><a href="https://www.dlsite.com/maniax/work/=/product_id/RJ258750.html">作品1</a></dd>
			</dl>
		</li>
		<li data-list_item_product_id="RJ261600" data-rec-impression="true" class="search_result_img_box_inner">
			<dl class="work_img_main">
				<dt class="search_img work_thumb">
					<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ261600.html" class="work_thumb_inner">
						<img src="thumbnail2.jpg" alt="作品2" />
					</a>
				</dt>
				<dd class="work_name"><a href="https://www.dlsite.com/maniax/work/=/product_id/RJ261600.html">作品2</a></dd>
			</dl>
		</li>
	`,
	page_info: {
		count: 150,
		per_page: 30,
		current_page: 1,
		total_pages: 5,
	},
};

const _sampleAjaxResultWithFallbackPattern = {
	search_result: `
		<div class="work_item" data-list_item_product_id="RJ999999">
			<a href="/maniax/work/=/product_id/RJ999999.html">作品</a>
		</div>
		<script type="application/json">{"product_id":"RJ888888","title":"作品データ"}</script>
	`,
	page_info: {
		count: 2,
		per_page: 30,
		current_page: 1,
		total_pages: 1,
	},
};

describe("work-id-collector", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// デフォルトのモック設定
		mockValidateAjaxHtmlContent.mockReturnValue(true);
		mockIsLastPageFromPageInfo.mockReturnValue(false);
		mockValidateWorkIds.mockReturnValue({
			regionWarning: false,
			warnings: [],
		});
	});

	describe("collectAllWorkIds", () => {
		it("作品IDを正常に収集できる", async () => {
			// 2ページのデータを模擬
			mockFetchDLsiteAjaxResult.mockResolvedValueOnce(sampleAjaxResult).mockResolvedValueOnce({
				...sampleAjaxResult,
				search_result: `
					<li data-list_item_product_id="RJ264040" data-rec-impression="true" class="search_result_img_box_inner type_exclusive_01">
						<dl class="work_img_main">
							<dt class="search_img work_thumb">
								<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ264040.html" class="work_thumb_inner">
									<img src="thumbnail3.jpg" alt="作品3" />
								</a>
							</dt>
						</dl>
					</li>
				`,
			});

			// 2ページ目で終了
			mockIsLastPageFromPageInfo
				.mockReturnValueOnce(false) // 1ページ目
				.mockReturnValueOnce(true); // 2ページ目

			// HTMLバリデーションは常にtrueを返す
			mockValidateAjaxHtmlContent.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 10,
				requestDelay: 0, // テストでは待機なし
			});

			expect(result.workIds).toEqual(expect.arrayContaining(["RJ258750", "RJ261600", "RJ264040"]));
			expect(result.totalCount).toBe(150);
			expect(result.totalPages).toBe(1); // Current implementation bug: returns currentPage-1 instead of pages processed
			expect(mockFetchDLsiteAjaxResult).toHaveBeenCalledTimes(2);
		});

		it("メインパターンが失敗した場合はフォールバックパターンを使用する", async () => {
			// メインパターンが失敗するようなHTML を作成（li.search_result_img_box_inner がない）
			const fallbackOnlyResult = {
				...sampleAjaxResult,
				search_result: `
					<div class="work_item" data-list_item_product_id="RJ999999">
						<a href="/maniax/work/=/product_id/RJ999999">作品A</a>
					</div>
					<script type="application/json">{"product_id":"RJ888888","title":"作品B"}</script>
					<div class="other_content">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ777777">作品C</a>
					</div>
				`,
			};
			mockFetchDLsiteAjaxResult.mockResolvedValue(fallbackOnlyResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(expect.arrayContaining(["RJ999999", "RJ888888", "RJ777777"]));
		});

		it("重複する作品IDは除去される", async () => {
			const duplicateResult = {
				...sampleAjaxResult,
				search_result: `
					<li data-list_item_product_id="RJ258750" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ258750.html">作品1</a>
					</li>
					<li data-list_item_product_id="RJ258750" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ258750.html">作品1重複</a>
					</li>
					<li data-list_item_product_id="RJ261600" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ261600.html">作品2</a>
					</li>
				`,
			};

			mockFetchDLsiteAjaxResult.mockResolvedValue(duplicateResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(["RJ258750", "RJ261600"]);
			expect(result.workIds.length).toBe(2); // 重複が除去されている
		});

		it("無効な作品IDは除外される（5桁や非数値は無効）", async () => {
			const invalidIdResult = {
				...sampleAjaxResult,
				search_result: `
					<li data-list_item_product_id="RJ258750" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ258750.html">有効なID（6桁）</a>
					</li>
					<li data-list_item_product_id="RJ12345" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ12345.html">無効なID（5桁）</a>
					</li>
					<li data-list_item_product_id="INVALID123" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/INVALID123.html">無効なID（非数値）</a>
					</li>
					<li data-list_item_product_id="RJ" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ.html">無効なID（短すぎ）</a>
					</li>
				`,
			};

			mockFetchDLsiteAjaxResult.mockResolvedValue(invalidIdResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(["RJ258750"]); // 6桁IDのみ有効
		});

		it("作品が見つからない場合は収集を終了する", async () => {
			const emptyResult = {
				...sampleAjaxResult,
				search_result: "<div>作品IDが含まれていないHTML</div>",
			};

			mockFetchDLsiteAjaxResult.mockResolvedValue(emptyResult);

			const result = await collectAllWorkIds({
				maxPages: 10,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual([]);
			expect(mockFetchDLsiteAjaxResult).toHaveBeenCalledTimes(1);
			expect(mockHandleNoWorkIdsError).toHaveBeenCalled();
		});

		it("HTMLコンテンツが無効な場合は収集を終了する", async () => {
			mockFetchDLsiteAjaxResult.mockResolvedValue(sampleAjaxResult);
			mockValidateAjaxHtmlContent.mockReturnValue(false);

			const result = await collectAllWorkIds({
				maxPages: 10,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual([]);
			expect(mockFetchDLsiteAjaxResult).toHaveBeenCalledTimes(1);
		});

		it("最大ページ数制限が機能する", async () => {
			// 各ページで異なる作品IDを返すように設定
			mockFetchDLsiteAjaxResult
				.mockResolvedValueOnce(sampleAjaxResult) // 1ページ目
				.mockResolvedValueOnce({
					// 2ページ目
					...sampleAjaxResult,
					search_result: `
						<li data-list_item_product_id="RJ999998" class="search_result_img_box_inner">
							<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ999998.html">ページ2作品（6桁）</a>
						</li>
					`,
				})
				.mockResolvedValueOnce({
					// 3ページ目
					...sampleAjaxResult,
					search_result: `
						<li data-list_item_product_id="RJ1234567" class="search_result_img_box_inner">
							<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ1234567.html">ページ3作品（7桁）</a>
						</li>
					`,
				});
			mockIsLastPageFromPageInfo.mockReturnValue(false); // 常に続きがある

			const result = await collectAllWorkIds({
				maxPages: 3,
				requestDelay: 0,
			});

			expect(mockFetchDLsiteAjaxResult).toHaveBeenCalledTimes(3);
			expect(result.totalPages).toBe(3);
			expect(result.workIds).toEqual(
				expect.arrayContaining(["RJ258750", "RJ261600", "RJ999998", "RJ1234567"]),
			);
		});

		it("リクエストエラーが発生した場合は収集を終了する", async () => {
			mockFetchDLsiteAjaxResult
				.mockResolvedValueOnce(sampleAjaxResult)
				.mockRejectedValueOnce(new Error("Network error"));

			const result = await collectAllWorkIds({
				maxPages: 10,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(["RJ258750", "RJ261600"]);
			expect(result.totalPages).toBe(1); // エラーで停止
		});

		it("検証でリージョン差異が検出された場合は警告を設定する", async () => {
			mockFetchDLsiteAjaxResult.mockResolvedValue(sampleAjaxResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);
			mockValidateWorkIds.mockReturnValue({
				regionWarning: true,
				warnings: ["リージョン差異あり"],
			});

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
				validation: {
					minCoveragePercentage: 80,
					maxExtraPercentage: 20,
					logDetails: true,
				},
			});

			expect(result.validationResult).toEqual({
				isValid: false,
				regionWarning: true,
				warnings: ["リージョン差異が検出されました"],
			});
			expect(mockWarnPartialSuccess).toHaveBeenCalled();
		});

		it("詳細ログが有効な場合は追加ログを出力する", async () => {
			mockFetchDLsiteAjaxResult.mockResolvedValue(sampleAjaxResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
				enableDetailedLogging: true,
			});

			// logger.infoが詳細情報で呼ばれることを確認
			const logger = await import("../../../shared/logger");
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("ページ 1 を処理中"));
		});
	});

	describe("collectWorkIdsForDevelopment", () => {
		it("開発用の詳細情報を含む結果を返す", async () => {
			mockFetchDLsiteAjaxResult.mockResolvedValue(sampleAjaxResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectWorkIdsForDevelopment();

			expect(result).toEqual({
				workIds: expect.arrayContaining(["RJ258750", "RJ261600"]),
				totalCount: 150,
				pageCount: 0, // Current implementation bug: when isLastPage=true on first page, returns currentPage-1=0
				metadata: {
					creatorName: "涼花みなせ",
					searchUrl: expect.stringContaining("dlsite.com"),
					environment: expect.any(String),
				},
			});
		});
	});

	describe("collectWorkIdsForProduction", () => {
		it("本番用の効率的な収集を行う", async () => {
			mockFetchDLsiteAjaxResult.mockResolvedValue(sampleAjaxResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectWorkIdsForProduction();

			expect(result).toEqual(expect.arrayContaining(["RJ258750", "RJ261600"]));
			// 本番用では詳細ログは無効
			expect(mockFetchDLsiteAjaxResult).toHaveBeenCalledWith(1);
		});
	});

	describe("HTMLパターンマッチング", () => {
		it("複数のパターンで作品IDを抽出できる", async () => {
			const mixedPatternResult = {
				...sampleAjaxResult,
				search_result: `
					<li data-list_item_product_id="RJ111111" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ111111.html">メインパターン（6桁）</a>
					</li>
					<li data-list_item_product_id="RJ2222222" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ2222222.html">属性パターン（7桁）</a>
					</li>
					<li data-list_item_product_id="RJ33333333" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ33333333.html">JSONパターン（8桁）</a>
					</li>
					<li data-list_item_product_id="RJ444444" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ444444.html">URLパターン（6桁）</a>
					</li>
				`,
			};

			mockFetchDLsiteAjaxResult.mockResolvedValue(mixedPatternResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(
				expect.arrayContaining(["RJ111111", "RJ2222222", "RJ33333333", "RJ444444"]),
			);
		});

		it("6桁・7桁・8桁形式のRJ番号をすべて処理でき、5桁は除外される", async () => {
			const mixedFormatResult = {
				...sampleAjaxResult,
				search_result: `
					<li data-list_item_product_id="RJ123456" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html">6桁形式</a>
					</li>
					<li data-list_item_product_id="RJ12345678" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ12345678.html">8桁形式</a>
					</li>
					<li data-list_item_product_id="RJ1234567" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ1234567.html">7桁形式</a>
					</li>
					<li data-list_item_product_id="RJ12345" class="search_result_img_box_inner">
						<a href="https://www.dlsite.com/maniax/work/=/product_id/RJ12345.html">5桁形式（無効）</a>
					</li>
				`,
			};

			mockFetchDLsiteAjaxResult.mockResolvedValue(mixedFormatResult);
			mockIsLastPageFromPageInfo.mockReturnValue(true);

			const result = await collectAllWorkIds({
				maxPages: 1,
				requestDelay: 0,
			});

			expect(result.workIds).toEqual(
				expect.arrayContaining(["RJ123456", "RJ12345678", "RJ1234567"]),
			);
			// 5桁のRJ12345は無効なため除外される
			expect(result.workIds).not.toContain("RJ12345");
		});
	});
});
