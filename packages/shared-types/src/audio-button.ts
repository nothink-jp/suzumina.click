import { z } from "zod";

// カテゴリーシステムを削除し、タグベースのシステムに移行

/**
 * 音声ファイル形式
 */
export const AudioFormatSchema = z.enum([
	"opus", // Opus (推奨)
	"aac", // AAC
	"mp3", // MP3
	"wav", // WAV
	"flac", // FLAC
]);

/**
 * 音声ボタンの基本情報スキーマ
 */
export const AudioButtonBaseSchema = z.object({
	id: z.string().min(1, {
		message: "音声ボタンIDは1文字以上である必要があります",
	}),
	title: z
		.string()
		.min(1, {
			message: "タイトルは1文字以上である必要があります",
		})
		.max(100, {
			message: "タイトルは100文字以下である必要があります",
		}),
	description: z
		.string()
		.max(500, {
			message: "説明は500文字以下である必要があります",
		})
		.optional(),
	tags: z
		.array(z.string().min(1).max(30))
		.max(10, {
			message: "タグは最大10個まで設定できます",
		})
		.default([]),
});

/**
 * Firestoreに保存する音声ボタンデータのスキーマ
 */
export const FirestoreAudioButtonSchema = AudioButtonBaseSchema.extend({
	// YouTube動画情報（必須）
	sourceVideoId: z.string().min(1, {
		message: "YouTube動画IDは必須です",
	}),
	sourceVideoTitle: z.string().optional(),
	startTime: z.number().min(0), // 開始時刻（秒）
	endTime: z.number().min(0), // 終了時刻（秒）

	// ユーザー情報
	createdBy: z.string().min(1, {
		message: "作成者IDは必須です",
	}),
	createdByName: z.string().min(1, {
		message: "作成者名は必須です",
	}),
	isPublic: z.boolean().default(true),

	// 統計情報
	playCount: z.number().int().min(0).default(0),
	likeCount: z.number().int().min(0).default(0),
	dislikeCount: z.number().int().min(0).default(0),
	favoriteCount: z.number().int().min(0).default(0),

	// 管理情報
	createdAt: z.string().datetime({
		message: "作成日時はISO形式の日時である必要があります",
	}),
	updatedAt: z.string().datetime({
		message: "更新日時はISO形式の日時である必要があります",
	}),
});

/**
 * フロントエンド表示用の音声ボタンデータスキーマ
 */
export const FrontendAudioButtonSchema = AudioButtonBaseSchema.extend({
	// YouTube動画情報
	sourceVideoId: z.string().min(1),
	sourceVideoTitle: z.string().optional(),
	sourceVideoThumbnailUrl: z.string().url().optional(),
	startTime: z.number().min(0),
	endTime: z.number().min(0),

	// ユーザー情報
	createdBy: z.string().min(1),
	createdByName: z.string().min(1),
	isPublic: z.boolean(),

	// 統計情報
	playCount: z.number().int().min(0),
	likeCount: z.number().int().min(0),
	dislikeCount: z.number().int().min(0),
	favoriteCount: z.number().int().min(0),

	// 管理情報
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),

	// 表示用の追加情報
	durationText: z.string(), // "30秒" のような表示用テキスト
	relativeTimeText: z.string(), // "3日前" のような表示用テキスト
});

/**
 * 音声ボタン作成時の入力データスキーマ
 */
export const CreateAudioButtonInputSchema = z
	.object({
		title: z.string().min(1).max(100),
		description: z.string().max(500).optional(),
		tags: z.array(z.string().min(1).max(30)).max(10).default([]),

		// YouTube動画情報（必須）
		sourceVideoId: z.string().min(1, {
			message: "YouTube動画IDは必須です",
		}),
		startTime: z.number().min(0),
		endTime: z.number().min(0),

		// 公開設定
		isPublic: z.boolean().default(true),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "終了時間は開始時間より後である必要があります",
		path: ["endTime"],
	});

/**
 * 音声ボタン更新時の入力データスキーマ
 */
export const UpdateAudioButtonInputSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	tags: z.array(z.string().min(1).max(30)).max(10).optional(),
	isPublic: z.boolean().optional(),
	startTime: z.number().min(0).optional(),
	endTime: z.number().min(0).optional(),
});

