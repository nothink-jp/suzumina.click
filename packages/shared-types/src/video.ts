import { z } from "zod";

/**
 * サムネイル情報のZodスキーマ定義
 */
export const ThumbnailInfoSchema = z.object({
	url: z.string().url({
		message: "サムネイルURLは有効なURL形式である必要があります",
	}),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
});

/**
 * サムネイルセットのZodスキーマ定義
 */
export const ThumbnailsSchema = z.object({
	default: ThumbnailInfoSchema.optional(),
	medium: ThumbnailInfoSchema.optional(),
	high: ThumbnailInfoSchema.optional(),
});

/**
 * 動画タイプのZodスキーマ定義
 */
export const VideoTypeSchema = z.enum(["all", "archived", "upcoming"]);

/**
 * ライブ配信状態のZodスキーマ定義
 */
export const LiveBroadcastContentSchema = z.enum(["none", "live", "upcoming"]);

/**
 * 基本的なYouTube動画データのZodスキーマ定義
 */
export const YouTubeVideoBaseSchema = z.object({
	id: z.string().min(1, {
		message: "動画IDは1文字以上である必要があります",
	}),
	// YouTubeのvideoIdも追加
	videoId: z
		.string()
		.min(1, {
			message: "YouTube動画IDは1文字以上である必要があります",
		})
		.optional(),
	title: z.string().min(1, {
		message: "動画タイトルは1文字以上である必要があります",
	}),
	description: z.string(),
	channelId: z.string().min(1),
	channelTitle: z.string(),
	publishedAt: z.string().datetime({
		message: "公開日時はISO形式の日時である必要があります",
	}),
	videoType: VideoTypeSchema.optional(),
});

/**
 * Firestoreに保存するYouTube動画データのZodスキーマ定義
 */
export const FirestoreVideoSchema = YouTubeVideoBaseSchema.extend({
	// YouTube動画IDは必須
	videoId: z.string().min(1),
	// サムネイル情報
	thumbnailUrl: z.string().url(),
	// 日付情報
	lastFetchedAt: z.string().datetime(),
	// 配信状態
	liveBroadcastContent: LiveBroadcastContentSchema.optional(),
	// ライブ配信詳細
	liveStreamingDetails: z
		.object({
			scheduledStartTime: z.string().datetime().optional(),
			scheduledEndTime: z.string().datetime().optional(),
			actualStartTime: z.string().datetime().optional(),
			actualEndTime: z.string().datetime().optional(),
			concurrentViewers: z.number().optional(),
		})
		.optional(),
	// 音声ボタン関連情報
	audioButtonCount: z.number().int().min(0).default(0),
	hasAudioButtons: z.boolean().default(false),
	// 3層タグシステム (VIDEO_TAGS_DESIGN.md準拠)
	playlistTags: z
		.array(z.string().min(1).max(50)) // プレイリスト名は長い場合があるため50文字
		.max(20, {
			message: "プレイリストタグは最大20個まで",
		})
		.optional()
		.default([]),
	userTags: z
		.array(z.string().min(1).max(30))
		.max(10, {
			message: "ユーザータグは最大10個まで設定できます",
		})
		.default([]),
});

/**
 * フロントエンド表示用のYouTube動画データのZodスキーマ定義
 */
