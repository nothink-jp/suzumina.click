import { describe, expect, it } from "vitest";
import {
	AudioReferenceBaseSchema,
	AudioReferenceCategorySchema,
	type AudioReferenceListResult,
	AudioReferenceListResultSchema,
	AudioReferenceQuerySchema,
	type CreateAudioReferenceInput,
	CreateAudioReferenceInputSchema,
	createYouTubeEmbedUrl,
	createYouTubeThumbnailUrl,
	createYouTubeUrl,
	extractYouTubeVideoId,
	type FirestoreAudioReferenceData,
	FirestoreAudioReferenceSchema,
	type FrontendAudioReferenceData,
	FrontendAudioReferenceSchema,
	formatTimeRange,
	formatTimestamp,
	getAudioReferenceCategoryLabel,
	SUGGESTED_AUDIO_REFERENCE_TAGS,
	UpdateAudioReferenceInputSchema,
	UpdateAudioReferenceStatsSchema,
	YouTubeVideoInfoSchema,
} from "./audio-reference";

// テスト用のデータ定義
const validFirestoreAudioReference: FirestoreAudioReferenceData = {
	id: "audio-ref-123",
	title: "テスト音声ボタン",
	description: "これはテスト用の音声ボタンです",
	category: "voice",
	tags: ["挨拶", "かわいい"],
	videoId: "dQw4w9WgXcQ",
	videoTitle: "Test YouTube Video",
	videoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	channelId: "UC123456789",
	channelTitle: "Test Channel",
	startTime: 45,
	endTime: 68,
	duration: 23,
	createdBy: "123456789012345678",
	createdByName: "TestUser",
	isPublic: true,
	playCount: 150,
	likeCount: 25,
	viewCount: 200,
	createdAt: "2023-01-01T10:00:00Z",
	updatedAt: "2023-01-02T12:00:00Z",
	isReported: false,
	reportCount: 0,
	moderationStatus: "approved",
};

const validFrontendAudioReference: FrontendAudioReferenceData = {
	id: "audio-ref-123",
	title: "テスト音声ボタン",
	description: "これはテスト用の音声ボタンです",
	category: "voice",
	tags: ["挨拶", "かわいい"],
	videoId: "dQw4w9WgXcQ",
	videoTitle: "Test YouTube Video",
	videoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
	channelId: "UC123456789",
	channelTitle: "Test Channel",
	startTime: 45,
	endTime: 68,
	duration: 23,
	createdBy: "123456789012345678",
	createdByName: "TestUser",
	playCount: 150,
	likeCount: 25,
	viewCount: 200,
	createdAt: "2023-01-01T10:00:00Z",
	updatedAt: "2023-01-02T12:00:00Z",
	createdAtISO: "2023-01-01T10:00:00Z",
	updatedAtISO: "2023-01-02T12:00:00Z",
	durationText: "0:23",
	timestampText: "0:45 - 1:08",
	youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s",
	youtubeEmbedUrl:
		"https://www.youtube.com/embed/dQw4w9WgXcQ?start=45&end=68&autoplay=0&rel=0&modestbranding=1",
};

const validCreateInput: CreateAudioReferenceInput = {
	title: "新しい音声ボタン",
	description: "テスト用の音声ボタン作成",
	category: "voice",
	tags: ["テスト", "新規"],
	videoId: "dQw4w9WgXcQ",
	startTime: 30,
	endTime: 45,
	isPublic: true,
};

describe("AudioReferenceCategorySchema", () => {
	it("有効なカテゴリを検証できる", () => {
		const validCategories = ["voice", "bgm", "se", "talk", "singing", "other"];

		validCategories.forEach((category) => {
			expect(AudioReferenceCategorySchema.safeParse(category).success).toBe(true);
		});
	});

	it("無効なカテゴリでエラーが発生する", () => {
		expect(AudioReferenceCategorySchema.safeParse("invalid").success).toBe(false);
		expect(AudioReferenceCategorySchema.safeParse(123).success).toBe(false);
		expect(AudioReferenceCategorySchema.safeParse(null).success).toBe(false);
	});
});