/**
 * 音声ボタンリスト取得のクエリパラメータスキーマ
 */
export const AudioButtonQuerySchema = z.object({
	limit: z.number().int().positive().max(50).default(20),
	startAfter: z.string().optional(),
	page: z.number().int().positive().optional(), // ページベースのページネーション
	tags: z.array(z.string()).optional(),
	sourceVideoId: z.string().optional(),
	searchText: z.string().max(100).optional(),
	sortBy: z.enum(["newest", "oldest", "popular", "mostPlayed", "relevance"]).default("newest"),
	onlyPublic: z.boolean().default(true),
	includeTotalCount: z.boolean().default(false).optional(), // 総件数を含めるかどうか

	// 数値範囲フィルタ
	playCountMin: z.number().int().min(0).optional(),
	playCountMax: z.number().int().min(0).optional(),
	likeCountMin: z.number().int().min(0).optional(),
	likeCountMax: z.number().int().min(0).optional(),
	dislikeCountMin: z.number().int().min(0).optional(),
	dislikeCountMax: z.number().int().min(0).optional(),
	favoriteCountMin: z.number().int().min(0).optional(),
	favoriteCountMax: z.number().int().min(0).optional(),
	durationMin: z.number().int().min(0).optional(), // 秒単位
	durationMax: z.number().int().min(0).optional(), // 秒単位

	// 日付範囲フィルタ
	createdAfter: z.string().datetime().optional(),
	createdBefore: z.string().datetime().optional(),

	// ユーザーフィルタ
	createdBy: z.string().optional(),
});

/**
 * 音声ボタンリスト結果のスキーマ
 */
export const AudioButtonListResultSchema = z.object({
	audioButtons: z.array(FrontendAudioButtonSchema),
	hasMore: z.boolean(),
	lastAudioButton: FrontendAudioButtonSchema.optional(),
	totalCount: z.number().int().min(0).optional(),
	filteredCount: z.number().int().min(0).optional(), // フィルタリング後の件数
	currentPage: z.number().int().positive().optional(), // 現在のページ番号
	totalPages: z.number().int().min(0).optional(), // 総ページ数
});

/**
 * 音声ファイルアップロード情報のスキーマ
 */
export const AudioFileUploadInfoSchema = z.object({
	fileName: z.string().min(1),
	fileSize: z
		.number()
		.positive()
		.max(10 * 1024 * 1024, {
			message: "ファイルサイズは10MB以下である必要があります",
		}), // 10MB制限
	mimeType: z.enum([
		"audio/opus",
		"audio/aac",
		"audio/mpeg", // MP3
		"audio/wav",
		"audio/flac",
	]),
	duration: z
		.number()
		.positive()
		.max(60 * 5, {
			message: "音声の長さは5分以下である必要があります",
		}), // 5分制限
});

