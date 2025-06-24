import { z } from "zod";

/**
 * 音声ボタンのカテゴリ（AudioReferenceシステム用）
 */
export const AudioReferenceCategorySchema = z.enum([
	"voice", // ボイス
	"bgm", // BGM・音楽
	"se", // 効果音
	"talk", // トーク・会話
	"singing", // 歌唱
	"other", // その他
]);

/**
 * 音声リファレンスの基本情報スキーマ
 */
export const AudioReferenceBaseSchema = z.object({
	id: z.string().min(1, {
		message: "音声リファレンスIDは1文字以上である必要があります",
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
	category: AudioReferenceCategorySchema,
	tags: z
		.array(z.string().min(1).max(20))
		.max(10, {
			message: "タグは最大10個まで設定できます",
		})
		.optional(),
});

/**
 * Firestoreに保存する音声リファレンスデータのスキーマ
 */
export const FirestoreAudioReferenceSchema = AudioReferenceBaseSchema.extend({
	// YouTube動画情報
	videoId: z.string().min(1, {
		message: "YouTube動画IDは必須です",
	}),
	videoTitle: z.string().min(1, {
		message: "YouTube動画タイトルは必須です",
	}),
	videoThumbnailUrl: z.string().url().optional(),
	channelId: z.string().optional(),
	channelTitle: z.string().optional(),

	// タイムスタンプ情報
	startTime: z.number().min(0, {
		message: "開始時間は0以上である必要があります",
	}),
	endTime: z.number().min(0, {
		message: "終了時間は0以上である必要があります",
	}),
	duration: z.number().positive({
		message: "再生時間は正の数である必要があります",
	}), // endTime - startTime

	// ユーザー認証情報
	createdBy: z.string().min(1, {
		message: "作成者情報は必須です",
	}), // Discord User ID
	createdByName: z.string().min(1, {
		message: "作成者名は必須です",
	}), // 表示用ユーザー名

	// 公開設定
	isPublic: z.boolean().default(true),

	// 統計情報
	playCount: z.number().int().min(0).default(0),
	likeCount: z.number().int().min(0).default(0),
	viewCount: z.number().int().min(0).default(0), // ボタン自体の表示回数

	// 管理情報
	createdAt: z.string().datetime({
		message: "作成日時はISO形式の日時である必要があります",
	}),
	updatedAt: z.string().datetime({
		message: "更新日時はISO形式の日時である必要があります",
	}),

	// モデレーション情報
	isReported: z.boolean().default(false),
	reportCount: z.number().int().min(0).default(0),
	moderationStatus: z.enum(["approved", "pending", "rejected"]).default("approved"),
});

/**
 * フロントエンド表示用の音声リファレンスデータスキーマ
 */
export const FrontendAudioReferenceSchema = AudioReferenceBaseSchema.extend({
	// YouTube動画情報
	videoId: z.string(),
	videoTitle: z.string(),
	videoThumbnailUrl: z.string().url().optional(),
	channelId: z.string().optional(),
	channelTitle: z.string().optional(),

	// タイムスタンプ情報
	startTime: z.number().min(0),
	endTime: z.number().min(0),
	duration: z.number().positive(),

	// ユーザー情報
	createdBy: z.string(),
	createdByName: z.string(),

	// 統計情報
	playCount: z.number().int().min(0),
	likeCount: z.number().int().min(0),
	viewCount: z.number().int().min(0),

	// 管理情報（ISO文字列形式）
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	createdAtISO: z.string().datetime(),
	updatedAtISO: z.string().datetime(),

	// 表示用の追加情報
	durationText: z.string(), // "1:23" のような表示用テキスト
	timestampText: z.string(), // "0:45 - 2:08" のような表示用テキスト
	youtubeUrl: z.string().url(), // "https://www.youtube.com/watch?v=VIDEO_ID&t=45s"
	youtubeEmbedUrl: z.string().url(), // "https://www.youtube.com/embed/VIDEO_ID?start=45&end=128"
});

/**
 * 音声リファレンス作成時の入力データスキーマ
 */
export const CreateAudioReferenceInputSchema = z
	.object({
		title: z.string().min(1).max(100),
		description: z.string().max(500).optional(),
		category: AudioReferenceCategorySchema,
		tags: z.array(z.string().min(1).max(20)).max(10).optional(),

		// YouTube動画情報
		videoId: z.string().min(1, {
			message: "YouTube動画IDは必須です",
		}),

		// タイムスタンプ情報
		startTime: z.number().min(0, {
			message: "開始時間は0以上である必要があります",
		}),
		endTime: z.number().min(0, {
			message: "終了時間は0以上である必要があります",
		}),

		// 公開設定
		isPublic: z.boolean().default(true),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "終了時間は開始時間より後である必要があります",
		path: ["endTime"],
	})
	.refine((data) => data.endTime - data.startTime <= 60, {
		message: "音声ボタンの長さは60秒以下である必要があります",
		path: ["endTime"],
	})
	.refine((data) => data.endTime - data.startTime >= 1, {
		message: "音声ボタンの長さは1秒以上である必要があります",
		path: ["endTime"],
	});

/**
 * 音声リファレンス更新時の入力データスキーマ
 */
export const UpdateAudioReferenceInputSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	category: AudioReferenceCategorySchema.optional(),
	tags: z.array(z.string().min(1).max(20)).max(10).optional(),
	isPublic: z.boolean().optional(),
});

