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
	// 音声ボタン関連情報
	audioButtonCount: z.number().int().min(0).default(0),
	hasAudioButtons: z.boolean().default(false),
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
	// 音声ボタン関連情報
	audioButtonCount: z.number().int().min(0).default(0),
	hasAudioButtons: z.boolean().default(false),
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
		liveBroadcastContent: data.videoType === "upcoming" ? "upcoming" : "none",
		// 音声ボタン関連フィールドを追加（デフォルト値）
		audioButtonCount: data.audioButtonCount || 0,
		hasAudioButtons: data.hasAudioButtons || false,
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
			liveBroadcastContent: "none",
			// 音声ボタン関連フィールドを追加
			audioButtonCount: data.audioButtonCount || 0,
			hasAudioButtons: data.hasAudioButtons || false,
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
}

/**
 * 動画が音声ボタン作成可能かどうかを判定する関数
 * ビジネスルール: 音声ボタンを作れるのは配信アーカイブのみ
 * @param video 動画データ
 * @returns 音声ボタン作成可能かどうか
 */
export function canCreateAudioButton(video: FrontendVideoData): boolean {
	// 許諾により音声ボタンを作成できるのは配信アーカイブのみ
	// liveBroadcastContent が "none" でかつ videoType が "archived" の場合のみ許可
	return video.liveBroadcastContent === "none" && video.videoType === "archived";
}