describe("AudioReferenceBaseSchema", () => {
	it("有効な基本情報を検証できる", () => {
		const validBase = {
			id: "test-id",
			title: "テストタイトル",
			description: "テスト説明",
			category: "voice" as const,
			tags: ["tag1", "tag2"],
		};

		const result = AudioReferenceBaseSchema.safeParse(validBase);
		expect(result.success).toBe(true);
	});

	it("タイトルが長すぎる場合エラーが発生する", () => {
		const invalidData = {
			id: "test-id",
			title: "a".repeat(101), // 100文字超過
			category: "voice" as const,
		};

		const result = AudioReferenceBaseSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("説明が長すぎる場合エラーが発生する", () => {
		const invalidData = {
			id: "test-id",
			title: "テスト",
			description: "a".repeat(501), // 500文字超過
			category: "voice" as const,
		};

		const result = AudioReferenceBaseSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("タグが多すぎる場合エラーが発生する", () => {
		const invalidData = {
			id: "test-id",
			title: "テスト",
			category: "voice" as const,
			tags: Array(11).fill("tag"), // 10個超過
		};

		const result = AudioReferenceBaseSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("オプショナルフィールドが省略可能である", () => {
		const minimalData = {
			id: "test-id",
			title: "テスト",
			category: "voice" as const,
		};

		const result = AudioReferenceBaseSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
	});
});

describe("FirestoreAudioReferenceSchema", () => {
	it("有効なFirestore音声リファレンスデータを検証できる", () => {
		const result = FirestoreAudioReferenceSchema.safeParse(validFirestoreAudioReference);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("audio-ref-123");
			expect(result.data.startTime).toBe(45);
			expect(result.data.endTime).toBe(68);
			expect(result.data.duration).toBe(23);
			expect(result.data.createdBy).toBe("123456789012345678");
		}
	});

	it("必須フィールドが不足している場合エラーが発生する", () => {
		const invalidData = { ...validFirestoreAudioReference };
		(invalidData as any).videoId = undefined;

		const result = FirestoreAudioReferenceSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("負の時間値でエラーが発生する", () => {
		const invalidData = {
			...validFirestoreAudioReference,
			startTime: -5,
		};

		const result = FirestoreAudioReferenceSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("デフォルト値が正しく設定される", () => {
		const minimalData = {
			id: "test-id",
			title: "テスト",
			category: "voice" as const,
			videoId: "test-video",
			videoTitle: "Test Video",
			startTime: 0,
			endTime: 10,
			duration: 10,
			createdBy: "123456789012345678",
			createdByName: "TestUser",
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
		};

		const result = FirestoreAudioReferenceSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.createdBy).toBe("123456789012345678");
			expect(result.data.isPublic).toBe(true);
			expect(result.data.playCount).toBe(0);
			expect(result.data.likeCount).toBe(0);
			expect(result.data.viewCount).toBe(0);
			expect(result.data.isReported).toBe(false);
			expect(result.data.reportCount).toBe(0);
			expect(result.data.moderationStatus).toBe("approved");
		}
	});
});

describe("FrontendAudioReferenceSchema", () => {
	it("有効なフロントエンド音声リファレンスデータを検証できる", () => {
		const result = FrontendAudioReferenceSchema.safeParse(validFrontendAudioReference);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.durationText).toBe("0:23");
			expect(result.data.timestampText).toBe("0:45 - 1:08");
			expect(result.data.youtubeUrl).toContain("youtube.com/watch");
			expect(result.data.youtubeEmbedUrl).toContain("youtube.com/embed");
		}
	});

	it("フロントエンド固有フィールドが必須である", () => {
		const dataWithoutFrontendFields = { ...validFirestoreAudioReference };

		const result = FrontendAudioReferenceSchema.safeParse(dataWithoutFrontendFields);
		expect(result.success).toBe(false);
	});
});

describe("CreateAudioReferenceInputSchema", () => {
	it("有効な作成入力データを検証できる", () => {
		const result = CreateAudioReferenceInputSchema.safeParse(validCreateInput);
		expect(result.success).toBe(true);
	});

	it("終了時間が開始時間より前の場合エラーが発生する", () => {
		const invalidData = {
			...validCreateInput,
			startTime: 50,
			endTime: 30, // 開始時間より前
		};

		const result = CreateAudioReferenceInputSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toContain("終了時間は開始時間より後");
		}
	});

	it("再生時間が60秒を超える場合エラーが発生する", () => {
		const invalidData = {
			...validCreateInput,
			startTime: 0,
			endTime: 65, // 65秒（60秒超過）
		};

		const result = CreateAudioReferenceInputSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toContain("60秒以下");
		}
	});

	it("再生時間が1秒未満の場合エラーが発生する", () => {
		const invalidData = {
			...validCreateInput,
			startTime: 10,
			endTime: 10.5, // 0.5秒（1秒未満）
		};

		const result = CreateAudioReferenceInputSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toContain("1秒以上");
		}
	});

	it("デフォルト値が正しく設定される", () => {
		const minimalData = {
			title: "テスト",
			category: "voice" as const,
			videoId: "test-video",
			startTime: 0,
			endTime: 10,
		};

		const result = CreateAudioReferenceInputSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isPublic).toBe(true);
		}
	});
});

