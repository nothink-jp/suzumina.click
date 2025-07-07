/**
 * DLsite統合データマッパー
 *
 * 3種類のデータソースを統合し、効率的なデータ構造を生成します
 * - SearchResultData (検索結果HTML)
 * - DLsiteInfoResponse (Info API)
 * - ExtendedWorkData (詳細ページHTML)
 */

import {
	type DataSourceTracking,
	type DLsiteWorkBase,
	DLsiteWorkBaseSchema,
	type OptimizedFirestoreDLsiteWorkData,
	optimizeDateFormats,
	type PriceInfo,
	parseSizeToBytes,
	type RatingInfo,
} from "@suzumina.click/shared-types";
import * as logger from "../../shared/logger";
import type { DetailPageData } from "./dlsite-detail-parser";
import type { DLsiteInfoResponse } from "./dlsite-mapper";
import {
	extractGenres,
	extractRankingInfo,
	mapToPriceInfo,
	mapToRatingInfo,
} from "./dlsite-mapper";
import type { ParsedWorkData } from "./dlsite-parser";

/**
 * データ統合戦略の設定
 */
export const DATA_MERGE_PRIORITY = {
	// 価格情報: infoAPI > detailPage > searchHTML
	price: ["infoAPI", "detailPage", "searchHTML"] as const,

	// 評価情報: infoAPI > searchHTML
	rating: ["infoAPI", "searchHTML"] as const,

	// クリエイター情報: detailPage.basicInfo > searchHTML
	voiceActors: ["detailPage.basicInfo.voiceActors", "searchHTML.author"] as const,
	scenario: ["detailPage.basicInfo.scenario"] as const,
	illustration: ["detailPage.basicInfo.illustration"] as const,
	music: ["detailPage.basicInfo.music"] as const,

	// 日付情報: detailPage > infoAPI
	releaseDate: ["detailPage.basicInfo.releaseDate", "infoAPI.registDate"] as const,

	// ジャンル情報: 全ソースマージ + 重複除去
	genres: {
		merge: [
			"detailPage.basicInfo.genres",
			"detailPage.basicInfo.detailTags",
			"searchHTML.genres",
			"infoAPI.customGenres",
		] as const,
		deduplication: true,
	},
} as const;

/**
 * 最適化された統合マッパー
 * OptimizedFirestoreDLsiteWorkData構造を生成
 */
