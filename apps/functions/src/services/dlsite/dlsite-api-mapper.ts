/**
 * DLsite Individual Info API専用マッパー
 *
 * 100% API-Only アーキテクチャ対応
 * HTMLスクレイピング依存関数を完全削除し、APIのみでデータ処理
 */

import {
	type DataSourceTracking,
	type OptimizedFirestoreDLsiteWorkData,
	optimizeDateFormats,
} from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";

/**
 * DLsite Individual Info API レスポンス型定義
 * 254フィールドから重要なフィールドを抽出
 */
export interface DLsiteInfoResponse {
	// === 基本情報 ===
	workno?: string; // 作品ID (RJ01415251)
	work_name?: string; // 作品名
	maker_id?: string; // メーカーID
	maker_name?: string; // メーカー・サークル名
	age_category?: number; // 年齢制限カテゴリ
	site_id?: string; // サイトID
	regist_date?: string; // 登録日
	work_options?: string; // 作品オプション
	file_type?: string; // ファイル形式
	file_size?: number; // ファイルサイズ(MB)
	author?: string; // 作者・声優情報

	// === 評価情報 ===
	rate_average?: number; // 平均評価（旧フィールド）
	rate_average_star?: number; // 実際の評価（10-50の範囲）
	rate_average_2dp?: number; // 小数点2桁の平均評価
	rate_count?: number; // 評価数
	rate_count_detail?: {
		"1"?: number;
		"2"?: number;
		"3"?: number;
		"4"?: number;
		"5"?: number;
	};

	// === 販売・統計情報 ===
	dl_count?: number; // ダウンロード数
	wishlist_count?: number; // ウィッシュリスト数
	review_count?: number; // レビュー数

	// === 価格情報 ===
	prices?: Array<{
		currency: string;
		price: number;
		price_string: string;
	}>;

	// === ジャンル情報 ===
	genres?: Array<{
		name: string;
		id: number;
		search_val: string;
		name_base: string;
	}>;

	// === 画像情報 ===
	thumb_url?: string; // サムネイル画像URL

	// === シリーズ情報 ===
	title?: {
		title_id: string;
		title_name: string;
		title_work_count: number;
		is_title_completed: boolean;
	};

	// === キャンペーン情報 ===
	campaign?: {
		campaign_id: string;
		discount_campaign_id: string;
		discount_end_date: string;
		discount_url: string;
	};

	// === 翻訳情報 ===
	translation?: {
		is_translation_agree?: boolean;
		is_volunteer?: boolean;
		is_original?: boolean;
		is_parent?: boolean;
		is_child?: boolean;
		original_workno?: string;
		parent_workno?: string;
		child_worknos?: string[];
		lang?: string;
		production_trade_price_rate?: number;
	};

	// === 言語版情報 ===
	language_editions?: Array<{
		workno: string;
		edition_id: number;
		edition_type: string;
		display_order: number;
		label: string;
		lang: string;
		dl_count?: string;
		display_label?: string;
	}>;

	// === ランキング情報 ===
	rank?: Array<{
		term: string;
		category: string;
		rank: number;
		rank_date: string;
	}>;

	// === 販売状態フラグ ===
	sales_status?: {
		is_sale?: boolean;
		on_sale?: number;
		is_discount?: boolean;
		is_pointup?: boolean;
		is_free?: boolean;
		is_rental?: boolean;
		is_sold_out?: boolean;
		is_reserve_work?: boolean;
		is_reservable?: boolean;
		is_timesale?: boolean;
		dlsiteplay_work?: boolean;
	};

	// === その他 ===
	default_point_rate?: number;
}