describe("UpdateAudioReferenceInputSchema", () => {
	it("有効な更新入力データを検証できる", () => {
		const validUpdate = {
			id: "audio-ref-123",
			title: "更新されたタイトル",
			description: "更新された説明",
			category: "talk" as const,
			tags: ["更新", "テスト"],
			isPublic: false,
		};

		const result = UpdateAudioReferenceInputSchema.safeParse(validUpdate);
		expect(result.success).toBe(true);
	});

	it("IDが必須である", () => {
		const invalidData = {
			title: "更新されたタイトル",
		};

		const result = UpdateAudioReferenceInputSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("すべてのフィールドがオプショナルである（ID以外）", () => {
		const minimalData = {
			id: "audio-ref-123",
		};

		const result = UpdateAudioReferenceInputSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
	});
});

describe("UpdateAudioReferenceStatsSchema", () => {
	it("有効な統計更新データを検証できる", () => {
		const validStats = {
			id: "audio-ref-123",
			incrementPlayCount: true,
			incrementLikeCount: true,
			incrementViewCount: false,
			decrementLikeCount: false,
		};

		const result = UpdateAudioReferenceStatsSchema.safeParse(validStats);
		expect(result.success).toBe(true);
	});

	it("デフォルト値が正しく設定される", () => {
		const minimalData = {
			id: "audio-ref-123",
		};

		const result = UpdateAudioReferenceStatsSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.incrementPlayCount).toBe(false);
			expect(result.data.incrementLikeCount).toBe(false);
			expect(result.data.incrementViewCount).toBe(false);
			expect(result.data.decrementLikeCount).toBe(false);
		}
	});
});

describe("AudioReferenceQuerySchema", () => {
	it("有効なクエリパラメータを検証できる", () => {
		const validQuery = {
			limit: 30,
			startAfter: "audio-ref-100",
			category: "voice" as const,
			tags: ["挨拶", "癒し"],
			videoId: "dQw4w9WgXcQ",
			searchText: "テスト",
			sortBy: "popular" as const,
			onlyPublic: true,
		};

		const result = AudioReferenceQuerySchema.safeParse(validQuery);
		expect(result.success).toBe(true);
	});

	it("limitが50を超える場合エラーが発生する", () => {
		const invalidQuery = {
			limit: 100, // 50超過
		};

		const result = AudioReferenceQuerySchema.safeParse(invalidQuery);
		expect(result.success).toBe(false);
	});

	it("デフォルト値が正しく設定される", () => {
		const minimalQuery = {};

		const result = AudioReferenceQuerySchema.safeParse(minimalQuery);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(20);
			expect(result.data.sortBy).toBe("newest");
			expect(result.data.onlyPublic).toBe(true);
		}
	});
});