// 型定義のエクスポート
export type AudioFormat = z.infer<typeof AudioFormatSchema>;
export type AudioButtonBase = z.infer<typeof AudioButtonBaseSchema>;
export type FirestoreAudioButtonData = z.infer<typeof FirestoreAudioButtonSchema>;
export type FrontendAudioButtonData = z.infer<typeof FrontendAudioButtonSchema>;
export type CreateAudioButtonInput = z.infer<typeof CreateAudioButtonInputSchema>;
export type UpdateAudioButtonInput = z.infer<typeof UpdateAudioButtonInputSchema>;
export type AudioButtonQuery = z.infer<typeof AudioButtonQuerySchema>;
export type AudioButtonListResult = z.infer<typeof AudioButtonListResultSchema>;
export type AudioFileUploadInfo = z.infer<typeof AudioFileUploadInfoSchema>;

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 */
export function convertToFrontendAudioButton(
	data: FirestoreAudioButtonData,
): FrontendAudioButtonData {
	// 時間をフォーマット（例: 30 -> "30秒"）
	const formatDuration = (startTime: number, endTime: number): string => {
		const duration = endTime - startTime;
		return `${duration}秒`;
	};

	// 相対時間表示
	const formatRelativeTime = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		// 今日
		if (diffDays === 0) {
			return formatSameDayTime(diffMs);
		}

		// 昨日
		if (diffDays === 1) {
			return "昨日";
		}

		// それ以前
		return formatPastTime(diffDays);
	};

	const formatSameDayTime = (diffMs: number): string => {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return diffMinutes <= 1 ? "たった今" : `${diffMinutes}分前`;
		}
		return `${diffHours}時間前`;
	};

	const formatPastTime = (diffDays: number): string => {
		if (diffDays < 7) {
			return `${diffDays}日前`;
		}
		if (diffDays < 30) {
			const diffWeeks = Math.floor(diffDays / 7);
			return `${diffWeeks}週間前`;
		}
		if (diffDays < 365) {
			const diffMonths = Math.floor(diffDays / 30);
			return `${diffMonths}ヶ月前`;
		}
		const diffYears = Math.floor(diffDays / 365);
		return `${diffYears}年前`;
	};

	const frontendData: FrontendAudioButtonData = {
		...data,
		// タグのデフォルト値を設定
		tags: data.tags || [],
		durationText: formatDuration(data.startTime, data.endTime),
		relativeTimeText: formatRelativeTime(data.createdAt),

		// YouTubeのサムネイル情報を生成
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,

		// 統計情報のデフォルト値
		dislikeCount: data.dislikeCount || 0,
		favoriteCount: data.favoriteCount || 0,
	};

	// データの検証
	try {
		return FrontendAudioButtonSchema.parse(frontendData);
	} catch (_error) {
		// エラー時でも最低限のデータを返す
		return {
			id: data.id,
			title: data.title,
			description: data.description,
			tags: data.tags || [],
			sourceVideoId: data.sourceVideoId,
			sourceVideoTitle: data.sourceVideoTitle,
			sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
			startTime: data.startTime,
			endTime: data.endTime,
			createdBy: data.createdBy,
			createdByName: data.createdByName,
			isPublic: data.isPublic,
			playCount: data.playCount,
			likeCount: data.likeCount,
			dislikeCount: data.dislikeCount || 0,
			favoriteCount: data.favoriteCount || 0,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			durationText: formatDuration(data.startTime, data.endTime),
			relativeTimeText: formatRelativeTime(data.createdAt),
		};
	}
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 */
export function serializeAudioButtonForRSC(data: FrontendAudioButtonData): string {
	return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 */
export function deserializeAudioButtonForRCC(serialized: string): FrontendAudioButtonData {
	try {
		const data = JSON.parse(serialized);
		return FrontendAudioButtonSchema.parse(data);
	} catch (_error) {
		throw new Error("音声ボタンデータの形式が無効です");
	}
}

/**
 * リスト結果のシリアライズ関数
 */
export function serializeAudioButtonListResult(result: AudioButtonListResult): string {
	return JSON.stringify(result);
}

/**
 * リスト結果のデシリアライズ関数
 */
export function deserializeAudioButtonListResult(serialized: string): AudioButtonListResult {
	try {
		const data = JSON.parse(serialized);
		return AudioButtonListResultSchema.parse(data);
	} catch (_error) {
		return { audioButtons: [], hasMore: false };
	}
}

/**
 * 音声ボタン統計更新用のスキーマ
 */
export const UpdateAudioButtonStatsSchema = z.object({
	id: z.string().min(1),
	playCount: z.number().int().min(0).optional(),
	likeCount: z.number().int().min(0).optional(),
	dislikeCount: z.number().int().min(0).optional(),
	incrementPlayCount: z.boolean().optional(),
	incrementLikeCount: z.boolean().optional(),
	decrementLikeCount: z.boolean().optional(),
	incrementDislikeCount: z.boolean().optional(),
	decrementDislikeCount: z.boolean().optional(),
});

export type UpdateAudioButtonStats = z.infer<typeof UpdateAudioButtonStatsSchema>;

/**
 * 作成入力をFirestoreデータに変換
 */
export function convertCreateInputToFirestoreAudioButton(
	input: CreateAudioButtonInput,
	createdBy: string,
	createdByName: string,
): Omit<FirestoreAudioButtonData, "id"> {
	const now = new Date().toISOString();

	return {
		// id は add() 後に別途設定するため、初期作成時は含めない
		title: input.title,
		description: input.description,
		tags: input.tags || [],
		sourceVideoId: input.sourceVideoId,
		startTime: input.startTime,
		endTime: input.endTime,
		createdBy,
		createdByName,
		isPublic: input.isPublic,
		playCount: 0,
		likeCount: 0,
		dislikeCount: 0,
		favoriteCount: 0,
		createdAt: now,
		updatedAt: now,
	} as Omit<FirestoreAudioButtonData, "id">;
}

/**
 * 音声ボタン作成のバリデーション
 */
export function validateAudioButtonCreation(
	input: CreateAudioButtonInput,
	videoInfo: YouTubeVideoInfo,
	userId: string,
	existingButtons: FirestoreAudioButtonData[],
): string | null {
	// 動画の長さチェック
	if (input.endTime > (videoInfo?.duration || 0)) {
		return "終了時間が動画の長さを超えています";
	}

	// 重複チェック
	const isDuplicate = existingButtons.some(
		(button) =>
			button.createdBy === userId &&
			Math.abs(button.startTime - input.startTime) < 5 &&
			Math.abs(button.endTime - input.endTime) < 5,
	);

	if (isDuplicate) {
		return "類似の時間範囲で既に音声ボタンが作成されています";
	}

	return null;
}

/**
 * 音声ボタンのフィルタリング（高度フィルタリング対応）
 */
export function filterAudioButtons(
	buttons: FrontendAudioButtonData[],
	filters: {
		tags?: string[];
		searchText?: string;
		playCountMin?: number;
		playCountMax?: number;
		likeCountMin?: number;
		likeCountMax?: number;
		dislikeCountMin?: number;
		dislikeCountMax?: number;
		favoriteCountMin?: number;
		favoriteCountMax?: number;
		durationMin?: number;
		durationMax?: number;
		createdAfter?: string;
		createdBefore?: string;
		createdBy?: string;
	},
): FrontendAudioButtonData[] {
	return buttons.filter((button) => {
		return (
			matchesTags(button, filters.tags) &&
			matchesSearchText(button, filters.searchText) &&
			matchesNumericRange(button.playCount, filters.playCountMin, filters.playCountMax) &&
			matchesNumericRange(button.likeCount, filters.likeCountMin, filters.likeCountMax) &&
			matchesNumericRange(button.dislikeCount, filters.dislikeCountMin, filters.dislikeCountMax) &&
			matchesNumericRange(
				button.favoriteCount,
				filters.favoriteCountMin,
				filters.favoriteCountMax,
			) &&
			matchesDurationRange(button, filters.durationMin, filters.durationMax) &&
			matchesDateRange(button.createdAt, filters.createdAfter, filters.createdBefore) &&
			matchesCreatedBy(button, filters.createdBy)
		);
	});
}

const matchesTags = (button: FrontendAudioButtonData, tags?: string[]): boolean => {
	if (!tags || tags.length === 0) {
		return true;
	}

	const buttonTags = button.tags || [];
	return tags.some((tag) =>
		buttonTags.some((buttonTag) => buttonTag.toLowerCase().includes(tag.toLowerCase())),
	);
};

const matchesSearchText = (button: FrontendAudioButtonData, searchText?: string): boolean => {
	if (!searchText) {
		return true;
	}

	const searchLower = searchText.toLowerCase();
	const searchableText = [button.title, button.description || "", ...(button.tags || [])]
		.join(" ")
		.toLowerCase();

	return searchableText.includes(searchLower);
};

// 数値範囲フィルタのヘルパー関数
const matchesNumericRange = (value: number, min?: number, max?: number): boolean => {
	if (min !== undefined && value < min) {
		return false;
	}
	if (max !== undefined && value > max) {
		return false;
	}
	return true;
};

// 音声長フィルタのヘルパー関数
const matchesDurationRange = (
	button: FrontendAudioButtonData,
	min?: number,
	max?: number,
): boolean => {
	const duration = button.endTime - button.startTime;
	return matchesNumericRange(duration, min, max);
};

// 日付範囲フィルタのヘルパー関数
const matchesDateRange = (createdAt: string, after?: string, before?: string): boolean => {
	const buttonDate = new Date(createdAt);

	if (after && buttonDate < new Date(after)) {
		return false;
	}
	if (before && buttonDate > new Date(before)) {
		return false;
	}
	return true;
};

// 作成者フィルタのヘルパー関数
const matchesCreatedBy = (button: FrontendAudioButtonData, createdBy?: string): boolean => {
	if (!createdBy) {
		return true;
	}
	return button.createdBy === createdBy;
};

/**
 * 音声ボタンのソート
 */
export function sortAudioButtons(
	buttons: FrontendAudioButtonData[],
	sortBy: "newest" | "oldest" | "popular" | "mostPlayed" | "relevance",
): FrontendAudioButtonData[] {
	return [...buttons].sort((a, b) => {
		switch (sortBy) {
			case "newest":
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			case "oldest":
				return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			case "popular": {
				// ネットスコア（高評価 - 低評価）で判定
				const aNetScore = a.likeCount - a.dislikeCount;
				const bNetScore = b.likeCount - b.dislikeCount;
				return bNetScore - aNetScore;
			}
			case "mostPlayed":
				return b.playCount - a.playCount;
			case "relevance":
				// 関連度順の場合は現在の順序を保持
				return 0;
			default:
				return 0;
		}
	});
}

/**
 * レート制限チェック用のヘルパー関数
 */
export function checkRateLimit(
	recentCreations: FirestoreAudioButtonData[],
	userDiscordId: string,
	dailyLimit = 20,
): { allowed: boolean; remainingQuota: number; resetTime: Date } {
	const now = new Date();
	const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// 過去24時間での作成数をカウント
	const recentCreationsFromUser = recentCreations.filter((creation) => {
		const createdAt = new Date(creation.createdAt);
		return creation.createdBy === userDiscordId && createdAt > twentyFourHoursAgo;
	});

	const usedQuota = recentCreationsFromUser.length;
	const remainingQuota = Math.max(0, dailyLimit - usedQuota);
	const allowed = remainingQuota > 0;

	// 最も古い作成から24時間後がリセット時間
	const oldestCreation = recentCreationsFromUser.sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	)[0];

	const resetTime = oldestCreation
		? new Date(new Date(oldestCreation.createdAt).getTime() + 24 * 60 * 60 * 1000)
		: new Date(now.getTime() + 24 * 60 * 60 * 1000);

	return {
		allowed,
		remainingQuota,
		resetTime,
	};
}

