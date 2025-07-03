import { z } from "zod";
import { AggregatedCharacteristicsSchema } from "./user-evaluation";

/**
 * DLsite作品カテゴリの型定義
 * HTMLから抽出される作品種別に対応
 */
export const WorkCategorySchema = z.enum([
	"ADV", // アドベンチャー
	"SOU", // ボイス・ASMR
	"RPG", // ロールプレイング
	"MOV", // 動画
	"MNG", // マンガ
	"GAM", // ゲーム
	"CG", // CG・イラスト
	"TOL", // ツール・アクセサリ
	"ET3", // その他・3D
	"SLN", // シミュレーション
	"ACN", // アクション
	"PZL", // パズル
	"QIZ", // クイズ
	"TBL", // テーブル
	"DGT", // デジタルノベル
	"etc", // その他
]);

/**
 * DLsite作品カテゴリコードから日本語表示名へのマッピング
 */
export const WORK_CATEGORY_DISPLAY_NAMES: Record<WorkCategory, string> = {
	ADV: "アドベンチャー",
	SOU: "ボイス・ASMR",
	RPG: "ロールプレイング",
	MOV: "動画",
	MNG: "マンガ",
	GAM: "ゲーム",
	CG: "CG・イラスト",
	TOL: "ツール・アクセサリ",
	ET3: "その他・3D",
	SLN: "シミュレーション",
	ACN: "アクション",
	PZL: "パズル",
	QIZ: "クイズ",
	TBL: "テーブル",
	DGT: "デジタルノベル",
	etc: "その他",
} as const;

/**
 * 価格情報のZodスキーマ定義
 */
export const PriceInfoSchema = z.object({
	/** 現在価格（円） */
	current: z.number().int().nonnegative(),
	/** 元の価格（セール時のみ）（円） */
	original: z.number().int().nonnegative().optional(),
	/** 通貨コード */
	currency: z.string().default("JPY"),
	/** 割引率（パーセント） */
	discount: z.number().int().min(0).max(100).optional(),
	/** ポイント */
	point: z.number().int().nonnegative().optional(),
});

/**
 * 評価詳細情報のZodスキーマ定義
 */
export const RatingDetailSchema = z.object({
	/** 評価ポイント（1-5星） */
	review_point: z.number().int().min(1).max(5),
	/** 該当件数 */
	count: z.number().int().nonnegative(),
	/** 割合（パーセント） */
	ratio: z.number().int().min(0).max(100),
});

/**
 * 評価情報のZodスキーマ定義
 */
export const RatingInfoSchema = z.object({
	/** 星評価（1-5） */
	stars: z.number().min(0).max(5),
	/** 評価数 */
	count: z.number().int().nonnegative(),
	/** レビュー数 */
	reviewCount: z.number().int().nonnegative().optional(),
	/** 評価詳細分布 */
	ratingDetail: z.array(RatingDetailSchema).optional(),
	/** 小数点2桁の評価平均 */
	averageDecimal: z.number().min(0).max(5).optional(),
});

/**
 * サンプル画像情報のZodスキーマ定義
 */
export const SampleImageSchema = z.object({
	/** サムネイル画像URL */
	thumb: z.string().url(),
	/** 画像幅 */
	width: z.number().int().positive().optional(),
	/** 画像高さ */
	height: z.number().int().positive().optional(),
});

/**
 * ファイル情報のZodスキーマ定義
 */
export const FileInfoSchema = z.object({
	/** 総ファイルサイズ（バイト） */
	totalSizeBytes: z.number().int().nonnegative().optional(),
	/** 総ファイルサイズテキスト（例: "3.71 GB"） */
	totalSizeText: z.string().optional(),
	/** ファイル形式一覧 */
	formats: z.array(z.string()).default([]),
	/** 総再生時間（秒） */
	totalDuration: z.number().int().nonnegative().optional(),
	/** 総再生時間テキスト（例: "約2時間4分"） */
	totalDurationText: z.string().optional(),
	/** その他ファイル情報 */
	additionalFiles: z.array(z.string()).default([]),
});