describe("AudioReferenceListResultSchema", () => {
	it("有効なリスト結果を検証できる", () => {
		const validResult: AudioReferenceListResult = {
			audioReferences: [validFrontendAudioReference],
			hasMore: true,
			lastAudioReference: validFrontendAudioReference,
			totalCount: 100,
		};

		const result = AudioReferenceListResultSchema.safeParse(validResult);
		expect(result.success).toBe(true);
	});

	it("空のリストも有効である", () => {
		const emptyResult = {
			audioReferences: [],
			hasMore: false,
		};

		const result = AudioReferenceListResultSchema.safeParse(emptyResult);
		expect(result.success).toBe(true);
	});
});

describe("YouTubeVideoInfoSchema", () => {
	it("有効なYouTube動画情報を検証できる", () => {
		const validInfo = {
			videoId: "dQw4w9WgXcQ",
			title: "Test Video",
			channelId: "UC123456789",
			channelTitle: "Test Channel",
			thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			duration: 212,
			publishedAt: "2023-01-01T00:00:00Z",
		};

		const result = YouTubeVideoInfoSchema.safeParse(validInfo);
		expect(result.success).toBe(true);
	});

	it("最小限の情報でも有効である", () => {
		const minimalInfo = {
			videoId: "dQw4w9WgXcQ",
			title: "Test Video",
		};

		const result = YouTubeVideoInfoSchema.safeParse(minimalInfo);
		expect(result.success).toBe(true);
	});
});

describe("getAudioReferenceCategoryLabel", () => {
	it("すべてのカテゴリの日本語ラベルを取得できる", () => {
		expect(getAudioReferenceCategoryLabel("voice")).toBe("ボイス");
		expect(getAudioReferenceCategoryLabel("bgm")).toBe("BGM・音楽");
		expect(getAudioReferenceCategoryLabel("se")).toBe("効果音");
		expect(getAudioReferenceCategoryLabel("talk")).toBe("トーク・会話");
		expect(getAudioReferenceCategoryLabel("singing")).toBe("歌唱");
		expect(getAudioReferenceCategoryLabel("other")).toBe("その他");
	});
});

describe("SUGGESTED_AUDIO_REFERENCE_TAGS", () => {
	it("推奨タグリストが定義されている", () => {
		expect(SUGGESTED_AUDIO_REFERENCE_TAGS).toBeDefined();
		expect(SUGGESTED_AUDIO_REFERENCE_TAGS.length).toBeGreaterThan(0);
		expect(SUGGESTED_AUDIO_REFERENCE_TAGS).toContain("挨拶");
		expect(SUGGESTED_AUDIO_REFERENCE_TAGS).toContain("癒し");
		expect(SUGGESTED_AUDIO_REFERENCE_TAGS).toContain("おやすみ");
	});
});

describe("formatTimestamp", () => {
	it("秒数を正しい時間形式にフォーマットできる", () => {
		expect(formatTimestamp(0)).toBe("0:00");
		expect(formatTimestamp(30)).toBe("0:30");
		expect(formatTimestamp(60)).toBe("1:00");
		expect(formatTimestamp(90)).toBe("1:30");
		expect(formatTimestamp(3661)).toBe("61:01");
	});

	it("小数点以下を切り捨てる", () => {
		expect(formatTimestamp(30.7)).toBe("0:30");
		expect(formatTimestamp(90.9)).toBe("1:30");
	});
});

describe("formatTimeRange", () => {
	it("時間範囲を正しい形式にフォーマットできる", () => {
		expect(formatTimeRange(30, 90)).toBe("0:30 - 1:30");
		expect(formatTimeRange(0, 60)).toBe("0:00 - 1:00");
		expect(formatTimeRange(45, 68)).toBe("0:45 - 1:08");
	});
});