export const FrontendVideoSchema = YouTubeVideoBaseSchema.extend({
	// YouTube動画IDは必須
	videoId: z.string().min(1),
	// サムネイル情報
	thumbnailUrl: z.string().url(),
	thumbnails: ThumbnailsSchema, // フロントエンド用のサムネイル情報
	// 日付情報
	lastFetchedAt: z.string().datetime(),
	// ISO形式の日付文字列（フロントエンドでの使用のため）
	publishedAtISO: z.string().datetime(),
	lastFetchedAtISO: z.string().datetime(),
	// 配信状態
	liveBroadcastContent: LiveBroadcastContentSchema.optional(),
	// ライブ配信詳細
	liveStreamingDetails: z
		.object({
			scheduledStartTime: z.string().datetime().optional(),
			scheduledEndTime: z.string().datetime().optional(),
			actualStartTime: z.string().datetime().optional(),
			actualEndTime: z.string().datetime().optional(),
			concurrentViewers: z.number().optional(),
		})
		.optional(),
	// 音声ボタン関連情報
	audioButtonCount: z.number().int().min(0).default(0),
	hasAudioButtons: z.boolean().default(false),

	// 統計情報 (statistics)
	statistics: z
		.object({
			viewCount: z.number().optional(), // 視聴回数
			likeCount: z.number().optional(), // 高評価数
			dislikeCount: z.number().optional(), // 低評価数（現在APIからは非公開）
			favoriteCount: z.number().optional(), // お気に入り数
			commentCount: z.number().optional(), // コメント数
		})
		.optional(),

	// コンテンツ詳細 (contentDetails)
	duration: z.string().optional(), // ISO 8601形式の動画時間（例："PT1H2M3S"）
	dimension: z.string().optional(), // "2d" または "3d"
	definition: z.string().optional(), // "hd" または "sd"
	caption: z.boolean().optional(), // キャプションの有無
	licensedContent: z.boolean().optional(), // ライセンスコンテンツかどうか
	contentRating: z.record(z.string(), z.string()).optional(), // 年齢制限情報
	regionRestriction: z
		.object({
			allowed: z.array(z.string()).optional(), // 視聴可能な国コード
			blocked: z.array(z.string()).optional(), // 視聴できない国コード
		})
		.optional(),

	// ステータス情報 (status)
	status: z
		.object({
			uploadStatus: z.string().optional(), // アップロードステータス
			privacyStatus: z.string().optional(), // プライバシーステータス (public/unlisted/private)
			commentStatus: z.string().optional(), // コメント許可状態
		})
		.optional(),

	// カテゴリ情報
	categoryId: z.string().optional(), // 動画カテゴリID
	tags: z.array(z.string()).optional(), // 動画タグ

	// 3層タグシステム (VIDEO_TAGS_DESIGN.md準拠)
	playlistTags: z
		.array(z.string().min(1).max(50)) // プレイリスト名は長い場合があるため50文字
		.max(20, {
			message: "プレイリストタグは最大20個まで",
		})
		.optional()
		.default([]),
	userTags: z
		.array(z.string().min(1).max(30))
		.max(10, {
			message: "ユーザータグは最大10個まで設定できます",
		})
		.default([]),

	// プレイヤー情報 (player)
	player: z
		.object({
			embedHtml: z.string().optional(), // 埋め込み用HTML
			embedHeight: z.number().optional(), // 埋め込み高さ
			embedWidth: z.number().optional(), // 埋め込み幅
		})
		.optional(),

	// 撮影詳細 (recordingDetails)
	recordingDetails: z
		.object({
			locationDescription: z.string().optional(), // 撮影場所の説明
			recordingDate: z.string().datetime().optional(), // 撮影日時（ISO文字列）
		})
		.optional(),

	// トピック詳細 (topicDetails)
	topicDetails: z
		.object({
			topicCategories: z.array(z.string()).optional(), // トピックカテゴリURL
		})
		.optional(),
});

/**
 * 動画リスト結果のZodスキーマ定義
 */
export const VideoListResultSchema = z.object({
	videos: z.array(FrontendVideoSchema),
	hasMore: z.boolean(),
	lastVideo: FrontendVideoSchema.optional(),
});

/**
 * ページネーションパラメータのZodスキーマ定義
 */
export const PaginationParamsSchema = z.object({
	limit: z.number().int().positive(),
	startAfter: z.string().optional(),
	videoType: VideoTypeSchema.optional(),
});