/**
 * 詳細クリエイター情報のZodスキーマ定義
 */
export const DetailedCreatorInfoSchema = z.object({
	/** 声優（CV） */
	voiceActors: z.array(z.string()).default([]),
	/** シナリオ */
	scenario: z.array(z.string()).default([]),
	/** イラスト */
	illustration: z.array(z.string()).default([]),
	/** 音楽 */
	music: z.array(z.string()).default([]),
	/** デザイン */
	design: z.array(z.string()).default([]),
	/** その他のクリエイター情報 */
	other: z.record(z.array(z.string())).default({}),
});

/**
 * 基本作品情報のZodスキーマ定義（work_outlineテーブルから抽出）
 */
export const BasicWorkInfoSchema = z.object({
	/** 販売日 */
	releaseDate: z.string().optional(),
	/** シリーズ名 */
	seriesName: z.string().optional(),
	/** 作者（複数） */
	author: z.array(z.string()).default([]),
	/** シナリオ担当者（複数） */
	scenario: z.array(z.string()).default([]),
	/** イラスト担当者（複数） */
	illustration: z.array(z.string()).default([]),
	/** 声優（複数） */
	voiceActors: z.array(z.string()).default([]),
	/** 音楽担当者（複数） */
	music: z.array(z.string()).default([]),
	/** 年齢指定 */
	ageRating: z.string().optional(),
	/** 作品形式 */
	workFormat: z.string().optional(),
	/** ファイル形式 */
	fileFormat: z.string().optional(),
	/** ジャンル（複数） - work_outlineテーブルから取得 */
	genres: z.array(z.string()).default([]),
	/** タグ（複数） - 作品詳細ページから取得（ジャンルと同じ可能性あり） */
	detailTags: z.array(z.string()).default([]),
	/** ファイル容量 */
	fileSize: z.string().optional(),
});

/**
 * 特典情報のZodスキーマ定義
 */
export const BonusContentSchema = z.object({
	/** 特典名 */
	title: z.string(),
	/** 特典説明 */
	description: z.string().optional(),
	/** 特典タイプ（画像、音声、テキストなど） */
	type: z.string().optional(),
});

/**
 * 時系列価格データのZodスキーマ定義
 */
export const PriceHistorySchema = z.object({
	/** 日付 */
	date: z.string().datetime(),
	/** 価格 */
	price: z.number().int().nonnegative(),
	/** 元価格（セール時） */
	originalPrice: z.number().int().nonnegative().optional(),
	/** 割引率 */
	discountRate: z.number().int().min(0).max(100).optional(),
	/** セールタイプ */
	saleType: z.string().optional(),
});

/**
 * 時系列販売データのZodスキーマ定義
 */
export const SalesHistorySchema = z.object({
	/** 日付 */
	date: z.string().datetime(),
	/** 販売数 */
	salesCount: z.number().int().nonnegative(),
	/** 日別平均 */
	dailyAverage: z.number().int().nonnegative().optional(),
	/** ランキング順位 */
	rankingPosition: z.number().int().positive().optional(),
});

/**
 * ランキング情報のZodスキーマ定義
 */
export const RankingInfoSchema = z.object({
	/** 期間（day/week/month/year/total） */
	term: z.enum(["day", "week", "month", "year", "total"]),
	/** カテゴリ（all/voice等） */
	category: z.string(),
	/** 順位 */
	rank: z.number().int().positive(),
	/** ランキング日付 */
	rank_date: z.string(),
});

/**
 * 多通貨価格情報のZodスキーマ定義
 */
export const LocalePriceSchema = z.object({
	/** 通貨コード */
	currency: z.string(),
	/** 価格 */
	price: z.number().nonnegative(),
	/** 表示用価格文字列 */
	priceString: z.string(),
});