describe("createYouTubeUrl", () => {
	it("基本的なYouTube URLを生成できる", () => {
		const url = createYouTubeUrl("dQw4w9WgXcQ");
		expect(url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
	});

	it("開始時間付きのYouTube URLを生成できる", () => {
		const url = createYouTubeUrl("dQw4w9WgXcQ", 45);
		expect(url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s");
	});

	it("開始時間が0の場合は時間パラメータを追加しない", () => {
		const url = createYouTubeUrl("dQw4w9WgXcQ", 0);
		expect(url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
	});

	it("小数点以下を切り捨てる", () => {
		const url = createYouTubeUrl("dQw4w9WgXcQ", 45.7);
		expect(url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s");
	});
});

describe("createYouTubeEmbedUrl", () => {
	it("基本的な埋め込みURLを生成できる", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ");
		expect(url).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1");
	});

	it("開始時間付きの埋め込みURLを生成できる", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ", 45);
		expect(url).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ?start=45&autoplay=0&rel=0&modestbranding=1",
		);
	});

	it("開始・終了時間付きの埋め込みURLを生成できる", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ", 45, 68);
		expect(url).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ?start=45&end=68&autoplay=0&rel=0&modestbranding=1",
		);
	});

	it("終了時間のみ指定した場合も正しく動作する", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ", undefined, 68);
		expect(url).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ?end=68&autoplay=0&rel=0&modestbranding=1",
		);
	});

	it("0の時間は無視される", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ", 0, 0);
		expect(url).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&rel=0&modestbranding=1");
	});

	it("小数点以下を切り捨てる", () => {
		const url = createYouTubeEmbedUrl("dQw4w9WgXcQ", 45.7, 68.9);
		expect(url).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ?start=45&end=68&autoplay=0&rel=0&modestbranding=1",
		);
	});
});

describe("extractYouTubeVideoId", () => {
	it("通常のYouTube URLから動画IDを抽出できる", () => {
		const id = extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		expect(id).toBe("dQw4w9WgXcQ");
	});

	it("短縮URLから動画IDを抽出できる", () => {
		const id = extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ");
		expect(id).toBe("dQw4w9WgXcQ");
	});

	it("埋め込みURLから動画IDを抽出できる", () => {
		const id = extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ");
		expect(id).toBe("dQw4w9WgXcQ");
	});

	it("時間パラメータ付きURLから動画IDを抽出できる", () => {
		const id = extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s");
		expect(id).toBe("dQw4w9WgXcQ");
	});

	it("その他のパラメータ付きURLから動画IDを抽出できる", () => {
		const id = extractYouTubeVideoId(
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest&index=1",
		);
		expect(id).toBe("dQw4w9WgXcQ");
	});

	it("無効なURLの場合nullを返す", () => {
		expect(extractYouTubeVideoId("https://example.com")).toBeNull();
		expect(extractYouTubeVideoId("invalid-url")).toBeNull();
		expect(extractYouTubeVideoId("")).toBeNull();
	});

	it("11文字以外の動画IDは無効", () => {
		const invalidId = extractYouTubeVideoId("https://www.youtube.com/watch?v=short");
		expect(invalidId).toBeNull();
	});
});

describe("createYouTubeThumbnailUrl", () => {
	it("デフォルト品質のサムネイルURLを生成できる", () => {
		const url = createYouTubeThumbnailUrl("dQw4w9WgXcQ");
		expect(url).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
	});

	it("異なる品質のサムネイルURLを生成できる", () => {
		expect(createYouTubeThumbnailUrl("dQw4w9WgXcQ", "default")).toBe(
			"https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
		);

		expect(createYouTubeThumbnailUrl("dQw4w9WgXcQ", "hq")).toBe(
			"https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		);

		expect(createYouTubeThumbnailUrl("dQw4w9WgXcQ", "maxres")).toBe(
			"https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
		);
	});
});