// Zodスキーマから型を抽出
export type ThumbnailInfo = z.infer<typeof ThumbnailInfoSchema>;
export type Thumbnails = z.infer<typeof ThumbnailsSchema>;
export type VideoType = z.infer<typeof VideoTypeSchema>;
export type LiveBroadcastContent = z.infer<typeof LiveBroadcastContentSchema>;
export type YouTubeVideoBase = z.infer<typeof YouTubeVideoBaseSchema>;
export type FirestoreVideoData = z.infer<typeof FirestoreVideoSchema>;
export type FrontendVideoData = z.infer<typeof FrontendVideoSchema>;
export type VideoListResult = z.infer<typeof VideoListResultSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Firestoreデータをフロントエンド表示用に変換するヘルパー関数
 * @param data Firestoreから取得したデータ
 * @returns フロントエンド表示用に変換されたデータ
 */
export function convertToFrontendVideo(data: FirestoreVideoData): FrontendVideoData {
	const thumbnailUrl = data.thumbnailUrl || "";
	const now = new Date().toISOString();

	// FrontendVideoSchema形式のデータを生成
	const frontendData: FrontendVideoData = {
		...data,
		// videoIdがなければidを使用（下位互換性のために両方を保持）
		videoId: data.videoId || data.id,
		thumbnailUrl,
		thumbnails: {
			// サムネイルURLから各解像度用のデータを生成
			high: { url: thumbnailUrl, width: 480, height: 360 },
			medium: { url: thumbnailUrl, width: 320, height: 180 },
			default: { url: thumbnailUrl, width: 120, height: 90 },
		},
		lastFetchedAtISO: data.lastFetchedAt,
		// publishedAtISO も必ず設定する（publishedAtから生成）
		publishedAtISO: data.publishedAt,
		liveBroadcastContent:
			data.videoType === "upcoming" ? "upcoming" : data.liveBroadcastContent || "none",
		// 音声ボタン関連フィールドを追加（デフォルト値）
		audioButtonCount: data.audioButtonCount || 0,
		hasAudioButtons: data.hasAudioButtons || false,
		// 3層タグシステムフィールドを追加（デフォルト値）
		playlistTags: data.playlistTags || [],
		userTags: data.userTags || [],
	};

	// データの検証
	try {
		return FrontendVideoSchema.parse(frontendData);
	} catch (_error) {
		// エラー時でも最低限のデータを返す
		return {
			id: data.id,
			videoId: data.videoId || data.id, // videoIdを追加
			title: data.title,
			description: data.description || "",
			channelId: data.channelId,
			channelTitle: data.channelTitle,
			publishedAt: data.publishedAt,
			publishedAtISO: data.publishedAt, // publishedAtISOも設定
			thumbnailUrl: thumbnailUrl,
			thumbnails: {
				high: { url: thumbnailUrl },
				medium: { url: thumbnailUrl },
				default: { url: thumbnailUrl },
			},
			lastFetchedAt: now,
			lastFetchedAtISO: now,
			liveBroadcastContent:
				data.videoType === "upcoming" ? "upcoming" : data.liveBroadcastContent || "none",
			// 音声ボタン関連フィールドを追加
			audioButtonCount: data.audioButtonCount || 0,
			hasAudioButtons: data.hasAudioButtons || false,
			// 3層タグシステムフィールドを追加
			playlistTags: data.playlistTags || [],
			userTags: data.userTags || [],
		};
	}
}

/**
 * RSCからRCCへ安全にデータを渡すためのシリアライズ関数
 * @param data フロントエンド表示用データ
 * @returns シリアライズされたデータ文字列
 */
export function serializeForRSC(data: FrontendVideoData): string {
	return JSON.stringify(data);
}

/**
 * RCCでのデシリアライズ関数
 * @param serialized シリアライズされたデータ文字列
 * @returns 検証済みのフロントエンド表示用データ
 */
export function deserializeForRCC(serialized: string): FrontendVideoData {
	try {
		const data = JSON.parse(serialized);
		return FrontendVideoSchema.parse(data);
	} catch (_error) {
		throw new Error("データの形式が無効です");
	}
}

