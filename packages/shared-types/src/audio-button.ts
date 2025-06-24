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
	// 音声ファイル情報
	audioUrl: z.string().url({
		message: "音声URLは有効なURL形式である必要があります",
	}),
	duration: z.number().positive({
		message: "音声の長さは正の数である必要があります",
	}), // 秒数
	fileSize: z.number().positive({
		message: "ファイルサイズは正の数である必要があります",
	}), // バイト数
	format: AudioFormatSchema,

	// 元動画情報（オプション）
	sourceVideoId: z.string().optional(),
	sourceVideoTitle: z.string().optional(),
	startTime: z.number().min(0).optional(), // 元動画での開始時刻（秒）
	endTime: z.number().min(0).optional(), // 元動画での終了時刻（秒）

	// ユーザー・権限情報
	uploadedBy: z.string().optional(), // 将来のユーザー認証用
	isPublic: z.boolean().default(true),

	// 統計情報
	playCount: z.number().int().min(0).default(0),
	likeCount: z.number().int().min(0).default(0),

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
	// 音声ファイル情報
	audioUrl: z.string().url(),
	duration: z.number().positive(),
	fileSize: z.number().positive(),
	format: AudioFormatSchema,

	// 元動画情報
	sourceVideoId: z.string().optional(),
	sourceVideoTitle: z.string().optional(),
	sourceVideoThumbnailUrl: z.string().url().optional(),
	startTime: z.number().min(0).optional(),
	endTime: z.number().min(0).optional(),

	// ユーザー・権限情報
	uploadedBy: z.string().optional(),
	isPublic: z.boolean(),

	// 統計情報
	playCount: z.number().int().min(0),
	likeCount: z.number().int().min(0),

	// 管理情報（ISO文字列形式）
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	createdAtISO: z.string().datetime(),
	updatedAtISO: z.string().datetime(),

	// 表示用の追加情報
	durationText: z.string(), // "1:23" のような表示用テキスト
	fileSizeText: z.string(), // "2.5MB" のような表示用テキスト
});

/**
 * 音声ボタン作成時の入力データスキーマ
 */
export const CreateAudioButtonInputSchema = z.object({
	title: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	category: AudioButtonCategorySchema,
	tags: z.array(z.string().min(1).max(20)).max(10).optional(),

	// 元動画情報（オプション）
	sourceVideoId: z.string().optional(),
	startTime: z.number().min(0).optional(),
	endTime: z.number().min(0).optional(),

	// 公開設定
	isPublic: z.boolean().default(true),
});

/**
 * 音声ボタン更新時の入力データスキーマ
 */
export const UpdateAudioButtonInputSchema = CreateAudioButtonInputSchema.partial().extend({
	id: z.string().min(1),
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
	// 時間をフォーマット（例: 83 -> "1:23"）
	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// ファイルサイズをフォーマット（例: 2621440 -> "2.5MB"）
	const formatFileSize = (bytes: number): string => {
		const mb = bytes / (1024 * 1024);
		if (mb >= 1) {
			return `${mb.toFixed(1)}MB`;
		}
		const kb = bytes / 1024;
		return `${kb.toFixed(1)}KB`;
	};

	const frontendData: FrontendAudioButtonData = {
		...data,
		createdAtISO: data.createdAt,
		updatedAtISO: data.updatedAt,
		durationText: formatDuration(data.duration),
		fileSizeText: formatFileSize(data.fileSize),

		// 元動画のサムネイル情報を生成（YouTubeの場合）
		sourceVideoThumbnailUrl: data.sourceVideoId
			? `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`
			: undefined,
	};

	// データの検証
	try {
		return FrontendAudioButtonSchema.parse(frontendData);
	} catch (_error) {
		// エラー時でも最低限のデータを返す
		const _now = new Date().toISOString();
		return {
			id: data.id,
			title: data.title,
			description: data.description || "",
			category: data.category,
			tags: data.tags || [],
			audioUrl: data.audioUrl,
			duration: data.duration,
			fileSize: data.fileSize,
			format: data.format,
			sourceVideoId: data.sourceVideoId,
			sourceVideoTitle: data.sourceVideoTitle,
			sourceVideoThumbnailUrl: data.sourceVideoId
				? `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`
				: undefined,
			startTime: data.startTime,
			endTime: data.endTime,
			uploadedBy: data.uploadedBy,
			isPublic: data.isPublic,
			playCount: data.playCount,
			likeCount: data.likeCount,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
			createdAtISO: data.createdAt,
			updatedAtISO: data.updatedAt,
			durationText: formatDuration(data.duration),
			fileSizeText: formatFileSize(data.fileSize),
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
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerAudioButtonData {
	id: string;
	title: string;
	description?: string;
	category: AudioButtonCategory;
	tags?: string[];

	// 音声ファイル情報
	audioUrl: string;
	duration: number;
	fileSize: number;
	format: AudioFormat;

	// 元動画情報
	sourceVideoId?: string;
	sourceVideoTitle?: string;
	startTime?: number;
	endTime?: number;

	// ユーザー・権限情報
	uploadedBy?: string;
	isPublic: boolean;

	// 統計情報
	playCount: number;
	likeCount: number;

	// 管理情報（Firestore Timestamp型）
	createdAt: unknown; // Firestore.Timestamp型
	updatedAt: unknown; // Firestore.Timestamp型
}
