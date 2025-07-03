/**
 * DLsite データマッパー
 *
 * HTMLパーサーから得られた生データを型安全なデータ構造に変換します。
 */

import {
	type CampaignInfo,
	type DLsiteWorkBase,
	DLsiteWorkBaseSchema,
	type FirestoreDLsiteWorkData,
	FirestoreDLsiteWorkSchema,
	type LanguageDownload,
	type LocalePrice,
	type PriceInfo,
	type RankingInfo,
	type RatingDetail,
	type RatingInfo,
	type SalesStatus,
	type SeriesInfo,
	type TranslationInfo,
} from "@suzumina.click/shared-types";
import type { ExtendedWorkData } from "./dlsite-detail-parser";
import { fetchAndParseWorkDetail } from "./dlsite-detail-parser";
import type { ParsedWorkData } from "./dlsite-parser";
import * as logger from "./logger";

/**
 * DLsite info エンドポイントのレスポンス型定義
 */
export interface DLsiteInfoResponse {
	// 基本情報
	work_name?: string;
	maker_id?: string;
	maker_name?: string;
	age_category?: number;
	regist_date?: string;
	work_options?: string;

	// 評価情報
	rate_average?: number;
	rate_average_2dp?: number;
	rate_count?: number;
	rate_count_detail?: Array<{
		review_point: number;
		count: number;
		ratio: number;
	}>;

	// 統計情報
	dl_count?: number;
	wishlist_count?: number;
	review_count?: number;

	// ランキング情報
	rank?: Array<{
		term: string;
		category: string;
		rank: number;
		rank_date: string;
	}>;

	// 価格情報（多通貨）
	prices?: Array<{
		currency: string;
		price: number;
		price_string: string;
	}>;

	// キャンペーン情報
	campaign?: {
		campaign_id?: string;
		discount_campaign_id?: number;
		discount_end_date?: string;
		discount_url?: string;
	};

	// シリーズ情報
	title?: {
		title_id?: string;
		title_name?: string;
		title_work_count?: number;
		is_title_completed?: boolean;
	};

	// 翻訳情報
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

	// 言語別ダウンロード情報
	language_editions?: Array<{
		workno: string;
		edition_id?: number;
		edition_type?: string;
		display_order?: number;
		label: string;
		lang: string;
		dl_count: string;
		display_label: string;
	}>;

	// 販売状態フラグ
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

	// その他
	default_point_rate?: number;
	genres?: string[];
	voice_actors?: string[];
}

/**
 * DLsiteのinfoエンドポイントから作品の詳細情報を取得
 */