/**
 * リスト結果のシリアライズ関数
 * @param result 動画リスト結果
 * @returns シリアライズされたリスト結果
 */
export function serializeListResult(result: VideoListResult): string {
	return JSON.stringify(result);
}

/**
 * リスト結果のデシリアライズ関数
 * @param serialized シリアライズされたリスト結果
 * @returns 検証済みの動画リスト結果
 */
export function deserializeListResult(serialized: string): VideoListResult {
	try {
		const data = JSON.parse(serialized);
		return VideoListResultSchema.parse(data);
	} catch (_error) {
		return { videos: [], hasMore: false };
	}
}

/**
 * Firestoreサーバーサイド（Cloud Functions）向けのデータ型定義
 * Timestampを使用するサーバーサイド向け
 */
export interface FirestoreServerVideoData {
	// ID系フィールド - どちらのプロパティ名でも対応できるようにする
	id?: string; // フロントエンド側で使用
	videoId: string; // サーバー側で使用
	// 基本フィールド
	title: string;
	description: string;
	channelId: string;
	channelTitle: string;
	// Firestoreのサーバーサイドモデルではタイムスタンプを使用
	publishedAt: unknown; // Firestore.Timestamp型 (Firestore依存を避けるためunknown)
	thumbnailUrl: string;
	lastFetchedAt: unknown; // Firestore.Timestamp型
	videoType?: VideoType;
	liveBroadcastContent?: LiveBroadcastContent;

	// 音声ボタン関連情報
	audioButtonCount?: number;
	hasAudioButtons?: boolean;

	// コンテンツ詳細 (contentDetails)
	duration?: string; // ISO 8601形式の動画時間（例："PT1H2M3S"）
	dimension?: string; // "2d" または "3d"
	definition?: string; // "hd" または "sd"
	caption?: boolean; // キャプションの有無
	licensedContent?: boolean; // ライセンスコンテンツかどうか
	contentRating?: Record<string, string>; // 年齢制限情報
	regionRestriction?: {
		allowed?: string[]; // 視聴可能な国コード
		blocked?: string[]; // 視聴できない国コード
	};

	// 統計情報 (statistics)
	statistics?: {
		viewCount?: number; // 視聴回数
		likeCount?: number; // 高評価数
		dislikeCount?: number; // 低評価数（現在APIからは非公開）
		favoriteCount?: number; // お気に入り数
		commentCount?: number; // コメント数
	};

	// ライブ配信詳細 (liveStreamingDetails)
	liveStreamingDetails?: {
		scheduledStartTime?: unknown; // Firestore.Timestamp型
		scheduledEndTime?: unknown; // Firestore.Timestamp型
		actualStartTime?: unknown; // Firestore.Timestamp型
		actualEndTime?: unknown; // Firestore.Timestamp型
		concurrentViewers?: number; // 同時視聴者数
	};

	// プレイヤー情報 (player)
	player?: {
		embedHtml?: string; // 埋め込み用HTML
		embedHeight?: number; // 埋め込み高さ
		embedWidth?: number; // 埋め込み幅
	};

	// 撮影詳細 (recordingDetails)
	recordingDetails?: {
		locationDescription?: string; // 撮影場所の説明
		recordingDate?: unknown; // Firestore.Timestamp型
	};

	// トピック詳細 (topicDetails)
	topicDetails?: {
		topicCategories?: string[]; // トピックカテゴリURL
	};

	// ステータス情報 (status)
	status?: {
		uploadStatus?: string; // アップロードステータス
		privacyStatus?: string; // プライバシーステータス (public/unlisted/private)
		commentStatus?: string; // コメント許可状態
	};

	// カテゴリ情報
	categoryId?: string; // 動画カテゴリID
	tags?: string[]; // 動画タグ