export function mapToOptimizedStructure(
	parsed: ParsedWorkData,
	infoData?: DLsiteInfoResponse | null,
	extendedData?: DetailPageData | null,
	existingData?: OptimizedFirestoreDLsiteWorkData | null,
): OptimizedFirestoreDLsiteWorkData {
	const now = new Date().toISOString();

	// 日付情報の最適化
	const rawReleaseDate = extendedData?.basicInfo?.releaseDate || infoData?.regist_date;
	const dateInfo = rawReleaseDate ? optimizeDateFormats(rawReleaseDate) : null;

	// データソース追跡情報の構築
	const dataSources: DataSourceTracking = {
		searchResult: {
			lastFetched: now,
			genres: parsed.tags || [],
			basicInfo: parsed,
		},
		...(infoData && {
			infoAPI: {
				lastFetched: now,
				salesCount: infoData.dl_count,
				wishlistCount: infoData.wishlist_count,
				customGenres: extractGenres(infoData),
			},
		}),
		...(extendedData && {
			detailPage: {
				lastFetched: now,
				basicInfo: {
					...extendedData.basicInfo,
					other: {},
					detailTags: extendedData.basicInfo?.detailTags || [],
				},
				fileInfo: extendedData.fileInfo,
				bonusContent: extendedData.bonusContent || [],
			},
		}),
	};

	// 5種クリエイター情報の統合（詳細ページのみ - APIのauthorは声優なので除外）
	const voiceActors = mergeAndDeduplicate([extendedData?.voiceActors, existingData?.voiceActors]);
	const scenario = mergeAndDeduplicate([extendedData?.scenario, existingData?.scenario]);
	const illustration = mergeAndDeduplicate([
		extendedData?.illustration,
		existingData?.illustration,
	]);
	const music = mergeAndDeduplicate([extendedData?.music, existingData?.music]);
	const author = mergeAndDeduplicate([extendedData?.author, existingData?.author]);

	// ジャンル・タグの明確分離
	const genres = mergeAndDeduplicate([
		extendedData?.basicInfo?.genres,
		extractGenres(infoData || {}), // extractGenres関数を使用してstring[]に変換
		parsed.tags,
	]);
	const tags = mergeAndDeduplicate([extendedData?.basicInfo?.detailTags, parsed.tags]);

	// ファイル情報の拡張
	const fileInfo = extendedData?.fileInfo
		? {
				totalSizeText: extendedData.fileInfo.totalSizeText || "不明",
				totalSizeBytes: parseSizeToBytes(extendedData.fileInfo.totalSizeText),
				totalDuration: extendedData.fileInfo.totalDurationText,
				fileCount: extendedData.fileInfo.formats?.length || 0,
				formats: extendedData.fileInfo.formats || [],
				additionalFiles: extendedData.fileInfo.additionalFiles || [],
			}
		: undefined;

	return {
		// 基本識別情報
		id: parsed.productId,
		productId: parsed.productId,

		// 基本作品情報
		title: parsed.title,
		circle: parsed.circle,
		description: parsed.title || "",
		category: parsed.category,
		originalCategoryText: parsed.originalCategoryText,
		workUrl: parsed.workUrl,
		thumbnailUrl: parsed.thumbnailUrl,
		highResImageUrl: extendedData?.highResImageUrl,

		// 価格・評価情報（統合済み）
		price: selectBestPrice(infoData?.prices?.[0], undefined, mapToPriceInfo(parsed)),
		rating: selectBestRating(mapToRatingInfo(parsed, infoData || undefined), undefined),
		salesCount: infoData?.dl_count,
		wishlistCount: infoData?.wishlist_count,
		totalDownloadCount: infoData?.dl_count,

		// 統一クリエイター情報（5種類のみ）
		voiceActors,
		scenario,
		illustration,
		music,
		author,

		// ジャンル・タグ明確分離
		genres,
		tags,
		customTags: extractGenres(infoData || {}),

		// 日付情報完全対応
		releaseDate: dateInfo?.original,
		releaseDateISO: dateInfo?.iso,
		releaseDateDisplay: dateInfo?.display,

		// 拡張メタデータ
		seriesName: extendedData?.basicInfo?.seriesName,
		ageRating: parsed.ageRating,
		workFormat: undefined,
		fileFormat: undefined,

		// 拡張ファイル情報
		fileInfo,

		// 詳細情報
		bonusContent: extendedData?.bonusContent || [],
		sampleImages: parsed.sampleImages || [],
		isExclusive: parsed.isExclusive || false,

		// 統合データソース追跡
		dataSources,

		// システム管理情報
		lastFetchedAt: now,
		createdAt: existingData?.createdAt || now,
		updatedAt: now,
	};
}

/**
 * 統合データ構造の型定義（既存・下位互換性用）
 */
export interface UnifiedDLsiteWorkData extends DLsiteWorkBase {
	// === 5種類の統一クリエイター情報 ===
	author: string[];
	// === ソース別データ（デバッグ・品質管理用） ===
	dataSources: {
		searchResult?: {
			lastFetched: string;
			genres: string[];
		};
		infoAPI?: {
			lastFetched: string;
			salesCount?: number;
			wishlistCount?: number;
			customGenres?: string[];
		};
		detailPage?: {
			lastFetched: string;
			basicInfo: any; // ExtendedWorkData.basicInfo
			detailedDescription: string;
		};
	};

	// === 販売日の両形式保持 ===
	releaseDateDisplay?: string; // 日本語形式 - 表示用
	releaseDate?: string; // ISO形式 - ソート用
}

/**
 * 配列のマージと重複除去
 */
function mergeAndDeduplicate(arrays: (string[] | undefined)[]): string[] {
	const merged = arrays.filter(Boolean).flat() as string[];
	return [...new Set(merged)];
}

/**
 * 最適な価格情報を選択
 */