export async function fetchWorkInfo(productId: string): Promise<DLsiteInfoResponse | null> {
	try {
		const url = `https://www.dlsite.com/maniax/api/=/product.json?workno=${productId}`;

		logger.debug(`DLsite info API リクエスト: ${url}`);

		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "application/json, text/plain, */*",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
				Referer: "https://www.dlsite.com/",
			},
		});

		if (!response.ok) {
			logger.warn(
				`DLsite info API エラー (${productId}): ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const data = await response.json();

		// APIレスポンスの基本的な検証
		if (!data || typeof data !== "object") {
			logger.warn(`DLsite info API: 無効なレスポンス (${productId})`);
			return null;
		}

		logger.debug(`DLsite info API 成功 (${productId}): データを取得しました`);
		return data as DLsiteInfoResponse;
	} catch (error) {
		logger.error(`DLsite info API リクエストに失敗 (${productId}):`, error);
		return null;
	}
}

/**
 * DLsite info データから評価詳細を抽出
 */
export function extractRatingDetails(infoData: DLsiteInfoResponse): RatingDetail[] {
	if (!infoData.rate_count_detail || !Array.isArray(infoData.rate_count_detail)) {
		return [];
	}

	return infoData.rate_count_detail.map((detail) => ({
		review_point: detail.review_point,
		count: detail.count,
		ratio: detail.ratio,
	}));
}

/**
 * DLsite info データからランキング情報を抽出
 */
export function extractRankingInfo(infoData: DLsiteInfoResponse): RankingInfo[] {
	if (!infoData.rank || !Array.isArray(infoData.rank)) {
		return [];
	}

	return infoData.rank.map((rank) => ({
		term: rank.term as "day" | "week" | "month" | "year" | "total",
		category: rank.category,
		rank: rank.rank,
		rank_date: rank.rank_date,
	}));
}

/**
 * DLsite info データから多通貨価格情報を抽出
 */
export function extractLocalePrices(infoData: DLsiteInfoResponse): LocalePrice[] {
	if (!infoData.prices || !Array.isArray(infoData.prices)) {
		return [];
	}

	return infoData.prices.map((price) => ({
		currency: price.currency,
		price: price.price,
		priceString: price.price_string,
	}));
}

/**
 * DLsite info データからキャンペーン情報を抽出
 */
export function extractCampaignInfo(infoData: DLsiteInfoResponse): CampaignInfo | undefined {
	if (!infoData.campaign) {
		return undefined;
	}

	return {
		campaignId: infoData.campaign.campaign_id,
		discountCampaignId: infoData.campaign.discount_campaign_id,
		discountEndDate: infoData.campaign.discount_end_date,
		discountUrl: infoData.campaign.discount_url,
	};
}

/**
 * DLsite info データからシリーズ情報を抽出
 */
export function extractSeriesInfo(infoData: DLsiteInfoResponse): SeriesInfo | undefined {
	if (!infoData.title) {
		return undefined;
	}

	return {
		titleId: infoData.title.title_id,
		titleName: infoData.title.title_name,
		titleWorkCount: infoData.title.title_work_count,
		isTitleCompleted: infoData.title.is_title_completed,
	};
}

/**
 * DLsite info データから翻訳情報を抽出
 */
export function extractTranslationInfo(infoData: DLsiteInfoResponse): TranslationInfo | undefined {
	if (!infoData.translation) {
		return undefined;
	}

	return {
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
	};
}

/**
 * DLsite info データから言語別ダウンロード情報を抽出
 */
export function extractLanguageDownloads(infoData: DLsiteInfoResponse): LanguageDownload[] {
	if (!infoData.language_editions || !Array.isArray(infoData.language_editions)) {
		return [];
	}

	return infoData.language_editions.map((edition) => ({
		workno: edition.workno,
		editionId: edition.edition_id,
		editionType: edition.edition_type,
		displayOrder: edition.display_order,
		label: edition.label,
		lang: edition.lang,
		dlCount: edition.dl_count,
		displayLabel: edition.display_label,
	}));
}

/**
 * DLsite info データから販売状態を抽出
 */
export function extractSalesStatus(infoData: DLsiteInfoResponse): SalesStatus | undefined {
	if (!infoData.sales_status) {
		return undefined;
	}

	return {
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
	};
}

/**
 * 声優名を抽出（複数対応）
 */
export function extractVoiceActors(infoData: DLsiteInfoResponse): string[] {
	if (!infoData.voice_actors || !Array.isArray(infoData.voice_actors)) {
		return [];
	}

	return infoData.voice_actors.filter((actor) => actor && typeof actor === "string");
}

/**
 * パースされたデータからPriceInfo構造に変換
 */
function mapToPriceInfo(parsed: ParsedWorkData): PriceInfo {
	return {
		current: parsed.currentPrice,
		original: parsed.originalPrice,
		currency: "JPY",
		discount: parsed.discount,
		point: parsed.point,
	};
}

/**
 * パースされたデータからRatingInfo構造に変換
 */
function mapToRatingInfo(
	parsed: ParsedWorkData,
	infoData?: DLsiteInfoResponse,
): RatingInfo | undefined {
	// info APIからより精密な評価データがある場合はそれを使用
	if (infoData?.rate_average_2dp && infoData?.rate_count) {
		return {
			stars: infoData.rate_average || parsed.stars || 0,
			count: infoData.rate_count,
			reviewCount: infoData.review_count,
			ratingDetail: extractRatingDetails(infoData),
			averageDecimal: infoData.rate_average_2dp,
		};
	}

	// HTMLパースからの基本データを使用
	if (parsed.stars === undefined || parsed.stars === 0) {
		return undefined;
	}

	return {
		stars: parsed.stars,
		count: parsed.ratingCount || 0,
		reviewCount: parsed.reviewCount,
	};
}

/**
 * 相対URLを絶対URLに変換
 */
function normalizeUrl(url: string): string {
	if (url.startsWith("https://") || url.startsWith("http://")) {
		return url;
	}
	if (url.startsWith("//")) {
		return `https:${url}`;
	}
	if (url.startsWith("/")) {
		return `https://www.dlsite.com${url}`;
	}
	// スラッシュで始まらない相対パスの場合、DLsiteのルートパスとして扱う
	return `https://www.dlsite.com/${url}`;
}