/**
 * キャンペーン情報のZodスキーマ定義
 */
export const CampaignInfoSchema = z.object({
	/** キャンペーンID */
	campaignId: z.string().optional(),
	/** 割引キャンペーンID */
	discountCampaignId: z.number().int().optional(),
	/** 割引終了日 */
	discountEndDate: z.string().optional(),
	/** 割引ページURL */
	discountUrl: z.string().url().optional(),
});

/**
 * シリーズ情報のZodスキーマ定義
 */
export const SeriesInfoSchema = z.object({
	/** シリーズID */
	titleId: z.string().optional(),
	/** シリーズ名 */
	titleName: z.string().optional(),
	/** シリーズ作品数 */
	titleWorkCount: z.number().int().nonnegative().optional(),
	/** シリーズ完結フラグ */
	isTitleCompleted: z.boolean().optional(),
});

/**
 * 翻訳情報のZodスキーマ定義
 */
export const TranslationInfoSchema = z.object({
	/** 翻訳許可フラグ */
	isTranslationAgree: z.boolean().optional(),
	/** ボランティア翻訳フラグ */
	isVolunteer: z.boolean().optional(),
	/** オリジナル作品フラグ */
	isOriginal: z.boolean().optional(),
	/** 親作品フラグ */
	isParent: z.boolean().optional(),
	/** 子作品フラグ */
	isChild: z.boolean().optional(),
	/** 原作作品番号 */
	originalWorkno: z.string().optional(),
	/** 親作品番号 */
	parentWorkno: z.string().optional(),
	/** 子作品番号リスト */
	childWorknos: z.array(z.string()).optional(),
	/** 言語 */
	lang: z.string().optional(),
	/** 翻訳報酬率 */
	productionTradePriceRate: z.number().int().min(0).max(100).optional(),
});

/**
 * 言語別ダウンロード情報のZodスキーマ定義
 */
export const LanguageDownloadSchema = z.object({
	/** 作品番号 */
	workno: z.string(),
	/** エディションID */
	editionId: z.number().int().optional(),
	/** エディションタイプ */
	editionType: z.string().optional(),
	/** 表示順 */
	displayOrder: z.number().int().optional(),
	/** 言語ラベル */
	label: z.string(),
	/** 言語コード */
	lang: z.string(),
	/** ダウンロード数 */
	dlCount: z.string(),
	/** 表示用ラベル */
	displayLabel: z.string(),
});

/**
 * DLsite販売状態フラグのZodスキーマ定義
 */
export const SalesStatusSchema = z.object({
	/** 販売中フラグ */
	isSale: z.boolean().optional(),
	/** セール中フラグ */
	onSale: z.number().int().min(0).max(1).optional(),
	/** 割引中フラグ */
	isDiscount: z.boolean().optional(),
	/** ポイントアップ中フラグ */
	isPointup: z.boolean().optional(),
	/** 無料フラグ */
	isFree: z.boolean().optional(),
	/** レンタルフラグ */
	isRental: z.boolean().optional(),
	/** 売り切れフラグ */
	isSoldOut: z.boolean().optional(),
	/** 予約作品フラグ */
	isReserveWork: z.boolean().optional(),
	/** 予約可能フラグ */
	isReservable: z.boolean().optional(),
	/** タイムセールフラグ */
	isTimesale: z.boolean().optional(),
	/** DLsite Play対応フラグ */
	dlsiteplayWork: z.boolean().optional(),
});

/**
 * 基本的なDLsite作品データのZodスキーマ定義
 */
