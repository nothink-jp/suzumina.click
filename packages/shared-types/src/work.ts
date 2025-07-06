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
 * DLsite作品言語の型定義
 * DLsiteで対応されている言語コードに対応
 */
export const WorkLanguageSchema = z.enum([
	"ja", // 日本語
	"en", // 英語
	"zh-cn", // 簡体中文
	"zh-tw", // 繁體中文
	"ko", // 한국어
	"es", // スペイン語
	"not-required", // 言語不要
	"dlsite-official", // DLsite公式
	"other", // その他言語
]);

/**
 * DLsite作品言語コードから日本語表示名へのマッピング
 */
export const WORK_LANGUAGE_DISPLAY_NAMES: Record<WorkLanguage, string> = {
	ja: "日本語",
	en: "英語",
	"zh-cn": "简体中文",
	"zh-tw": "繁體中文",
	ko: "한국어",
	es: "Español",
	"not-required": "言語不要",
	"dlsite-official": "DLsite公式",
	other: "その他言語",
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
 * 詳細クリエイター情報のZodスキーマ定義（レガシー対応用）
 * @deprecated メインフィールドに統合済み。移行期間中のみ使用
 */
export const DetailedCreatorInfoSchema = z.object({
	/** その他のクリエイター情報（標準フィールド以外） */
	other: z.record(z.array(z.string())).default({}),
});

/**
 * 基本作品情報のZodスキーマ定義（最小限のメタデータのみ）
 * 重複排除により、メインフィールドに昇格したデータは除外
 */
export const BasicWorkInfoSchema = z.object({
	/** 詳細タグ（tagsと重複しない場合のみ） */
	detailTags: z.array(z.string()).default([]),
	/** 年齢制限（詳細ページから取得） */
	ageRating: z.string().optional(),
	/** 声優情報（詳細ページから取得） */
	voiceActors: z.array(z.string()).optional(),
	/** シナリオ担当者（詳細ページから取得） */
	scenario: z.array(z.string()).optional(),
	/** イラスト担当者（詳細ページから取得） */
	illustration: z.array(z.string()).optional(),
	/** 音楽担当者（詳細ページから取得） */
	music: z.array(z.string()).optional(),
	/** 販売日（詳細ページから取得） */
	releaseDate: z.string().optional(),
	/** シリーズ名（詳細ページから取得） */
	seriesName: z.string().optional(),
	/** 作品形式（詳細ページから取得） */
	workFormat: z.string().optional(),
	/** ファイル形式（詳細ページから取得） */
	fileFormat: z.string().optional(),
	/** ファイルサイズ（詳細ページから取得） */
	fileSize: z.string().optional(),
	/** ジャンル（詳細ページから取得） */
	genres: z.array(z.string()).optional(),
	/** その他の基本情報（将来拡張用） */
	other: z.record(z.any()).default({}),
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
 * 重複フィールドを排除し、統一されたデータ構造を定義
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

	// === 統一されたクリエイター情報（detailedCreators から昇格） ===
	/** 声優（CV）- 旧 author, detailedCreators.voiceActors, basicInfo.voiceActors を統合 */
	voiceActors: z.array(z.string()).default([]),
	/** シナリオ担当者 - detailedCreators.scenario, basicInfo.scenario を統合 */
	scenario: z.array(z.string()).default([]),
	/** イラスト担当者 - detailedCreators.illustration, basicInfo.illustration を統合 */
	illustration: z.array(z.string()).default([]),
	/** 音楽担当者 - detailedCreators.music, basicInfo.music を統合 */
	music: z.array(z.string()).default([]),

	// === 統一された作品情報（basicInfo から昇格） ===
	/** 販売日 - basicInfo.releaseDate から昇格 */
	releaseDate: z.string().optional(),
	/** シリーズ名 - basicInfo.seriesName から昇格 */
	seriesName: z.string().optional(),
	/** 年齢制限 - basicInfo.ageRating を統合 */
	ageRating: z.string().optional(),
	/** 作品形式 - basicInfo.workFormat から昇格 */
	workFormat: z.string().optional(),
	/** ファイル形式 - basicInfo.fileFormat から昇格 */
	fileFormat: z.string().optional(),
	/** 作品タグ - 旧 tags, basicInfo.genres を統合 */
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
	/** 基本作品情報（最小限のメタデータのみ保持） */
	basicInfo: z
		.object({
			/** 詳細タグ（tagsと重複しない場合のみ） */
			detailTags: z.array(z.string()).default([]),
			/** その他の基本情報（将来拡張用） */
			other: z.record(z.any()).default({}),
		})
		.optional(),
	/** 特典情報 */
	bonusContent: z.array(BonusContentSchema).optional(),
	/** 価格履歴 */
	priceHistory: z.array(PriceHistorySchema).optional(),
	/** 販売履歴 */
	salesHistory: z.array(SalesHistorySchema).optional(),
	/** 集計された特性評価 */
	aggregatedCharacteristics: AggregatedCharacteristicsSchema.optional(),
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
 * データソース追跡情報のZodスキーマ定義
 */
export const DataSourceTrackingSchema = z.object({
	/** 検索結果データ */
	searchResult: z
		.object({
			lastFetched: z.string().datetime(),
			genres: z.array(z.string()).default([]),
			basicInfo: z.any().optional(),
		})
		.optional(),
	/** InfoAPIデータ */
	infoAPI: z
		.object({
			lastFetched: z.string().datetime(),
			salesCount: z.number().optional(),
			wishlistCount: z.number().optional(),
			customGenres: z.array(z.string()).default([]),
		})
		.optional(),
	/** 詳細ページデータ */
	detailPage: z
		.object({
			lastFetched: z.string().datetime(),
			basicInfo: BasicWorkInfoSchema,
			fileInfo: FileInfoSchema.optional(),
			bonusContent: z.array(BonusContentSchema).default([]),
		})
		.optional(),
});

/**
 * 最適化されたFirestore DLsite作品データのZodスキーマ定義
 * FIRESTORE_STRUCTURE.md準拠の構造
 */
export const OptimizedFirestoreDLsiteWorkSchema = z.object({
	// === 基本識別情報 ===
	/** FirestoreドキュメントID */
	id: z.string(),
	/** DLsite商品ID */
	productId: z.string(),

	// === 基本作品情報 ===
	/** 作品タイトル */
	title: z.string().min(1),
	/** サークル名 */
	circle: z.string().min(1),
	/** 作品説明 */
	description: z.string(),
	/** 作品カテゴリ */
	category: WorkCategorySchema,
	/** DLsite作品ページURL */
	workUrl: z.string(),
	/** サムネイル画像 */
	thumbnailUrl: z.string(),
	/** 高解像度画像（詳細ページから取得） */
	highResImageUrl: z.string().optional(),

	// === 価格・評価情報（統合済み） ===
	/** 統合価格情報 */
	price: PriceInfoSchema,
	/** 統合評価情報 */
	rating: RatingInfoSchema.optional(),
	/** 販売数（infoAPIから） */
	salesCount: z.number().optional(),
	/** ウィッシュリスト数（infoAPIから） */
	wishlistCount: z.number().optional(),
	/** 総DL数（infoAPIから） */
	totalDownloadCount: z.number().optional(),

	// === 統一クリエイター情報（5種類のみ） ===
	/** 声優（最優先データ） */
	voiceActors: z.array(z.string()).default([]),
	/** シナリオ */
	scenario: z.array(z.string()).default([]),
	/** イラスト */
	illustration: z.array(z.string()).default([]),
	/** 音楽 */
	music: z.array(z.string()).default([]),
	/** 作者（その他・声優と重複しない場合のみ） */
	author: z.array(z.string()).default([]),

	// === ジャンル・タグ明確分離 ===
	/** DLsite公式ジャンル（統合） */
	genres: z.array(z.string()).default([]),
	/** DLsite検索タグ */
	tags: z.array(z.string()).default([]),
	/** 独自タグ（将来拡張用） */
	customTags: z.array(z.string()).optional(),

	// === 日付情報完全対応 ===
	/** 販売日（元の文字列） */
	releaseDate: z.string().optional(),
	/** ソート用ISO日付（YYYY-MM-DD） */
	releaseDateISO: z.string().optional(),
	/** 表示用日本語日付（2023年03月05日） */
	releaseDateDisplay: z.string().optional(),

	// === 拡張メタデータ ===
	/** シリーズ名 */
	seriesName: z.string().optional(),
	/** 年齢制限 */
	ageRating: z.string().optional(),
	/** 作品形式 */
	workFormat: z.string().optional(),
	/** ファイル形式 */
	fileFormat: z.string().optional(),

	// === 拡張ファイル情報 ===
	/** ファイル詳細情報 */
	fileInfo: z
		.object({
			totalSizeText: z.string(),
			totalSizeBytes: z.number().optional(),
			totalDuration: z.string().optional(),
			fileCount: z.number().optional(),
			formats: z.array(z.string()).default([]),
			additionalFiles: z.array(z.string()).default([]),
		})
		.optional(),

	// === 詳細情報 ===
	/** 特典情報 */
	bonusContent: z.array(BonusContentSchema).default([]),
	/** サンプル画像 */
	sampleImages: z
		.array(
			z.object({
				thumb: z.string(),
				width: z.number().optional(),
				height: z.number().optional(),
			}),
		)
		.default([]),
	/** 独占配信フラグ */
	isExclusive: z.boolean().default(false),

	// === 言語・翻訳情報 ===
	/** 翻訳情報 */
	translationInfo: TranslationInfoSchema.optional(),
	/** 言語別ダウンロード情報 */
	languageDownloads: z.array(LanguageDownloadSchema).optional(),

	// === 統合データソース追跡 ===
	/** データソース別追跡情報 */
	dataSources: DataSourceTrackingSchema.optional(),

	// === システム管理情報 ===
	/** 最終取得日時 */
	lastFetchedAt: z.string().datetime(),
	/** 作成日時 */
	createdAt: z.string().datetime(),
	/** 更新日時 */
	updatedAt: z.string().datetime(),
});

// FirestoreDLsiteWorkSchemaは削除 - OptimizedFirestoreDLsiteWorkSchemaのみ使用

/**
 * フロントエンド表示用のDLsite作品データのZodスキーマ定義
 */
export const FrontendDLsiteWorkSchema = OptimizedFirestoreDLsiteWorkSchema.extend({
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
export type WorkLanguage = z.infer<typeof WorkLanguageSchema>;
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
// FirestoreDLsiteWorkData型は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用
export type OptimizedFirestoreDLsiteWorkData = z.infer<typeof OptimizedFirestoreDLsiteWorkSchema>;
export type DataSourceTracking = z.infer<typeof DataSourceTrackingSchema>;
export type FrontendDLsiteWorkData = z.infer<typeof FrontendDLsiteWorkSchema>;
export type WorkListResult = z.infer<typeof WorkListResultSchema>;
export type WorkPaginationParams = z.infer<typeof WorkPaginationParamsSchema>;

/**
 * 日付最適化ユーティリティ関数
 * 日本語日付文字列をISO形式と表示形式に変換
 */
export function optimizeDateFormats(dateString: string): {
	original: string;
	iso?: string;
	display: string;
} {
	// "2023年03月05日" → { iso: "2023-03-05", display: "2023年03月05日" }
	const match = dateString.match(/(\d{4})年(\d{2})月(\d{2})日/);
	if (match) {
		const [, year, month, day] = match;
		return {
			original: dateString,
			iso: `${year}-${month}-${day}`,
			display: dateString,
		};
	}

	// ISO形式の場合 "2023-03-05" → 日本語形式に変換
	const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		return {
			original: dateString,
			iso: dateString,
			display: `${year}年${month}月${day}日`,
		};
	}

	return {
		original: dateString,
		display: dateString,
	};
}

/**
 * ファイルサイズ文字列をバイト数に変換
 */
export function parseSizeToBytes(sizeText?: string): number | undefined {
	if (!sizeText) return undefined;
	const match = sizeText.match(/([\d.]+)\s*(MB|GB|KB)/i);
	if (!match) return undefined;

	const [, num, unit] = match;
	if (!unit || !num) return undefined;
	const size = Number.parseFloat(num);

	switch (unit.toUpperCase()) {
		case "KB":
			return Math.round(size * 1024);
		case "MB":
			return Math.round(size * 1024 * 1024);
		case "GB":
			return Math.round(size * 1024 * 1024 * 1024);
		default:
			return undefined;
	}
}

// migrateFileInfo関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

// migrateToOptimizedStructure関数は削除 - OptimizedFirestoreDLsiteWorkDataのみ使用

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 * @param data Firestoreから取得したデータ
 * @returns フロントエンド表示用に変換されたデータ
 */
/**
 * 表示用価格テキストを生成
 */
function generateDisplayPrice(price: OptimizedFirestoreDLsiteWorkData["price"]): string {
	return price.discount && price.original
		? `${price.current}円（元：${price.original}円）`
		: `${price.current}円`;
}

/**
 * 評価テキストを生成
 */
function generateRatingText(
	rating?: OptimizedFirestoreDLsiteWorkData["rating"],
): string | undefined {
	return rating ? `★${rating.stars.toFixed(1)} (${rating.count}件)` : undefined;
}

/**
 * ダウンロード数テキストを生成
 */
function generateDownloadText(
	data: Pick<OptimizedFirestoreDLsiteWorkData, "totalDownloadCount" | "salesCount">,
): string | undefined {
	if (data.totalDownloadCount) {
		return `DL${data.totalDownloadCount.toLocaleString()}`;
	}
	if (data.salesCount) {
		return `DL${data.salesCount.toLocaleString()}`;
	}
	return undefined;
}

/**
 * エラー時のフォールバック用フロントエンドデータを生成
 */
function createFallbackFrontendWork(
	data: OptimizedFirestoreDLsiteWorkData,
): FrontendDLsiteWorkData {
	const displayPrice = generateDisplayPrice(data.price);
	const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
	const ratingText = generateRatingText(data.rating);
	const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;
	const ageRating =
		data.ageRating || data.dataSources?.detailPage?.basicInfo?.ageRating || undefined;

	return {
		id: data.id,
		productId: data.productId,
		title: data.title,
		circle: data.circle,
		description: data.description || "",
		category: data.category,
		workUrl: data.workUrl,
		thumbnailUrl: data.thumbnailUrl,
		highResImageUrl: data.highResImageUrl,
		price: data.price,
		rating: data.rating,
		salesCount: data.salesCount,

		// 統一されたクリエイター情報
		voiceActors: data.voiceActors || [],
		scenario: data.scenario || [],
		illustration: data.illustration || [],
		music: data.music || [],
		author: data.author || [],

		// 統一された作品情報
		releaseDate: data.releaseDate,
		seriesName: data.seriesName,
		ageRating,
		workFormat: data.workFormat,
		fileFormat: data.fileFormat,
		tags: data.tags || [],

		sampleImages: data.sampleImages || [],
		isExclusive: data.isExclusive || false,

		// 拡張情報
		genres: data.genres || [],
		dataSources: data.dataSources,
		fileInfo: data.fileInfo,
		bonusContent: data.bonusContent || [],

		lastFetchedAt: data.lastFetchedAt,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		displayPrice,
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
	};
}

export function convertToFrontendWork(
	data: OptimizedFirestoreDLsiteWorkData,
): FrontendDLsiteWorkData {
	// 表示用テキストの生成
	const displayPrice = generateDisplayPrice(data.price);
	const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
	const ratingText = generateRatingText(data.rating);
	const wishlistText = data.wishlistCount ? `♡${data.wishlistCount.toLocaleString()}` : undefined;
	const downloadText = generateDownloadText(data);
	const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;

	// 年齢レーティングの取得（データソースから優先的に取得）
	const ageRating =
		data.ageRating || data.dataSources?.detailPage?.basicInfo?.ageRating || undefined;

	// FrontendDLsiteWorkSchema形式のデータを生成
	const frontendData: FrontendDLsiteWorkData = {
		...data,
		ageRating, // 修正: データソースから取得した年齢レーティングを使用
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
		return createFallbackFrontendWork(data);
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

/**
 * 作品言語コードから日本語表示名を取得
 * @param language 作品言語コード
 * @returns 日本語表示名
 */
export function getWorkLanguageDisplayName(language: WorkLanguage): string {
	return WORK_LANGUAGE_DISPLAY_NAMES[language];
}

/**
 * 作品言語コードから日本語表示名を安全に取得
 * 不明な言語の場合は言語コードをそのまま返す
 * @param language 作品言語コード（不明な値の可能性あり）
 * @returns 日本語表示名または言語コード
 */
export function getWorkLanguageDisplayNameSafe(language: string): string {
	// WorkLanguageに含まれているかチェック
	if (language in WORK_LANGUAGE_DISPLAY_NAMES) {
		return WORK_LANGUAGE_DISPLAY_NAMES[language as WorkLanguage];
	}
	// 不明な言語の場合はそのまま返す
	return language;
}

/**
 * タイトルから言語を判定
 */
function detectLanguageFromTitle(title: string): WorkLanguage | null {
	// 繁体中文版の判定
	if (title.includes("繁体中文版") || title.includes("繁體中文版")) {
		return "zh-tw";
	}

	// 簡体中文版の判定
	if (title.includes("簡体中文版") || title.includes("简体中文版")) {
		return "zh-cn";
	}

	// 英語版の判定
	if (title.includes("English") || title.includes("英語版") || title.includes("English Version")) {
		return "en";
	}

	// 韓国語版の判定
	if (title.includes("한국어") || title.includes("韓国語版") || title.includes("Korean")) {
		return "ko";
	}

	// スペイン語版の判定
	if (title.includes("Español") || title.includes("Spanish") || title.includes("スペイン語版")) {
		return "es";
	}

	return null;
}

/**
 * languageDownloadsから言語を判定
 */
function detectLanguageFromDownloads(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage | null {
	if (!work.languageDownloads || work.languageDownloads.length === 0) {
		return null;
	}

	const firstLanguage = work.languageDownloads[0];
	if (!firstLanguage) {
		return null;
	}

	const primaryLangCode = firstLanguage.lang.toLowerCase();

	// DLsiteの言語コードをWorkLanguageに変換
	switch (primaryLangCode) {
		case "ja":
		case "japanese":
			return "ja";
		case "en":
		case "english":
			return "en";
		case "zh-cn":
		case "zh_cn":
		case "chinese_simplified":
			return "zh-cn";
		case "zh-tw":
		case "zh_tw":
		case "chinese_traditional":
			return "zh-tw";
		case "ko":
		case "korean":
			return "ko";
		case "es":
		case "spanish":
			return "es";
		default:
			// 認識できない言語の場合はotherとして扱う
			return "other";
	}
}

/**
 * translationInfoから言語を判定
 */
function detectLanguageFromTranslation(
	work: OptimizedFirestoreDLsiteWorkData,
): WorkLanguage | null {
	if (!work.translationInfo) {
		return null;
	}

	// オリジナル作品であれば通常は日本語
	if (work.translationInfo.isOriginal) {
		return "ja";
	}
	// 翻訳作品の場合の言語判定はここに追加可能
	return null;
}

/**
 * タグ・ジャンルから言語を判定
 */
function detectLanguageFromTags(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage | null {
	const allTags = [...(work.genres || []), ...(work.tags || [])];

	// 英語作品の判定
	if (
		allTags.some(
			(tag) => tag.includes("英語") || tag.includes("english") || tag.toLowerCase().includes("en"),
		)
	) {
		return "en";
	}

	// 中国語作品の判定
	if (
		allTags.some(
			(tag) =>
				tag.includes("中文") ||
				tag.includes("繁體") ||
				tag.includes("簡體") ||
				tag.includes("chinese") ||
				tag.toLowerCase().includes("zh"),
		)
	) {
		// 繁体字・簡体字の区別
		if (allTags.some((tag) => tag.includes("繁體") || tag.includes("traditional"))) {
			return "zh-tw";
		}
		return "zh-cn";
	}

	// 韓国語作品の判定
	if (
		allTags.some(
			(tag) => tag.includes("한국어") || tag.includes("korean") || tag.toLowerCase().includes("ko"),
		)
	) {
		return "ko";
	}

	// スペイン語作品の判定
	if (
		allTags.some(
			(tag) =>
				tag.includes("spanish") || tag.includes("español") || tag.toLowerCase().includes("es"),
		)
	) {
		return "es";
	}

	return null;
}

/**
 * 作品のプライマリ言語を取得
 * @param work 作品データ
 * @returns プライマリ言語コード
 */
export function getWorkPrimaryLanguage(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage {
	const title = work.title || "";

	// 1. タイトルから言語判定（最優先）
	const titleLanguage = detectLanguageFromTitle(title);
	if (titleLanguage) {
		return titleLanguage;
	}

	// 2. languageDownloads から言語を取得（2番目の優先度）
	const downloadLanguage = detectLanguageFromDownloads(work);
	if (downloadLanguage) {
		return downloadLanguage;
	}

	// 3. translationInfo から言語を推定（3番目の優先度）
	const translationLanguage = detectLanguageFromTranslation(work);
	if (translationLanguage) {
		return translationLanguage;
	}

	// 4. フォールバック: タグ・ジャンルから言語を推定
	const tagLanguage = detectLanguageFromTags(work);
	if (tagLanguage) {
		return tagLanguage;
	}

	// 5. 最終フォールバック: 日本語（デフォルト）
	return "ja";
}

/**
 * 作品で利用可能な全言語を取得
 * @param work 作品データ
 * @returns 利用可能な言語コードの配列
 */
export function getWorkAvailableLanguages(work: OptimizedFirestoreDLsiteWorkData): WorkLanguage[] {
	const languages: Set<WorkLanguage> = new Set();

	// プライマリ言語を追加
	const primaryLang = getWorkPrimaryLanguage(work);
	languages.add(primaryLang);

	// languageDownloads から利用可能な言語を追加
	if (work.languageDownloads && work.languageDownloads.length > 0) {
		for (const langDownload of work.languageDownloads) {
			const langCode = langDownload.lang.toLowerCase();

			switch (langCode) {
				case "ja":
				case "japanese":
					languages.add("ja");
					break;
				case "en":
				case "english":
					languages.add("en");
					break;
				case "zh-cn":
				case "zh_cn":
				case "chinese_simplified":
					languages.add("zh-cn");
					break;
				case "zh-tw":
				case "zh_tw":
				case "chinese_traditional":
					languages.add("zh-tw");
					break;
				case "ko":
				case "korean":
					languages.add("ko");
					break;
				case "es":
				case "spanish":
					languages.add("es");
					break;
				default:
					languages.add("other");
					break;
			}
		}
	}

	return Array.from(languages);
}

/**
 * 作品を言語でフィルタリング
 * @param works 作品配列
 * @param language フィルタリング対象言語
 * @returns フィルタリングされた作品配列
 */
export function filterWorksByLanguage(
	works: OptimizedFirestoreDLsiteWorkData[],
	language: string,
): OptimizedFirestoreDLsiteWorkData[] {
	if (!language || language === "all") {
		return works;
	}

	const targetLang = language.toLowerCase();

	return works.filter((work) => {
		// プライマリ言語をチェック
		const primaryLang = getWorkPrimaryLanguage(work);
		if (primaryLang === targetLang) {
			return true;
		}

		// 利用可能な言語もチェック（多言語対応作品用）
		const availableLanguages = getWorkAvailableLanguages(work);
		return availableLanguages.includes(targetLang as WorkLanguage);
	});
}