/**
 * 音声リファレンス統計更新用スキーマ
 */
export const UpdateAudioReferenceStatsSchema = z.object({
	id: z.string().min(1),
	incrementPlayCount: z.boolean().default(false),
	incrementLikeCount: z.boolean().default(false),
	incrementViewCount: z.boolean().default(false),
	decrementLikeCount: z.boolean().default(false),
});

/**
 * 音声リファレンスリスト取得のクエリパラメータスキーマ
 */
export const AudioReferenceQuerySchema = z.object({
	limit: z.number().int().positive().max(50).default(20),
	startAfter: z.string().optional(),
	category: AudioReferenceCategorySchema.optional(),
	tags: z.array(z.string()).optional(),
	videoId: z.string().optional(),
	searchText: z.string().max(100).optional(),
	sortBy: z.enum(["newest", "oldest", "popular", "mostPlayed", "mostLiked"]).default("newest"),
	onlyPublic: z.boolean().default(true),
});

/**
 * 音声リファレンスリスト結果のスキーマ
 */
export const AudioReferenceListResultSchema = z.object({
	audioReferences: z.array(FrontendAudioReferenceSchema),
	hasMore: z.boolean(),
	lastAudioReference: FrontendAudioReferenceSchema.optional(),
	totalCount: z.number().int().min(0).optional(),
});

/**
 * YouTube動画情報スキーマ（音声リファレンス作成時に取得）
 */
export const YouTubeVideoInfoSchema = z.object({
	videoId: z.string(),
	title: z.string(),
	channelId: z.string().optional(),
	channelTitle: z.string().optional(),
	thumbnailUrl: z.string().url().optional(),
	duration: z.number().positive().optional(), // 動画全体の長さ（秒）
	publishedAt: z.string().datetime().optional(),
});

// 型定義のエクスポート
export type AudioReferenceCategory = z.infer<typeof AudioReferenceCategorySchema>;
export type AudioReferenceBase = z.infer<typeof AudioReferenceBaseSchema>;
export type FirestoreAudioReferenceData = z.infer<typeof FirestoreAudioReferenceSchema>;
export type FrontendAudioReferenceData = z.infer<typeof FrontendAudioReferenceSchema>;
export type CreateAudioReferenceInput = z.infer<typeof CreateAudioReferenceInputSchema>;
export type UpdateAudioReferenceInput = z.infer<typeof UpdateAudioReferenceInputSchema>;
export type UpdateAudioReferenceStats = z.infer<typeof UpdateAudioReferenceStatsSchema>;
export type AudioReferenceQuery = z.infer<typeof AudioReferenceQuerySchema>;
export type AudioReferenceListResult = z.infer<typeof AudioReferenceListResultSchema>;
export type YouTubeVideoInfo = z.infer<typeof YouTubeVideoInfoSchema>;

