import { z } from "zod";

/**
 * 音声ボタンのカテゴリ
 */
export const AudioButtonCategorySchema = z.enum([
	"voice", // ボイス
	"bgm", // BGM・音楽
	"se", // 効果音
	"talk", // トーク・会話
	"singing", // 歌唱
	"other", // その他
]);

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
	category: AudioButtonCategorySchema,
	tags: z
		.array(z.string().min(1).max(20))
		.max(10, {
			message: "タグは最大10個まで設定できます",
		})
		.optional(),
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
	uploadedBy: z.string().min(1, {
		message: "アップローダーIDは必須です",
	}),
	uploadedByName: z.string().min(1, {
		message: "アップローダー名は必須です",
	}),
	isPublic: z.boolean().default(true),

	// 統計情報
	playCount: z.number().int().min(0).default(0),
	likeCount: z.number().int().min(0).default(0),
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
	uploadedBy: z.string().min(1),
	uploadedByName: z.string().min(1),
	isPublic: z.boolean(),

	// 統計情報
	playCount: z.number().int().min(0),
	likeCount: z.number().int().min(0),
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
		category: AudioButtonCategorySchema,
		tags: z.array(z.string().min(1).max(20)).max(10).optional(),

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
	category: AudioButtonCategorySchema.optional(),
	tags: z.array(z.string().min(1).max(20)).max(10).optional(),
	isPublic: z.boolean().optional(),
});

/**
 * 音声ボタンリスト取得のクエリパラメータスキーマ
 */
export const AudioButtonQuerySchema = z.object({
	limit: z.number().int().positive().max(50).default(20),
	startAfter: z.string().optional(),
	category: AudioButtonCategorySchema.optional(),
	tags: z.array(z.string()).optional(),
	sourceVideoId: z.string().optional(),
	searchText: z.string().max(100).optional(),
	sortBy: z.enum(["newest", "oldest", "popular", "mostPlayed"]).default("newest"),
	onlyPublic: z.boolean().default(true),
});

/**
 * 音声ボタンリスト結果のスキーマ
 */
export const AudioButtonListResultSchema = z.object({
	audioButtons: z.array(FrontendAudioButtonSchema),
	hasMore: z.boolean(),
	lastAudioButton: FrontendAudioButtonSchema.optional(),
	totalCount: z.number().int().min(0).optional(),
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
export type AudioButtonCategory = z.infer<typeof AudioButtonCategorySchema>;
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
		durationText: formatDuration(data.startTime, data.endTime),
		relativeTimeText: formatRelativeTime(data.createdAt),

		// YouTubeのサムネイル情報を生成
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,

		// お気に入り数のデフォルト値
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
			category: data.category,
			tags: data.tags || [],
			sourceVideoId: data.sourceVideoId,
			sourceVideoTitle: data.sourceVideoTitle,
			sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
			startTime: data.startTime,
			endTime: data.endTime,
			uploadedBy: data.uploadedBy,
			uploadedByName: data.uploadedByName,
			isPublic: data.isPublic,
			playCount: data.playCount,
			likeCount: data.likeCount,
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
	incrementPlayCount: z.boolean().optional(),
	incrementLikeCount: z.boolean().optional(),
	decrementLikeCount: z.boolean().optional(),
});

export type UpdateAudioButtonStats = z.infer<typeof UpdateAudioButtonStatsSchema>;

/**
 * 作成入力をFirestoreデータに変換
 */
export function convertCreateInputToFirestoreAudioButton(
	input: CreateAudioButtonInput,
	uploadedBy: string,
	uploadedByName: string,
): Omit<FirestoreAudioButtonData, "id"> {
	const now = new Date().toISOString();

	return {
		// id は add() 後に別途設定するため、初期作成時は含めない
		title: input.title,
		description: input.description,
		category: input.category,
		tags: input.tags,
		sourceVideoId: input.sourceVideoId,
		startTime: input.startTime,
		endTime: input.endTime,
		uploadedBy,
		uploadedByName,
		isPublic: input.isPublic,
		playCount: 0,
		likeCount: 0,
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
			button.uploadedBy === userId &&
			Math.abs(button.startTime - input.startTime) < 5 &&
			Math.abs(button.endTime - input.endTime) < 5,
	);

	if (isDuplicate) {
		return "類似の時間範囲で既に音声ボタンが作成されています";
	}

	return null;
}

/**
 * 音声ボタンのフィルタリング
 */
export function filterAudioButtons(
	buttons: FrontendAudioButtonData[],
	filters: { category?: AudioButtonCategory; tags?: string[]; searchText?: string },
): FrontendAudioButtonData[] {
	return buttons.filter((button) => {
		return (
			matchesCategory(button, filters.category) &&
			matchesTags(button, filters.tags) &&
			matchesSearchText(button, filters.searchText)
		);
	});
}

const matchesCategory = (
	button: FrontendAudioButtonData,
	category?: AudioButtonCategory,
): boolean => {
	return !category || button.category === category;
};

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

/**
 * 音声ボタンのソート
 */
export function sortAudioButtons(
	buttons: FrontendAudioButtonData[],
	sortBy: "newest" | "oldest" | "popular" | "mostPlayed",
): FrontendAudioButtonData[] {
	return [...buttons].sort((a, b) => {
		switch (sortBy) {
			case "newest":
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			case "oldest":
				return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			case "popular":
				return b.likeCount - a.likeCount;
			case "mostPlayed":
				return b.playCount - a.playCount;
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
		return creation.uploadedBy === userDiscordId && createdAt > twentyFourHoursAgo;
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

/**
 * 音声ボタンカテゴリの表示名を取得
 */
export function getAudioButtonCategoryLabel(category: AudioButtonCategory): string {
	const labels = {
		voice: "ボイス",
		bgm: "BGM",
		se: "効果音",
		talk: "トーク",
		singing: "歌唱",
		other: "その他",
	};
	return labels[category];
}

/**
 * 秒数を時:分:秒形式にフォーマット
 */
export function formatTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 */
export interface FirestoreServerAudioButtonData {
	id: string;
	title: string;
	description?: string;
	category: AudioButtonCategory;
	tags?: string[];

	// YouTube動画情報
	sourceVideoId: string;
	sourceVideoTitle?: string;
	startTime: number;
	endTime: number;

	// ユーザー・権限情報
	uploadedBy: string;
	uploadedByName: string;
	isPublic: boolean;

	// 統計情報
	playCount: number;
	likeCount: number;
	favoriteCount: number;

	// 管理情報（Firestore Timestamp型）
	createdAt: unknown; // Firestore.Timestamp型
	updatedAt: unknown; // Firestore.Timestamp型
}