/**
 * YouTube動画情報の型定義
 */
export interface YouTubeVideoInfo {
	id: string;
	title: string;
	duration: number; // 秒数
	thumbnailUrl: string;
	channelTitle: string;
	publishedAt: string;
}

// カテゴリー関連の関数は削除（タグベースシステムに移行）

/**
 * @deprecated TimeDisplayコンポーネントを使用してください
 * 秒数を時:分:秒形式にフォーマット
 */
export function formatTimestamp(seconds: number): string {
	// 強制的に0.1秒精度でフォーマット
	const preciseSeconds = Math.round(seconds * 10) / 10;

	const hours = Math.floor(preciseSeconds / 3600);
	const minutes = Math.floor((preciseSeconds % 3600) / 60);
	const wholeSecs = Math.floor(preciseSeconds % 60);
	const decimal = Math.round((preciseSeconds % 1) * 10);

	const secsFormatted = wholeSecs.toString().padStart(2, "0");
	const secsWithDecimal = `${secsFormatted}.${decimal}`;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secsWithDecimal}`;
	}
	return `${minutes}:${secsWithDecimal}`;
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 */
export interface FirestoreServerAudioButtonData {
	id: string;
	title: string;
	description?: string;
	tags: string[];

	// YouTube動画情報
	sourceVideoId: string;
	sourceVideoTitle?: string;
	startTime: number;
	endTime: number;

	// ユーザー・権限情報
	createdBy: string;
	createdByName: string;
	isPublic: boolean;

	// 統計情報
	playCount: number;
	likeCount: number;
	favoriteCount: number;

	// 管理情報（Firestore Timestamp型）
	createdAt: unknown; // Firestore.Timestamp型
	updatedAt: unknown; // Firestore.Timestamp型
}