	// 3層タグシステム (VIDEO_TAGS_DESIGN.md準拠)
	playlistTags?: string[]; // YouTubeプレイリスト名から自動生成
	userTags?: string[]; // 登録ユーザーが編集可能なタグ配列
}

/**
 * 動画が音声ボタン作成可能かどうかを判定する関数
 * ビジネスルール: 音声ボタンを作れるのは配信アーカイブのみ
 * @param video 動画データ
 * @returns 音声ボタン作成可能かどうか
 */
export function canCreateAudioButton(video: FrontendVideoData): boolean {
	// 著作権とライブ配信ポリシーに基づき、音声ボタンを作成できるのは配信アーカイブのみ
	// 作成可能な条件:
	// 1. 明示的に videoType が "archived" の場合
	// 2. ライブ配信アーカイブ（liveStreamingDetails.actualEndTime が存在）
	//
	// 作成不可な条件:
	// - 配信中・配信予定（liveBroadcastContent が "live" または "upcoming"）
	// - 通常動画（liveStreamingDetails が存在しない）
	// - プレミア公開動画（liveStreamingDetails は存在するが actualEndTime がない）

	// 明示的にアーカイブと設定されている場合
	if (video.videoType === "archived") {
		return true;
	}

	// 配信中・配信予定は作成不可
	if (video.liveBroadcastContent !== "none") {
		return false;
	}

	// ライブアーカイブの判定: actualEndTime が存在する場合
	if (video.liveStreamingDetails?.actualEndTime) {
		// 暫定ロジック: 15分以下の動画はプレミア公開として扱う
		const durationSeconds = parseDurationToSeconds(video.duration);
		const fifteenMinutes = 15 * 60; // 900秒

		if (durationSeconds > 0 && durationSeconds <= fifteenMinutes) {
			// 15分以下はプレミア公開と判定 → 作成不可
			return false;
		}

		// 15分超過はライブアーカイブと判定 → 作成可能
		return true;
	}

	// その他のケース（通常動画、プレミア公開動画など）は作成不可
	return false;
}

/**
 * ISO 8601 duration (PT3M3S) を秒数に変換
 * @param duration ISO 8601 duration文字列
 * @returns 秒数（解析失敗時は0）
 */
export function parseDurationToSeconds(duration?: string): number {
	if (!duration) return 0;

	// PT3M3S, PT1H2M3S などの形式をパース
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;

	const hours = Number.parseInt(match[1] || "0", 10);
	const minutes = Number.parseInt(match[2] || "0", 10);
	const seconds = Number.parseInt(match[3] || "0", 10);

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 音声ボタン作成不可の理由を取得する
 * @param video 動画データ
 * @returns エラーメッセージ（作成可能な場合は null）
 */
export function getAudioButtonCreationErrorMessage(video: FrontendVideoData): string | null {
	// 作成可能な場合は null を返す
	if (canCreateAudioButton(video)) {
		return null;
	}

	// 配信中・配信予定の場合
	if (video.liveBroadcastContent === "live") {
		return "配信中は音声ボタンを作成できません";
	}
	if (video.liveBroadcastContent === "upcoming") {
		return "配信開始前は音声ボタンを作成できません";
	}

	// liveStreamingDetails が存在する場合の詳細判定
	if (video.liveStreamingDetails) {
		// actualEndTime がない場合はプレミア公開
		if (!video.liveStreamingDetails.actualEndTime) {
			return "プレミア公開動画は著作権の関係上、音声ボタンの作成はできません";
		}

		// actualEndTime がある場合は15分以下かチェック
		const durationSeconds = parseDurationToSeconds(video.duration);
		const fifteenMinutes = 15 * 60; // 900秒

		if (durationSeconds > 0 && durationSeconds <= fifteenMinutes) {
			return "プレミア公開動画は著作権の関係上、音声ボタンの作成はできません";
		}
	}

	// 通常動画（liveStreamingDetails が存在しない）
	return "通常動画は著作権の関係上、音声ボタンの作成はできません";
}