/**
 * カテゴリ表示名を取得するヘルパー関数
 */
export function getAudioReferenceCategoryLabel(category: AudioReferenceCategory): string {
	const labels: Record<AudioReferenceCategory, string> = {
		voice: "ボイス",
		bgm: "BGM・音楽",
		se: "効果音",
		talk: "トーク・会話",
		singing: "歌唱",
		other: "その他",
	};
	return labels[category];
}

/**
 * 推奨タグリスト
 */
export const SUGGESTED_AUDIO_REFERENCE_TAGS = [
	"挨拶",
	"感謝",
	"お礼",
	"応援",
	"励まし",
	"慰め",
	"優しさ",
	"朝",
	"夜",
	"おやすみ",
	"お疲れ様",
	"がんばって",
	"大丈夫",
	"かわいい",
	"おもしろい",
	"癒し",
	"元気",
	"笑い",
	"驚き",
	"疲れた",
	"眠い",
	"嬉しい",
	"悲しい",
	"怒り",
	"喜び",
] as const;

/**
 * 時間をフォーマットするヘルパー関数
 */
export function formatTimestamp(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 時間範囲をフォーマットするヘルパー関数
 */
export function formatTimeRange(startTime: number, endTime: number): string {
	return `${formatTimestamp(startTime)} - ${formatTimestamp(endTime)}`;
}

/**
 * YouTube URLを生成するヘルパー関数
 */
export function createYouTubeUrl(videoId: string, startTime?: number): string {
	const baseUrl = `https://www.youtube.com/watch?v=${videoId}`;
	if (startTime !== undefined && startTime > 0) {
		return `${baseUrl}&t=${Math.floor(startTime)}s`;
	}
	return baseUrl;
}

/**
 * YouTube埋め込みURLを生成するヘルパー関数
 */
export function createYouTubeEmbedUrl(
	videoId: string,
	startTime?: number,
	endTime?: number,
): string {
	const embedUrl = `https://www.youtube.com/embed/${videoId}`;
	const params = new URLSearchParams();

	if (startTime !== undefined && startTime > 0) {
		params.set("start", Math.floor(startTime).toString());
	}

	if (endTime !== undefined && endTime > 0) {
		params.set("end", Math.floor(endTime).toString());
	}

	// 自動再生を無効化、関連動画を制限
	params.set("autoplay", "0");
	params.set("rel", "0");
	params.set("modestbranding", "1");

	const queryString = params.toString();
	return queryString ? `${embedUrl}?${queryString}` : embedUrl;
}

/**
 * YouTube動画IDをURLから抽出するヘルパー関数
 * ReDoS攻撃を防ぐため、より安全な正規表現を使用
 */
export function extractYouTubeVideoId(url: string): string | null {
	// 安全性のため、URLの長さを制限
	if (url.length > 1000) {
		return null;
	}

	// より安全で明示的な正規表現パターンを使用
	const patterns = [
		/youtube\.com\/watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]{11})(?:&|$)/,
		/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?|$)/,
		/youtube\.com\/v\/([a-zA-Z0-9_-]{11})(?:\?|$)/,
		/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|$)/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return null;
}

/**
 * YouTubeサムネイルURLを生成するヘルパー関数
 */
export function createYouTubeThumbnailUrl(
	videoId: string,
	quality: "default" | "hq" | "maxres" = "hq",
): string {
	const qualityMap = {
		default: "default",
		hq: "hqdefault",
		maxres: "maxresdefault",
	};
	return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
