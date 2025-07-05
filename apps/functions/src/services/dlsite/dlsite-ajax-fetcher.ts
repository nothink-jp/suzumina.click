/**
 * DLsite AJAX API Fetcher
 *
 * DLsiteのAJAXエンドポイントから作品情報を取得する機能を提供します。
 * 従来のHTML直接取得方式よりも効率的で構造化されたデータアクセスを実現します。
 */

import { getDLsiteConfig } from "../../infrastructure/management/config-manager";
import { generateDLsiteHeaders } from "../../infrastructure/management/user-agent-manager";
import * as logger from "../../shared/logger";

/**
 * DLsite AJAX APIのレスポンス型定義
 */
export interface DLsiteAjaxResponse {
	/** HTMLコンテンツ（エスケープ済み） */
	search_result: string;
	/** ページング情報 */
	page_info: {
		/** 総作品数 */
		count: number;
		/** 現在ページの開始インデックス */
		first_indice: number;
		/** 現在ページの終了インデックス */
		last_indice: number;
	};
}

// 設定を取得
const config = getDLsiteConfig();

// DLsite AJAX エンドポイントのベースURL
const DLSITE_AJAX_BASE_URL =
	"https://www.dlsite.com/maniax/fsr/ajax/=/keyword_creater/%22%E6%B6%BC%E8%8A%B1%E3%81%BF%E3%81%AA%E3%81%9B%22/order/release/";

/**
 * DLsiteのAJAXエンドポイントから検索結果を取得
 *
 * @param page - 取得するページ番号（1以上）
 * @returns AJAX APIレスポンス
 * @throws DLsite APIエラー、ネットワークエラー、JSONパースエラー
 */
export async function fetchDLsiteAjaxResult(page: number): Promise<DLsiteAjaxResponse> {
	// ページ番号の検証
	if (page < 1) {
		throw new Error(`無効なページ番号: ${page}. ページ番号は1以上である必要があります。`);
	}

	// URLの構築（ページ1の場合はpageパラメータを省略）
	const url = page === 1 ? DLSITE_AJAX_BASE_URL : `${DLSITE_AJAX_BASE_URL}page/${page}`;

	logger.info(`DLsite AJAX API リクエスト: ${url}`);

	// 初回リクエスト時に追加情報をログ出力
	if (page === 1) {
		logger.info("🔧 AJAX エンドポイント使用: HTML直接取得からの移行");
		logger.info("📊 期待される利点: 構造化レスポンス、正確なページング情報、総作品数の取得");
	}

	try {
		// リクエストヘッダーの準備
		const headers = {
			accept: "application/json",
			"Content-Type": "application/json",
			...generateDLsiteHeaders(),
		};

		// HTTPリクエストの実行
		const response = await fetch(url, {
			headers,
			method: "GET",
			signal: AbortSignal.timeout(config.timeoutMs),
		});

		logger.info(
			`DLsite AJAX レスポンス: ステータス=${response.status}, ` +
				`Content-Type=${response.headers.get("Content-Type")}`,
		);

		// HTTPステータスの確認
		if (!response.ok) {
			const responseText = await response.text();
			logger.error(
				`DLsite AJAX リクエストが失敗しました: ${response.status} ${response.statusText}`,
				{ responsePreview: responseText.substring(0, 500) },
			);
			throw new Error(
				`DLsite AJAX リクエストが失敗しました: ${response.status} ${response.statusText}`,
			);
		}

		// Content-Typeの確認
		const contentType = response.headers.get("Content-Type") || "";
		if (!contentType.includes("application/json")) {
			// text/htmlが返された場合は、エラーページやメンテナンスページの可能性が高い
			logger.error(`予期しないContent-Type: ${contentType}. JSONレスポンスを期待していました。`);

			// HTMLレスポンスの内容を確認してエラーメッセージを改善
			const responseText = await response.text();
			const previewLength = 500;
			logger.error("HTMLレスポンスの内容プレビュー:", {
				preview: responseText.substring(0, previewLength),
				fullLength: responseText.length,
			});

			// よくあるエラーパターンをチェック
			if (responseText.includes("メンテナンス中") || responseText.includes("maintenance")) {
				throw new Error("DLsiteはメンテナンス中です。しばらく待ってから再試行してください。");
			}
			if (responseText.includes("404") || responseText.includes("ページが見つかりません")) {
				throw new Error("DLsite APIエンドポイントが見つかりません。URLを確認してください。");
			}
			if (responseText.includes("アクセス制限") || responseText.includes("rate limit")) {
				throw new Error("DLsiteのレート制限に達しました。しばらく待ってから再試行してください。");
			}

			throw new Error(
				"DLsite AJAX APIが予期しないHTML形式のレスポンスを返しました。" +
					`Content-Type: ${contentType}`,
			);
		}

		// JSONレスポンスのパース
		let jsonData: DLsiteAjaxResponse;
		try {
			const responseText = await response.text();
			jsonData = JSON.parse(responseText) as DLsiteAjaxResponse;
		} catch (parseError) {
			logger.error("JSONパースエラー:", { error: parseError });
			throw new Error("DLsite AJAX APIから無効なJSONレスポンスが返されました");
		}

		// レスポンスの検証
		if (!jsonData.search_result || !jsonData.page_info) {
			logger.error("不正なAJAXレスポンス構造", {
				hasSearchResult: !!jsonData.search_result,
				hasPageInfo: !!jsonData.page_info,
			});
			throw new Error("DLsite AJAX APIから不正なレスポンス構造が返されました");
		}

		// ページング情報のログ出力
		logger.info(
			"DLsite AJAX レスポンス取得成功: " +
				`総作品数=${jsonData.page_info.count}, ` +
				`表示範囲=${jsonData.page_info.first_indice}-${jsonData.page_info.last_indice}`,
		);

		// 取得作品数の計算とログ
		const itemCount = jsonData.page_info.last_indice - jsonData.page_info.first_indice + 1;
		logger.debug(`ページ${page}: ${itemCount}件の作品データを含むHTMLを取得`);

		return jsonData;
	} catch (error) {
		// タイムアウトエラーの特別処理
		if (error instanceof Error && error.name === "AbortError") {
			logger.error(`DLsite AJAX リクエストがタイムアウトしました (${config.timeoutMs}ms)`, {
				page,
			});
			throw new Error(`DLsite AJAX リクエストがタイムアウトしました: ページ${page}`);
		}

		// その他のエラー（既にエラーメッセージが整形されている場合はそのまま投げる）
		if (error instanceof Error) {
			logger.error(`DLsite AJAX リクエスト中にエラーが発生しました: ページ${page}`, {
				error: error.message,
				page,
			});
		}
		throw error;
	}
}