/**
 * パースされた作品データをDLsiteWorkBase形式に変換（詳細データ統合対応）
 */
export function mapToWorkBase(
	parsed: ParsedWorkData,
	infoData?: DLsiteInfoResponse,
	extendedData?: ExtendedWorkData,
): DLsiteWorkBase {
	try {
		const price = mapToPriceInfo(parsed);
		const rating = mapToRatingInfo(parsed, infoData);

		// サンプル画像のURLを正規化
		const normalizedSampleImages = parsed.sampleImages.map((sample) => ({
			thumb: normalizeUrl(sample.thumb),
			width: sample.width,
			height: sample.height,
		}));

		// 声優名の処理（infoデータから複数対応）
		const voiceActors = infoData ? extractVoiceActors(infoData) : [];
		const author = voiceActors.length > 0 ? voiceActors : parsed.author || [];

		const workBase: DLsiteWorkBase = {
			id: parsed.productId, // FirestoreドキュメントIDとして商品IDを使用
			productId: parsed.productId,
			title: parsed.title,
			circle: parsed.circle,
			author,
			description: extendedData?.detailedDescription || "", // 詳細ページから取得した説明文を使用
			category: parsed.category,
			workUrl: normalizeUrl(parsed.workUrl),
			thumbnailUrl: normalizeUrl(parsed.thumbnailUrl),
			highResImageUrl: extendedData?.highResImageUrl, // 詳細ページから取得した高解像度画像URL
			price,
			rating,
			salesCount: parsed.salesCount || infoData?.dl_count,
			ageRating: parsed.ageRating,
			tags: parsed.tags || [], // HTMLパーサーから抽出されたタグ情報を使用
			sampleImages: normalizedSampleImages,
			isExclusive: parsed.isExclusive,
			userEvaluationCount: 0, // デフォルト値として0を設定

			// 詳細ページから追加される拡張フィールド
			...(extendedData && {
				fileInfo: extendedData.fileInfo,
				basicInfo: extendedData.basicInfo,
				detailedCreators: extendedData.detailedCreators,
				bonusContent: extendedData.bonusContent,
			}),

			// infoデータから追加される拡張フィールド
			...(infoData && {
				wishlistCount: infoData.wishlist_count,
				totalDownloadCount: infoData.dl_count,
				makerId: infoData.maker_id,
				ageCategory: infoData.age_category,
				registDate: infoData.regist_date,
				options: infoData.work_options,
				rankingHistory: extractRankingInfo(infoData),
				localePrices: extractLocalePrices(infoData),
				campaignInfo: extractCampaignInfo(infoData),
				defaultPointRate: infoData.default_point_rate,
				seriesInfo: extractSeriesInfo(infoData),
				translationInfo: extractTranslationInfo(infoData),
				languageDownloads: extractLanguageDownloads(infoData),
				salesStatus: extractSalesStatus(infoData),
				customGenres: infoData.genres,
			}),
		};

		// Zodスキーマで検証
		return DLsiteWorkBaseSchema.parse(workBase);
	} catch (error) {
		logger.error(`作品データのマッピングに失敗: ${parsed.productId}`, {
			error,
			parsed,
		});
		throw new Error(`作品データのマッピングに失敗: ${parsed.productId}`);
	}
}

/**
 * DLsiteWorkBaseをFirestore保存用のデータに変換
 */
export function mapToFirestoreData(
	base: DLsiteWorkBase,
	existingData?: Partial<FirestoreDLsiteWorkData>,
): FirestoreDLsiteWorkData {
	try {
		const now = new Date().toISOString();

		const firestoreData: FirestoreDLsiteWorkData = {
			...base,
			lastFetchedAt: now,
			createdAt: existingData?.createdAt || now, // 既存データがあれば作成日時を保持
			updatedAt: now,
		};

		// Zodスキーマで検証
		return FirestoreDLsiteWorkSchema.parse(firestoreData);
	} catch (error) {
		logger.error(`Firestoreデータの変換に失敗: ${base.id}`, { error, base });
		throw new Error(`Firestoreデータの変換に失敗: ${base.id}`);
	}
}