export const DLsiteWorkBaseSchema = z.object({
	/** FirestoreドキュメントID */
	id: z.string().min(1, {
		message: "作品IDは1文字以上である必要があります",
	}),
	/** DLsite商品ID（RJ236867など） */
	productId: z.string().min(1, {
		message: "商品IDは1文字以上である必要があります",
	}),
	/** 作品タイトル */
	title: z.string().min(1, {
		message: "作品タイトルは1文字以上である必要があります",
	}),
	/** サークル名 */
	circle: z.string().min(1, {
		message: "サークル名は1文字以上である必要があります",
	}),
	/** 声優名（複数の場合あり） */
	author: z.array(z.string()).default([]),
	/** 作品説明 */
	description: z.string().default(""),
	/** 作品カテゴリ */
	category: WorkCategorySchema,
	/** DLsite作品ページURL */
	workUrl: z.string().url({
		message: "作品URLは有効なURL形式である必要があります",
	}),
	/** サムネイル画像URL */
	thumbnailUrl: z.string().url({
		message: "サムネイルURLは有効なURL形式である必要があります",
	}),
	/** 高解像度ジャケット画像URL（詳細ページから取得） */
	highResImageUrl: z.string().url().optional(),
	/** 価格情報 */
	price: PriceInfoSchema,
	/** 評価情報 */
	rating: RatingInfoSchema.optional(),
	/** 販売数 */
	salesCount: z.number().int().nonnegative().optional(),
	/** 年齢制限（全年齢、R-15、R-18など） */
	ageRating: z.string().optional(),
	/** 作品タグ */
	tags: z.array(z.string()).default([]),
	/** サンプル画像 */
	sampleImages: z.array(SampleImageSchema).default([]),
	/** 独占配信フラグ */
	isExclusive: z.boolean().default(false),

	// DLsite infoエンドポイントから取得される追加データ
	/** メーカーID */
	makerId: z.string().optional(),
	/** 年齢カテゴリ（数値） */
	ageCategory: z.number().int().optional(),
	/** 作品登録日 */
	registDate: z.string().datetime().optional(),
	/** 作品オプション（音声/トライアル等） */
	options: z.string().optional(),
	/** ウィッシュリスト数 */
	wishlistCount: z.number().int().nonnegative().optional(),
	/** 総ダウンロード数 */
	totalDownloadCount: z.number().int().nonnegative().optional(),
	/** ランキング履歴 */
	rankingHistory: z.array(RankingInfoSchema).optional(),
	/** ファイル情報 */
	fileInfo: FileInfoSchema.optional(),
	/** 基本作品情報（work_outlineテーブルから抽出） */
	basicInfo: BasicWorkInfoSchema.optional(),
	/** 詳細クリエイター情報 */
	detailedCreators: DetailedCreatorInfoSchema.optional(),
	/** 特典情報 */
	bonusContent: z.array(BonusContentSchema).optional(),
	/** 価格履歴 */
	priceHistory: z.array(PriceHistorySchema).optional(),
	/** 販売履歴 */
	salesHistory: z.array(SalesHistorySchema).optional(),
	/** 集計された特性評価 */
	aggregatedCharacteristics: AggregatedCharacteristicsSchema.optional(),
	/** ユーザー評価数 */
	userEvaluationCount: z.number().int().nonnegative().default(0),
	/** 多通貨価格情報 */
	localePrices: z.array(LocalePriceSchema).optional(),
	/** キャンペーン情報 */
	campaignInfo: CampaignInfoSchema.optional(),
	/** シリーズ情報 */
	seriesInfo: SeriesInfoSchema.optional(),
	/** 翻訳情報 */
	translationInfo: TranslationInfoSchema.optional(),
	/** 言語別ダウンロード情報 */
	languageDownloads: z.array(LanguageDownloadSchema).optional(),
	/** 販売状態フラグ */
	salesStatus: SalesStatusSchema.optional(),
	/** ポイント還元率 */
	defaultPointRate: z.number().int().min(0).max(100).optional(),
	/** カスタムジャンル */
	customGenres: z.array(z.string()).optional(),
});

/**
 * Firestoreに保存するDLsite作品データのZodスキーマ定義
 */