function selectBestPrice(infoPrice?: any, detailPrice?: any, searchPrice?: PriceInfo): PriceInfo {
	// 優先順: infoAPI > detailPage > searchHTML
	if (infoPrice && typeof infoPrice === "object") {
		return infoPrice;
	}
	if (detailPrice && typeof detailPrice === "object") {
		return detailPrice;
	}
	if (searchPrice) {
		return searchPrice;
	}

	// フォールバック値
	return {
		current: 0,
		currency: "JPY",
	};
}

/**
 * 最適な評価情報を選択
 */
function selectBestRating(
	infoRating?: RatingInfo,
	searchRating?: RatingInfo,
): RatingInfo | undefined {
	// 優先順: infoAPI > searchHTML
	if (infoRating && infoRating.count > 0) {
		return infoRating;
	}
	if (searchRating && searchRating.count > 0) {
		return searchRating;
	}
	return undefined;
}

/**
 * 声優情報を作者情報から分離（将来使用予定）
 */
// function filterAuthorFromVoiceActors(
// 	authors: string[],
// 	voiceActors: string[]
// ): string[] {
// 	return authors.filter(author => !voiceActors.includes(author));
// }

/**
 * 日本語日付をISO形式に変換
 */
function parseToISODate(japaneseDate?: string): string | undefined {
	if (!japaneseDate) return undefined;

	try {
		// "2025年06月14日" -> "2025-06-14"
		const match = japaneseDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
		if (match) {
			const [, year, month, day] = match;
			if (month && day) {
				const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
				// 有効な日付かチェック
				const date = new Date(isoDate);
				if (date.getFullYear().toString() === year) {
					return isoDate;
				}
			}
		}
	} catch (error) {
		logger.warn(`日付変換エラー: ${japaneseDate}`, { error });
	}

	return undefined;
}

/**
 * URL正規化
 */
function normalizeUrl(url: string): string {
	if (url.startsWith("//")) {
		return `https:${url}`;
	}
	if (url.startsWith("/")) {
		return `https://www.dlsite.com${url}`;
	}
	return url;
}

/**
 * 3種類のデータソースを統合してUnifiedDLsiteWorkDataを生成
 */