/**
 * 複数の作品データを一括変換
 */
export function mapMultipleWorks(
	parsedWorks: ParsedWorkData[],
	existingDataMap?: Map<string, Partial<FirestoreDLsiteWorkData>>,
): FirestoreDLsiteWorkData[] {
	const results: FirestoreDLsiteWorkData[] = [];
	const errors: string[] = [];

	for (const parsed of parsedWorks) {
		try {
			const workBase = mapToWorkBase(parsed);
			const existingData = existingDataMap?.get(parsed.productId);
			const firestoreData = mapToFirestoreData(workBase, existingData);
			results.push(firestoreData);
		} catch (error) {
			logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
			errors.push(parsed.productId);
		}
	}

	if (errors.length > 0) {
		logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
	}

	logger.info(`作品データ変換完了: ${results.length}件成功, ${errors.length}件失敗`);
	return results;
}

/**
 * 複数の作品データをinfoデータと合わせて一括変換
 */
export async function mapMultipleWorksWithInfo(
	parsedWorks: ParsedWorkData[],
	existingDataMap?: Map<string, Partial<FirestoreDLsiteWorkData>>,
): Promise<FirestoreDLsiteWorkData[]> {
	const results: FirestoreDLsiteWorkData[] = [];
	const errors: string[] = [];

	for (const parsed of parsedWorks) {
		try {
			// 詳細情報を取得（エラーが発生してもnullが返される）
			const infoData = await fetchWorkInfo(parsed.productId);

			// HTMLデータとinfoデータを組み合わせて変換
			const workBase = mapToWorkBase(parsed, infoData || undefined);
			const existingData = existingDataMap?.get(parsed.productId);
			const firestoreData = mapToFirestoreData(workBase, existingData);
			results.push(firestoreData);

			if (infoData) {
				logger.debug(`作品${parsed.productId}: info APIデータを統合しました`);
			} else {
				logger.debug(`作品${parsed.productId}: HTMLデータのみで処理しました`);
			}
		} catch (error) {
			logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
			errors.push(parsed.productId);
		}

		// レート制限対応: APIリクエスト間に短い遅延を入れる
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	if (errors.length > 0) {
		logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
	}

	logger.info(`作品データ変換完了: ${results.length}件成功, ${errors.length}件失敗`);
	return results;
}

/**
 * 複数の作品データを詳細データと合わせて一括変換
 */
export async function mapMultipleWorksWithDetailData(
	parsedWorks: ParsedWorkData[],
	existingDataMap?: Map<string, Partial<FirestoreDLsiteWorkData>>,
): Promise<FirestoreDLsiteWorkData[]> {
	const results: FirestoreDLsiteWorkData[] = [];
	const errors: string[] = [];

	for (const parsed of parsedWorks) {
		try {
			// 詳細情報を取得（エラーが発生してもnullが返される）
			const infoData = await fetchWorkInfo(parsed.productId);

			// 詳細ページデータを取得（レート制限考慮）
			const extendedData = await fetchAndParseWorkDetail(parsed.productId);

			// HTMLデータ、infoデータ、詳細データを組み合わせて変換
			const workBase = mapToWorkBase(parsed, infoData || undefined, extendedData || undefined);
			const existingData = existingDataMap?.get(parsed.productId);
			const firestoreData = mapToFirestoreData(workBase, existingData);
			results.push(firestoreData);

			if (infoData) {
				logger.debug(`作品${parsed.productId}: info APIデータを統合しました`);
			}
			if (extendedData) {
				logger.debug(`作品${parsed.productId}: 詳細ページデータを統合しました`);
			}
			if (!infoData && !extendedData) {
				logger.debug(`作品${parsed.productId}: HTMLデータのみで処理しました`);
			}
		} catch (error) {
			logger.warn(`作品${parsed.productId}の変換をスキップ:`, { error });
			errors.push(parsed.productId);
		}

		// レート制限対応: 詳細ページ取得間に500ms遅延を入れる
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	if (errors.length > 0) {
		logger.warn(`${errors.length}件の作品変換に失敗:`, { errors });
	}

	logger.info(`詳細データ統合変換完了: ${results.length}件成功, ${errors.length}件失敗`);
	return results;
}

/**
 * 作品データの更新が必要かどうかを判定
 */
export function shouldUpdateWork(
	newData: DLsiteWorkBase,
	existingData: FirestoreDLsiteWorkData,
): boolean {
	// 価格が変更された場合
	if (newData.price.current !== existingData.price.current) {
		return true;
	}

	// 評価が変更された場合
	if (newData.rating?.count !== existingData.rating?.count) {
		return true;
	}

	// 販売数が変更された場合
	if (newData.salesCount !== existingData.salesCount) {
		return true;
	}

	// タイトルが変更された場合
	if (newData.title !== existingData.title) {
		return true;
	}

	// 24時間以上更新されていない場合
	const lastUpdated = new Date(existingData.updatedAt);
	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
	if (lastUpdated < twentyFourHoursAgo) {
		return true;
	}

	return false;
}

/**
 * 更新が必要な作品のみをフィルタリング
 */
export function filterWorksForUpdate(
	newWorks: DLsiteWorkBase[],
	existingWorksMap: Map<string, FirestoreDLsiteWorkData>,
): {
	toCreate: DLsiteWorkBase[];
	toUpdate: Array<{ new: DLsiteWorkBase; existing: FirestoreDLsiteWorkData }>;
	unchanged: DLsiteWorkBase[];
} {
	const toCreate: DLsiteWorkBase[] = [];
	const toUpdate: Array<{
		new: DLsiteWorkBase;
		existing: FirestoreDLsiteWorkData;
	}> = [];
	const unchanged: DLsiteWorkBase[] = [];

	for (const newWork of newWorks) {
		const existing = existingWorksMap.get(newWork.productId);

		if (!existing) {
			toCreate.push(newWork);
		} else if (shouldUpdateWork(newWork, existing)) {
			toUpdate.push({ new: newWork, existing });
		} else {
			unchanged.push(newWork);
		}
	}

	logger.info("作品更新判定完了:", {
		toCreate: toCreate.length,
		toUpdate: toUpdate.length,
		unchanged: unchanged.length,
	});

	return { toCreate, toUpdate, unchanged };
}

/**
 * 必須フィールドの検証
 */
function validateRequiredFields(work: DLsiteWorkBase): string[] {
	const warnings: string[] = [];

	if (!work.title.trim()) {
		warnings.push("タイトルが空です");
	}

	if (!work.circle.trim()) {
		warnings.push("サークル名が空です");
	}

	return warnings;
}

/**
 * 価格情報の検証
 */
function validatePriceData(price: DLsiteWorkBase["price"]): string[] {
	const warnings: string[] = [];

	if (price.current < 0) {
		warnings.push("価格が負の値です");
	}

	if (price.original && price.original <= price.current) {
		warnings.push("元の価格が現在価格以下です");
	}

	if (price.discount && (price.discount < 0 || price.discount > 100)) {
		warnings.push("割引率が不正です (0-100%の範囲外)");
	}

	return warnings;
}

/**
 * 評価情報の検証
 */
function validateRatingData(rating?: DLsiteWorkBase["rating"]): string[] {
	const warnings: string[] = [];

	if (rating) {
		if (rating.stars < 0 || rating.stars > 5) {
			warnings.push("評価星数が不正です (0-5の範囲外)");
		}
		if (rating.count < 0) {
			warnings.push("評価数が負の値です");
		}
	}

	return warnings;
}

/**
 * URL形式の検証
 */
function validateUrls(work: DLsiteWorkBase): string[] {
	const warnings: string[] = [];

	try {
		new URL(work.workUrl);
	} catch {
		warnings.push("作品URLが不正です");
	}

	try {
		new URL(work.thumbnailUrl);
	} catch {
		warnings.push("サムネイルURLが不正です");
	}

	return warnings;
}

/**
 * データ品質チェック
 */
export function validateWorkData(work: DLsiteWorkBase): {
	isValid: boolean;
	warnings: string[];
} {
	const warnings = [
		...validateRequiredFields(work),
		...validatePriceData(work.price),
		...validateRatingData(work.rating),
		...validateUrls(work),
	];

	const isValid = warnings.length === 0;
	return { isValid, warnings };
}