export const FirestoreDLsiteWorkSchema = DLsiteWorkBaseSchema.extend({
	/** 最終取得日時 */
	lastFetchedAt: z.string().datetime({
		message: "最終取得日時はISO形式の日時である必要があります",
	}),
	/** 作成日時 */
	createdAt: z.string().datetime({
		message: "作成日時はISO形式の日時である必要があります",
	}),
	/** 更新日時 */
	updatedAt: z.string().datetime({
		message: "更新日時はISO形式の日時である必要があります",
	}),
});

/**
 * フロントエンド表示用のDLsite作品データのZodスキーマ定義
 */
export const FrontendDLsiteWorkSchema = FirestoreDLsiteWorkSchema.extend({
	/** 表示用価格文字列 */
	displayPrice: z.string(),
	/** 割引表示テキスト */
	discountText: z.string().optional(),
	/** 評価表示テキスト */
	ratingText: z.string().optional(),
	/** ウィッシュリスト表示テキスト */
	wishlistText: z.string().optional(),
	/** ダウンロード数表示テキスト */
	downloadText: z.string().optional(),
	/** 相対URL */
	relativeUrl: z.string(),
	/** ISO形式の日付文字列（フロントエンドでの使用のため） */
	createdAtISO: z.string().datetime(),
	lastFetchedAtISO: z.string().datetime(),
	updatedAtISO: z.string().datetime(),
});

/**
 * 作品リスト結果のZodスキーマ定義
 */
export const WorkListResultSchema = z.object({
	works: z.array(FrontendDLsiteWorkSchema),
	hasMore: z.boolean(),
	lastWork: FrontendDLsiteWorkSchema.optional(),
	totalCount: z.number().int().nonnegative().optional(),
});

/**
 * ページネーションパラメータのZodスキーマ定義
 */
export const WorkPaginationParamsSchema = z.object({
	limit: z.number().int().positive(),
	startAfter: z.string().optional(),
	author: z.string().optional(),
	category: WorkCategorySchema.optional(),
});

// Zodスキーマから型を抽出
export type WorkCategory = z.infer<typeof WorkCategorySchema>;
export type PriceInfo = z.infer<typeof PriceInfoSchema>;
export type RatingInfo = z.infer<typeof RatingInfoSchema>;
export type RatingDetail = z.infer<typeof RatingDetailSchema>;
export type SampleImage = z.infer<typeof SampleImageSchema>;
export type FileInfo = z.infer<typeof FileInfoSchema>;
export type BasicWorkInfo = z.infer<typeof BasicWorkInfoSchema>;
export type DetailedCreatorInfo = z.infer<typeof DetailedCreatorInfoSchema>;
export type BonusContent = z.infer<typeof BonusContentSchema>;
export type PriceHistory = z.infer<typeof PriceHistorySchema>;
export type SalesHistory = z.infer<typeof SalesHistorySchema>;
export type RankingInfo = z.infer<typeof RankingInfoSchema>;
export type LocalePrice = z.infer<typeof LocalePriceSchema>;
export type CampaignInfo = z.infer<typeof CampaignInfoSchema>;
export type SeriesInfo = z.infer<typeof SeriesInfoSchema>;
export type TranslationInfo = z.infer<typeof TranslationInfoSchema>;
export type LanguageDownload = z.infer<typeof LanguageDownloadSchema>;
export type SalesStatus = z.infer<typeof SalesStatusSchema>;
export type DLsiteWorkBase = z.infer<typeof DLsiteWorkBaseSchema>;
export type FirestoreDLsiteWorkData = z.infer<typeof FirestoreDLsiteWorkSchema>;
export type FrontendDLsiteWorkData = z.infer<typeof FrontendDLsiteWorkSchema>;
export type WorkListResult = z.infer<typeof WorkListResultSchema>;
export type WorkPaginationParams = z.infer<typeof WorkPaginationParamsSchema>;

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 * @param data Firestoreから取得したデータ
 * @returns フロントエンド表示用に変換されたデータ
 */