export function mergeWorkDataSources(
	searchData?: ParsedWorkData,
	infoData?: DLsiteInfoResponse,
	detailData?: DetailPageData,
	existingData?: OptimizedFirestoreDLsiteWorkData,
): UnifiedDLsiteWorkData {
	if (!searchData) {
		throw new Error("検索結果データ (searchData) は必須です");
	}

	const now = new Date().toISOString();

	// 基本価格・評価情報の統合
	const searchPrice = mapToPriceInfo(searchData);
	const searchRating = mapToRatingInfo(searchData);
	const infoRating = infoData ? mapToRatingInfo(searchData, infoData) : undefined;

	const unifiedPrice = selectBestPrice(
		infoData?.prices?.[0], // Info APIの価格
		undefined, // 詳細ページには価格情報なし
		searchPrice,
	);

	const unifiedRating = selectBestRating(infoRating, searchRating);

	// 統合クリエイター情報（重複除去済み）- APIのauthorは声優なので除外
	const unifiedVoiceActors = mergeAndDeduplicate([
		detailData?.voiceActors || [],
		(detailData?.basicInfo as any)?.voiceActors || [],
		existingData?.voiceActors || [], // 既存データ保持
	]);

	const unifiedScenario = mergeAndDeduplicate([
		detailData?.scenario || [],
		(detailData?.basicInfo as any)?.scenario || [],
		existingData?.scenario || [], // 既存データ保持
	]);

	const unifiedIllustration = mergeAndDeduplicate([
		detailData?.illustration || [],
		(detailData?.basicInfo as any)?.illustration || [],
		existingData?.illustration || [], // 既存データ保持
	]);

	const unifiedMusic = mergeAndDeduplicate([
		detailData?.music || [],
		(detailData?.basicInfo as any)?.music || [],
		existingData?.music || [], // 既存データ保持
	]);

	// 作者情報（5種類目のクリエイター情報）
	const unifiedAuthor = mergeAndDeduplicate([
		detailData?.author || [],
		existingData?.author || [], // 既存データ保持
	]);

	// 統合ジャンル情報（全ソースマージ + 重複除去）
	const unifiedGenres = mergeAndDeduplicate([
		(detailData?.basicInfo as any)?.genres || [],
		(detailData?.basicInfo as any)?.detailTags || [],
		searchData.tags || [],
		infoData?.genres || [],
		existingData?.tags || [], // 既存データ保持
	]);

	// 販売日（両形式保持）
	const japaneseReleaseDate = (detailData?.basicInfo as any)?.releaseDate;
	const isoReleaseDate = parseToISODate(japaneseReleaseDate) || infoData?.regist_date;

	// 統合作品データ
	const unifiedWork: UnifiedDLsiteWorkData = {
		// === 基本識別情報 ===
		id: searchData.productId,
		productId: searchData.productId,

		// === 基本作品情報（トップレベル - 頻繁アクセス） ===
		title: searchData.title,
		circle: searchData.circle,
		description: detailData?.detailedDescription || "",
		category: searchData.category,
		workUrl: normalizeUrl(searchData.workUrl),
		thumbnailUrl: normalizeUrl(searchData.thumbnailUrl),
		highResImageUrl: detailData?.highResImageUrl,

		// === 価格・評価情報（統合） ===
		price: unifiedPrice,
		rating: unifiedRating,
		salesCount: infoData?.dl_count || searchData.salesCount,

		// === 統一クリエイター情報（5種類のみ - 重複排除済み） ===
		voiceActors: unifiedVoiceActors,
		scenario: unifiedScenario,
		illustration: unifiedIllustration,
		music: unifiedMusic,
		author: unifiedAuthor,

		// === 統一作品メタデータ（重複排除済み） ===
		releaseDate: isoReleaseDate,
		releaseDateDisplay: japaneseReleaseDate,
		seriesName: detailData?.basicInfo?.seriesName,
		ageRating: detailData?.basicInfo?.ageRating || searchData.ageRating,
		workFormat: detailData?.basicInfo?.workFormat,
		fileFormat: detailData?.basicInfo?.fileFormat,
		tags: unifiedGenres,

		// === その他基本情報 ===
		sampleImages: searchData.sampleImages.map((img) => ({
			thumb: normalizeUrl(img.thumb),
			width: img.width,
			height: img.height,
		})),
		isExclusive: searchData.isExclusive || false,

		// === infoAPI追加データ ===
		makerId: infoData?.maker_id,
		ageCategory: infoData?.age_category,
		registDate: infoData?.regist_date,
		options: infoData?.work_options,
		wishlistCount: infoData?.wishlist_count,
		totalDownloadCount: infoData?.dl_count,
		rankingHistory: infoData ? extractRankingInfo(infoData) : undefined,

		// === 詳細情報（階層化 - 低頻度アクセス） ===
		fileInfo: detailData?.fileInfo,
		bonusContent: detailData?.bonusContent || [],

		// === 詳細API情報 ===
		localePrices: infoData?.prices?.map((p) => ({
			currency: p.currency,
			price: p.price,
			priceString: p.price_string,
		})),
		campaignInfo: infoData?.campaign
			? {
					campaignId: infoData.campaign.campaign_id,
					discountCampaignId: infoData.campaign.discount_campaign_id,
					discountEndDate: infoData.campaign.discount_end_date,
					discountUrl: infoData.campaign.discount_url,
				}
			: undefined,
		seriesInfo: infoData?.title
			? {
					titleId: infoData.title.title_id,
					titleName: infoData.title.title_name,
					titleWorkCount: infoData.title.title_work_count,
					isTitleCompleted: infoData.title.is_title_completed,
				}
			: undefined,
		translationInfo: infoData?.translation
			? {
					isTranslationAgree: infoData.translation.is_translation_agree,
					isVolunteer: infoData.translation.is_volunteer,
					isOriginal: infoData.translation.is_original,
					isParent: infoData.translation.is_parent,
					isChild: infoData.translation.is_child,
					originalWorkno: infoData.translation.original_workno,
					parentWorkno: infoData.translation.parent_workno,
					childWorknos: infoData.translation.child_worknos,
					lang: infoData.translation.lang,
					productionTradePriceRate: infoData.translation.production_trade_price_rate,
				}
			: undefined,
		languageDownloads: infoData?.language_editions?.map((le) => ({
			workno: le.workno,
			editionId: le.edition_id,
			editionType: le.edition_type,
			displayOrder: le.display_order,
			label: le.label,
			lang: le.lang,
			dlCount: le.dl_count || "0", // undefinedの場合はデフォルト値を設定
			displayLabel: le.display_label || le.label, // undefinedの場合はlabelを使用
		})),
		salesStatus: infoData?.sales_status
			? {
					isSale: infoData.sales_status.is_sale,
					onSale: infoData.sales_status.on_sale,
					isDiscount: infoData.sales_status.is_discount,
					isPointup: infoData.sales_status.is_pointup,
					isFree: infoData.sales_status.is_free,
					isRental: infoData.sales_status.is_rental,
					isSoldOut: infoData.sales_status.is_sold_out,
					isReserveWork: infoData.sales_status.is_reserve_work,
					isReservable: infoData.sales_status.is_reservable,
					isTimesale: infoData.sales_status.is_timesale,
					dlsiteplayWork: infoData.sales_status.dlsiteplay_work,
				}
			: undefined,
		defaultPointRate: infoData?.default_point_rate,
		customGenres: extractGenres(infoData || {}),

		// === ソース別データ（デバッグ・品質管理用） ===
		dataSources: {
			searchResult: {
				lastFetched: now,
				genres: searchData.tags || [],
			},
			infoAPI: infoData
				? {
						lastFetched: now,
						salesCount: infoData.dl_count,
						wishlistCount: infoData.wishlist_count,
						customGenres: extractGenres(infoData),
					}
				: undefined,
			detailPage: detailData
				? {
						lastFetched: now,
						basicInfo: detailData.basicInfo,
						detailedDescription: detailData.detailedDescription,
					}
				: undefined,
		},
	};

	// データ構造の検証
	try {
		return DLsiteWorkBaseSchema.parse(unifiedWork) as UnifiedDLsiteWorkData;
	} catch (error) {
		logger.warn("データ統合時の検証エラー:", { error, productId: searchData.productId });
		// エラー時でも基本データは返す
		return unifiedWork;
	}
}