/**
 * AJAX APIから取得したHTMLの妥当性を検証
 *
 * @param html - 検証するHTMLコンテンツ
 * @returns HTMLが有効な場合はtrue
 */
export function validateAjaxHtmlContent(html: string): boolean {
	// 基本的なHTML構造の確認
	if (!html || html.trim().length === 0) {
		logger.warn("AJAX レスポンスのHTMLが空です");
		return false;
	}

	// DLsite検索結果の必須要素の確認
	const requiredElements = [
		'id="search_result_list"',
		'class="n_worklist"',
		"data-list_item_product_id",
	];

	const missingElements = requiredElements.filter((element) => !html.includes(element));

	if (missingElements.length > 0) {
		logger.warn("AJAX レスポンスのHTMLに必須要素が不足しています", { missingElements });
		return false;
	}

	return true;
}

/**
 * ページング情報から最終ページかどうかを判定
 *
 * @param pageInfo - ページング情報
 * @param currentPage - 現在のページ番号
 * @returns 最終ページの場合はtrue
 */
export function isLastPageFromPageInfo(
	pageInfo: DLsiteAjaxResponse["page_info"],
	currentPage: number,
): boolean {
	// 1ページあたりの作品数（通常は30件）
	const itemsPerPage = 30;

	// 総ページ数の計算
	const totalPages = Math.ceil(pageInfo.count / itemsPerPage);

	// 現在のページが最終ページかどうか
	const isLast = currentPage >= totalPages;

	if (isLast) {
		logger.info(
			`最終ページと判定: ページ${currentPage}/${totalPages}, ` + `総作品数=${pageInfo.count}`,
		);
	}

	return isLast;
}

/**
 * AJAX レスポンスから実際の作品数を推定
 *
 * @param html - search_result のHTMLコンテンツ
 * @returns 推定される作品数
 */
export function estimateItemCountFromHtml(html: string): number {
	// data-list_item_product_id属性を持つli要素の数をカウント
	const matches = html.match(/data-list_item_product_id="RJ\d+"/g);
	return matches ? matches.length : 0;
}