/**
 * 表示用価格テキストを生成
 */
function generateDisplayPrice(price: FirestoreDLsiteWorkData["price"]): string {
	return price.discount && price.original
		? `${price.current}円（元：${price.original}円）`
		: `${price.current}円`;
}

/**
 * 評価テキストを生成
 */
function generateRatingText(rating?: FirestoreDLsiteWorkData["rating"]): string | undefined {
	return rating ? `★${rating.stars.toFixed(1)} (${rating.count}件)` : undefined;
}

/**
 * ダウンロード数テキストを生成
 */
function generateDownloadText(
	data: Pick<FirestoreDLsiteWorkData, "totalDownloadCount" | "salesCount">,
): string | undefined {
	if (data.totalDownloadCount) {
		return `DL${data.totalDownloadCount.toLocaleString()}`;
	}
	if (data.salesCount) {
		return `DL${data.salesCount.toLocaleString()}`;
	}
	return undefined;
}

export function convertToFrontendWork(data: FirestoreDLsiteWorkData): FrontendDLsiteWorkData {
	// 表示用テキストの生成
	const displayPrice = generateDisplayPrice(data.price);
	const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
	const ratingText = generateRatingText(data.rating);
	const wishlistText = data.wishlistCount ? `♡${data.wishlistCount.toLocaleString()}` : undefined;
	const downloadText = generateDownloadText(data);
	const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;

	// FrontendDLsiteWorkSchema形式のデータを生成
	const frontendData: FrontendDLsiteWorkData = {
		...data,
		displayPrice,
		discountText,
		ratingText,
		relativeUrl,
		createdAtISO: data.createdAt,
		lastFetchedAtISO: data.lastFetchedAt,
		updatedAtISO: data.updatedAt,
		wishlistText,
		downloadText,
	};

	// データの検証
	try {
		return FrontendDLsiteWorkSchema.parse(frontendData);
	} catch (_error) {
		// エラー時でも最低限のデータを返す
		const _now = new Date().toISOString();
		return {
			id: data.id,
			productId: data.productId,
			title: data.title,
			circle: data.circle,
			author: data.author,
			description: data.description || "",
			category: data.category,
			workUrl: data.workUrl,
			thumbnailUrl: data.thumbnailUrl,
			highResImageUrl: data.highResImageUrl,
			price: data.price,
			rating: data.rating,
			salesCount: data.salesCount,
			ageRating: data.ageRating,
			tags: data.tags || [],
			sampleImages: data.sampleImages || [],
			isExclusive: data.isExclusive || false,
			lastFetchedAt: data.lastFetchedAt,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			displayPrice: `${data.price.current}円`,
			discountText,
			ratingText,
			wishlistText: data.wishlistCount ? `♡${data.wishlistCount.toLocaleString()}` : undefined,
			downloadText: data.totalDownloadCount
				? `DL${data.totalDownloadCount.toLocaleString()}`
				: undefined,
			relativeUrl,
			createdAtISO: data.createdAt,
			lastFetchedAtISO: data.lastFetchedAt,
			updatedAtISO: data.updatedAt,
			userEvaluationCount: 0,
		};
	}
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 * @param data フロントエンド表示用データ
 * @returns シリアライズされたデータ文字列
 */
export function serializeWorkForRSC(data: FrontendDLsiteWorkData): string {
	return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 * @param serialized シリアライズされたデータ文字列
 * @returns 検証済みのフロントエンド表示用データ
 */
export function deserializeWorkForRCC(serialized: string): FrontendDLsiteWorkData {
	try {
		const data = JSON.parse(serialized);
		return FrontendDLsiteWorkSchema.parse(data);
	} catch (_error) {
		throw new Error("データの形式が無効です");
	}
}

/**
 * 作品リスト結果のシリアライズ関数
 * @param result 作品リスト結果
 * @returns シリアライズされたリスト結果
 */
export function serializeWorkListResult(result: WorkListResult): string {
	return JSON.stringify(result);
}

/**
 * 作品リスト結果のデシリアライズ関数
 * @param serialized シリアライズされたリスト結果
 * @returns 検証済みの作品リスト結果
 */
export function deserializeWorkListResult(serialized: string): WorkListResult {
	try {
		const data = JSON.parse(serialized);
		return WorkListResultSchema.parse(data);
	} catch (_error) {
		return { works: [], hasMore: false };
	}
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerDLsiteWorkData {
	/** FirestoreドキュメントID */
	id: string;
	/** DLsite商品ID */
	productId: string;
	/** 作品タイトル */
	title: string;
	/** サークル名 */
	circle: string;
	/** 声優名（複数の場合あり） */
	author?: string[];
	/** 作品説明 */
	description: string;
	/** 作品カテゴリ */
	category: WorkCategory;
	/** DLsite作品ページURL */
	workUrl: string;
	/** サムネイル画像URL */
	thumbnailUrl: string;
	/** 価格情報 */
	price: PriceInfo;
	/** 評価情報 */
	rating?: RatingInfo;
	/** 販売数 */
	salesCount?: number;
	/** 年齢制限 */
	ageRating?: string;
	/** 作品タグ */
	tags: string[];
	/** サンプル画像 */
	sampleImages: SampleImage[];
	/** 独占配信フラグ */
	isExclusive: boolean;

	// DLsite infoエンドポイントから取得される追加データ
	/** メーカーID */
	makerId?: string;
	/** 年齢カテゴリ（数値） */
	ageCategory?: number;
	/** 作品登録日 */
	registDate?: string;
	/** 作品オプション（音声/トライアル等） */
	options?: string;
	/** ウィッシュリスト数 */
	wishlistCount?: number;
	/** 総ダウンロード数 */
	totalDownloadCount?: number;
	/** ランキング履歴 */
	rankingHistory?: RankingInfo[];
	/** 多通貨価格情報 */
	localePrices?: LocalePrice[];
	/** キャンペーン情報 */
	campaignInfo?: CampaignInfo;
	/** シリーズ情報 */
	seriesInfo?: SeriesInfo;
	/** 翻訳情報 */
	translationInfo?: TranslationInfo;
	/** 言語別ダウンロード情報 */
	languageDownloads?: LanguageDownload[];
	/** 販売状態フラグ */
	salesStatus?: SalesStatus;
	/** ポイント還元率 */
	defaultPointRate?: number;
	/** カスタムジャンル */
	customGenres?: string[];

	// Firestoreのサーバーサイドモデルではタイムスタンプを使用
	/** 最終取得日時（Firestore.Timestamp型） */
	lastFetchedAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)
	/** 作成日時（Firestore.Timestamp型） */
	createdAt: unknown; // Firestore.Timestamp型
	/** 更新日時（Firestore.Timestamp型） */
	updatedAt: unknown; // Firestore.Timestamp型
}

/**
 * 作品カテゴリコードから日本語表示名を取得
 * @param category 作品カテゴリコード
 * @returns 日本語表示名
 */
export function getWorkCategoryDisplayName(category: WorkCategory): string {
	return WORK_CATEGORY_DISPLAY_NAMES[category];
}

/**
 * 作品カテゴリコードから日本語表示名を安全に取得
 * 不明なカテゴリの場合はカテゴリコードをそのまま返す
 * @param category 作品カテゴリコード（不明な値の可能性あり）
 * @returns 日本語表示名またはカテゴリコード
 */
export function getWorkCategoryDisplayNameSafe(category: string): string {
	// WorkCategoryに含まれているかチェック
	if (category in WORK_CATEGORY_DISPLAY_NAMES) {
		return WORK_CATEGORY_DISPLAY_NAMES[category as WorkCategory];
	}
	// 不明なカテゴリの場合はそのまま返す
	return category;
}