/**
 * 条件付きデータ取得戦略
 */
export type DataFetchStrategy = "minimal" | "standard" | "comprehensive";

// convertToFirestoreFormat関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

// mapToWorkBaseWithExistingData関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

/**
 * データ品質レポート生成
 */
export function generateDataQualityReport(data: UnifiedDLsiteWorkData): {
	completeness: number;
	dataSourceCoverage: string[];
	missingFields: string[];
	qualityScore: number;
} {
	const requiredFields = ["title", "circle", "price", "thumbnailUrl", "workUrl"];
	const optionalHighValueFields = ["voiceActors", "rating", "description", "tags", "releaseDate"];

	const missingRequired = requiredFields.filter(
		(field) => !data[field as keyof UnifiedDLsiteWorkData],
	);
	const missingOptional = optionalHighValueFields.filter((field) => {
		const value = data[field as keyof UnifiedDLsiteWorkData];
		return !value || (Array.isArray(value) && value.length === 0);
	});

	const completeness =
		((requiredFields.length - missingRequired.length) / requiredFields.length) * 100;
	const dataSourceCoverage = Object.keys(data.dataSources).filter(
		(key) => data.dataSources[key as keyof typeof data.dataSources],
	);

	let qualityScore = completeness;
	if (dataSourceCoverage.length >= 2) qualityScore += 15;
	if (dataSourceCoverage.length >= 3) qualityScore += 10;
	if (data.voiceActors.length > 0) qualityScore += 10;
	if (data.rating && data.rating.count > 0) qualityScore += 5;

	return {
		completeness,
		dataSourceCoverage,
		missingFields: [...missingRequired, ...missingOptional],
		qualityScore: Math.min(100, qualityScore),
	};
}