/**
 * Individual Info API データを OptimizedFirestoreDLsiteWorkData 形式に変換
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex data mapping logic required for API integration
export function mapApiToOptimizedStructure(
	infoData: DLsiteInfoResponse,
	existingData?: OptimizedFirestoreDLsiteWorkData | null,
): OptimizedFirestoreDLsiteWorkData {
	const now = new Date().toISOString();

	// APIからの日付情報最適化
	const rawReleaseDate = infoData?.regist_date;
	const dateInfo = rawReleaseDate ? optimizeDateFormats(rawReleaseDate) : null;

	// API-Only データソース追跡情報
	const dataSources: DataSourceTracking = {
		infoAPI: {
			lastFetched: now,
			wishlistCount: infoData.wishlist_count,
			customGenres: extractGenres(infoData),
		},
	};

	// APIからのクリエイター情報統合
	const voiceActors = mergeAndDeduplicate([
		infoData?.author ? [infoData.author] : [],
		existingData?.voiceActors,
	]);
	const scenario = mergeAndDeduplicate([existingData?.scenario]);
	const illustration = mergeAndDeduplicate([existingData?.illustration]);
	const music = mergeAndDeduplicate([existingData?.music]);
	const author = mergeAndDeduplicate([
		infoData?.author ? [infoData.author] : [],
		existingData?.author,
	]);

	// APIからのジャンル情報
	const genres = mergeAndDeduplicate([extractGenres(infoData), existingData?.genres]);

	// APIからのファイル情報（廃止済み）
	// const fileInfo = infoData?.file_size
	// 	? {
	// 			totalSizeText: `${infoData.file_size.toString()}MB`,
	// 			totalSizeBytes: (infoData.file_size || 0) * 1024 * 1024,
	// 			totalDuration: undefined,
	// 			fileCount: 1,
	// 			formats: infoData.file_type ? [infoData.file_type] : [],
	// 			additionalFiles: [],
	// 		}
	// 	: undefined;

	return {
		// 基本識別情報
		id: infoData.workno || "",
		productId: infoData.workno || "",

		// APIからの基本作品情報
		title: infoData.work_name || "",
		circle: infoData.maker_name || "",
		description: infoData.work_name || "",
		category: "etc" as const, // API age_categoryをWorkCategory enumに適切にマッピング要
		originalCategoryText: infoData.site_id || "",
		workUrl: `https://www.dlsite.com/maniax/work/=/product_id/${infoData.workno}.html`,
		thumbnailUrl: normalizeImageUrl(infoData.thumb_url) || "",
		highResImageUrl: normalizeImageUrl(infoData.thumb_url),

		// APIからの価格・評価情報
		price: infoData?.prices?.[0]
			? {
					current: infoData.prices[0].price,
					currency: infoData.prices[0].currency,
					original: undefined,
					discount: undefined,
					point: undefined,
				}
			: {
					current: 0,
					currency: "JPY",
				},
		rating: infoData?.rate_average_2dp
			? {
					stars: infoData.rate_average_2dp / 10, // API評価は10-50の範囲なので1-5に変換
					count: infoData.rate_count || 0,
					averageDecimal: infoData.rate_average_2dp / 10,
				}
			: undefined,
		wishlistCount: infoData?.wishlist_count,
		totalDownloadCount: infoData?.dl_count,

		// 統一クリエイター情報（5種類のみ）
		voiceActors,
		scenario,
		illustration,
		music,
		author,

		// DLsite公式ジャンル
		genres,

		// 日付情報完全対応
		releaseDate: dateInfo?.original,
		releaseDateISO: dateInfo?.iso,
		releaseDateDisplay: dateInfo?.display,

		// APIからのメタデータ
		seriesName: infoData?.title?.title_name,
		ageRating: infoData?.age_category?.toString(),
		workFormat: infoData?.work_options,
		fileFormat: infoData?.file_type,

		// 拡張ファイル情報は廃止済み
		// fileInfo,

		// APIからの詳細情報（廃止済み）
		// bonusContent: [],
		sampleImages: [],
		isExclusive: false,

		// Individual Info API特有データ
		creaters: undefined, // このAPIでは利用不可

		// Individual Info API準拠フィールド
		apiGenres:
			infoData.genres?.map((genre) => ({
				name: genre.name,
				id: genre.id,
				search_val: genre.search_val,
			})) || [],
		apiCustomGenres: [], // このAPIでは利用不可
		apiWorkOptions: infoData.work_options
			? { [infoData.work_options]: { name: infoData.work_options } }
			: {},

		// 統合データソース追跡
		dataSources,

		// システム管理情報
		lastFetchedAt: now,
		createdAt: existingData?.createdAt || now,
		updatedAt: now,
	};
}

/**
 * APIデータからジャンル情報を抽出
 */
export function extractGenres(infoData: DLsiteInfoResponse): string[] {
	if (!infoData.genres || !Array.isArray(infoData.genres)) {
		return [];
	}

	return infoData.genres.map((genre) => genre.name).filter(Boolean);
}

/**
 * 配列のマージと重複除去
 */
function mergeAndDeduplicate(arrays: (string[] | undefined)[]): string[] {
	const merged = arrays.filter(Boolean).flat() as string[];
	return [...new Set(merged)];
}

/**
 * プロトコル相対URLを絶対URLに正規化
 * "//img.dlsite.jp/..." -> "https://img.dlsite.jp/..."
 */
function normalizeImageUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;

	// プロトコル相対URLを検出して正規化
	if (url.startsWith("//")) {
		return `https:${url}`;
	}

	// 既に正しい形式の場合はそのまま返す
	return url;
}

/**
 * APIのみからワーク情報を取得・変換
 */
export async function fetchWorkInfoFromAPI(
	productId: string,
): Promise<OptimizedFirestoreDLsiteWorkData | null> {
	try {
		// Individual Info API呼び出し（実装は別ファイル）
		const url = `https://www.dlsite.com/maniax-touch/product/info/ajax?product_id=${productId}`;

		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		const apiData = (await response.json()) as DLsiteInfoResponse;

		if (!apiData.workno) {
			return null;
		}

		return mapApiToOptimizedStructure(apiData);
	} catch (error) {
		logger.error(`Failed to fetch work info from API: ${productId}`, { error });
		return null;
	}
}
