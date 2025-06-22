import { describe, expect, it } from "vitest";
import {
  convertToFrontendVideo,
  deserializeForRCC,
  deserializeListResult,
  type FirestoreVideoData,
  FirestoreVideoSchema,
  type FrontendVideoData,
  FrontendVideoSchema,
  LiveBroadcastContentSchema,
  PaginationParamsSchema,
  serializeForRSC,
  serializeListResult,
  type ThumbnailInfo,
  ThumbnailInfoSchema,
  type Thumbnails,
  ThumbnailsSchema,
  type VideoListResult,
  VideoListResultSchema,
  VideoTypeSchema,
} from "./video";

// テスト用のデータ定義
const validThumbnailInfo: ThumbnailInfo = {
  url: "https://example.com/thumbnail.jpg",
  width: 320,
  height: 180,
};

const validThumbnails: Thumbnails = {
  default: { url: "https://example.com/default.jpg", width: 120, height: 90 },
  medium: { url: "https://example.com/medium.jpg", width: 320, height: 180 },
  high: { url: "https://example.com/high.jpg", width: 480, height: 360 },
};

const validFirestoreVideo: FirestoreVideoData = {
  id: "test-video-1",
  videoId: "dQw4w9WgXcQ",
  title: "Test Video Title",
  description: "Test video description",
  channelId: "UC123456789",
  channelTitle: "Test Channel",
  publishedAt: "2023-01-01T12:00:00Z",
  thumbnailUrl: "https://example.com/thumbnail.jpg",
  lastFetchedAt: "2023-01-02T12:00:00Z",
  liveBroadcastContent: "none",
  audioButtonCount: 5,
  hasAudioButtons: true,
};

const validFrontendVideo: FrontendVideoData = {
  ...validFirestoreVideo,
  thumbnails: validThumbnails,
  publishedAtISO: "2023-01-01T12:00:00Z",
  lastFetchedAtISO: "2023-01-02T12:00:00Z",
};

describe("ThumbnailInfoSchema", () => {
  it("有効なサムネイル情報を検証できる", () => {
    const result = ThumbnailInfoSchema.safeParse(validThumbnailInfo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/thumbnail.jpg");
      expect(result.data.width).toBe(320);
      expect(result.data.height).toBe(180);
    }
  });

  it("無効なURLでエラーが発生する", () => {
    const invalidData = {
      url: "invalid-url",
      width: 320,
      height: 180,
    };

    const result = ThumbnailInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("有効なURL形式");
    }
  });

  it("width/heightがオプショナルである", () => {
    const minimalData = {
      url: "https://example.com/thumbnail.jpg",
    };

    const result = ThumbnailInfoSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
  });

  it("負の数値でエラーが発生する", () => {
    const invalidData = {
      url: "https://example.com/thumbnail.jpg",
      width: -100,
      height: 180,
    };

    const result = ThumbnailInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("ThumbnailsSchema", () => {
  it("完全なサムネイルセットを検証できる", () => {
    const result = ThumbnailsSchema.safeParse(validThumbnails);
    expect(result.success).toBe(true);
  });

  it("空のオブジェクトも有効である", () => {
    const result = ThumbnailsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("部分的なサムネイルセットも有効である", () => {
    const partialThumbnails = {
      medium: validThumbnailInfo,
    };

    const result = ThumbnailsSchema.safeParse(partialThumbnails);
    expect(result.success).toBe(true);
  });
});

describe("VideoTypeSchema", () => {
  it("有効な動画タイプを検証できる", () => {
    expect(VideoTypeSchema.safeParse("all").success).toBe(true);
    expect(VideoTypeSchema.safeParse("archived").success).toBe(true);
    expect(VideoTypeSchema.safeParse("upcoming").success).toBe(true);
  });

  it("無効な動画タイプでエラーが発生する", () => {
    expect(VideoTypeSchema.safeParse("invalid").success).toBe(false);
    expect(VideoTypeSchema.safeParse(123).success).toBe(false);
  });
});

describe("LiveBroadcastContentSchema", () => {
  it("有効なライブ配信状態を検証できる", () => {
    expect(LiveBroadcastContentSchema.safeParse("none").success).toBe(true);
    expect(LiveBroadcastContentSchema.safeParse("live").success).toBe(true);
    expect(LiveBroadcastContentSchema.safeParse("upcoming").success).toBe(true);
  });

  it("無効なライブ配信状態でエラーが発生する", () => {
    expect(LiveBroadcastContentSchema.safeParse("finished").success).toBe(
      false,
    );
    expect(LiveBroadcastContentSchema.safeParse(null).success).toBe(false);
  });
});

describe("FirestoreVideoSchema", () => {
  it("有効なFirestore動画データを検証できる", () => {
    const result = FirestoreVideoSchema.safeParse(validFirestoreVideo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("test-video-1");
      expect(result.data.videoId).toBe("dQw4w9WgXcQ");
      expect(result.data.audioButtonCount).toBe(5);
      expect(result.data.hasAudioButtons).toBe(true);
    }
  });

  it("videoIdが必須である", () => {
    const dataWithoutVideoId = { ...validFirestoreVideo };
    delete (dataWithoutVideoId as any).videoId;

    const result = FirestoreVideoSchema.safeParse(dataWithoutVideoId);
    expect(result.success).toBe(false);
  });

  it("audioButtonCountのデフォルト値が設定される", () => {
    const dataWithoutAudio = { ...validFirestoreVideo };
    delete (dataWithoutAudio as any).audioButtonCount;
    delete (dataWithoutAudio as any).hasAudioButtons;

    const result = FirestoreVideoSchema.safeParse(dataWithoutAudio);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audioButtonCount).toBe(0);
      expect(result.data.hasAudioButtons).toBe(false);
    }
  });

  it("無効な日時形式でエラーが発生する", () => {
    const invalidData = {
      ...validFirestoreVideo,
      publishedAt: "invalid-date",
    };

    const result = FirestoreVideoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("FrontendVideoSchema", () => {
  it("有効なフロントエンド動画データを検証できる", () => {
    const result = FrontendVideoSchema.safeParse(validFrontendVideo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnails).toBeDefined();
      expect(result.data.publishedAtISO).toBe("2023-01-01T12:00:00Z");
      expect(result.data.lastFetchedAtISO).toBe("2023-01-02T12:00:00Z");
    }
  });

  it("thumbnailsフィールドが必須である", () => {
    const dataWithoutThumbnails = { ...validFrontendVideo };
    delete (dataWithoutThumbnails as any).thumbnails;

    const result = FrontendVideoSchema.safeParse(dataWithoutThumbnails);
    expect(result.success).toBe(false);
  });

  it("ISO日時フィールドが必須である", () => {
    const dataWithoutISO = { ...validFrontendVideo };
    delete (dataWithoutISO as any).publishedAtISO;

    const result = FrontendVideoSchema.safeParse(dataWithoutISO);
    expect(result.success).toBe(false);
  });
});

describe("VideoListResultSchema", () => {
  it("有効な動画リスト結果を検証できる", () => {
    const validResult: VideoListResult = {
      videos: [validFrontendVideo],
      hasMore: true,
      lastVideo: validFrontendVideo,
    };

    const result = VideoListResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it("空の動画リストも有効である", () => {
    const emptyResult = {
      videos: [],
      hasMore: false,
    };

    const result = VideoListResultSchema.safeParse(emptyResult);
    expect(result.success).toBe(true);
  });

  it("lastVideoがオプショナルである", () => {
    const resultWithoutLast = {
      videos: [validFrontendVideo],
      hasMore: false,
    };

    const result = VideoListResultSchema.safeParse(resultWithoutLast);
    expect(result.success).toBe(true);
  });
});

describe("PaginationParamsSchema", () => {
  it("有効なページネーションパラメータを検証できる", () => {
    const validParams = {
      limit: 10,
      startAfter: "video-id-123",
      videoType: "all" as const,
    };

    const result = PaginationParamsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it("limitが正の整数でなければエラーが発生する", () => {
    const invalidParams = {
      limit: -5,
    };

    const result = PaginationParamsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it("オプショナルフィールドが省略可能である", () => {
    const minimalParams = {
      limit: 20,
    };

    const result = PaginationParamsSchema.safeParse(minimalParams);
    expect(result.success).toBe(true);
  });
});

describe("convertToFrontendVideo", () => {
  it("Firestoreデータを正しくフロントエンド形式に変換できる", () => {
    const result = convertToFrontendVideo(validFirestoreVideo);

    expect(result.id).toBe(validFirestoreVideo.id);
    expect(result.videoId).toBe(validFirestoreVideo.videoId);
    expect(result.thumbnails).toBeDefined();
    expect(result.thumbnails.high?.url).toBe(validFirestoreVideo.thumbnailUrl);
    expect(result.publishedAtISO).toBe(validFirestoreVideo.publishedAt);
    expect(result.lastFetchedAtISO).toBe(validFirestoreVideo.lastFetchedAt);
  });

  it("videoIdが存在しない場合はidを使用する", () => {
    const dataWithoutVideoId = { ...validFirestoreVideo };
    delete (dataWithoutVideoId as any).videoId;

    const result = convertToFrontendVideo(dataWithoutVideoId);
    expect(result.videoId).toBe(validFirestoreVideo.id);
  });

  it("サムネイルURLからすべての解像度を生成する", () => {
    const result = convertToFrontendVideo(validFirestoreVideo);

    expect(result.thumbnails.default?.url).toBe(
      validFirestoreVideo.thumbnailUrl,
    );
    expect(result.thumbnails.medium?.url).toBe(
      validFirestoreVideo.thumbnailUrl,
    );
    expect(result.thumbnails.high?.url).toBe(validFirestoreVideo.thumbnailUrl);

    expect(result.thumbnails.high?.width).toBe(480);
    expect(result.thumbnails.high?.height).toBe(360);
    expect(result.thumbnails.medium?.width).toBe(320);
    expect(result.thumbnails.medium?.height).toBe(180);
    expect(result.thumbnails.default?.width).toBe(120);
    expect(result.thumbnails.default?.height).toBe(90);
  });

  it("liveBroadcastContentをvideoTypeから推測する", () => {
    const upcomingVideo = {
      ...validFirestoreVideo,
      videoType: "upcoming" as const,
    };

    const result = convertToFrontendVideo(upcomingVideo);
    expect(result.liveBroadcastContent).toBe("upcoming");

    const normalVideo = {
      ...validFirestoreVideo,
      videoType: "all" as const,
    };

    const result2 = convertToFrontendVideo(normalVideo);
    expect(result2.liveBroadcastContent).toBe("none");
  });

  it("音声ボタン関連フィールドのデフォルト値を設定する", () => {
    const dataWithoutAudio = { ...validFirestoreVideo };
    delete (dataWithoutAudio as any).audioButtonCount;
    delete (dataWithoutAudio as any).hasAudioButtons;

    const result = convertToFrontendVideo(dataWithoutAudio);
    expect(result.audioButtonCount).toBe(0);
    expect(result.hasAudioButtons).toBe(false);
  });

  it("スキーマ検証エラー時にフォールバックデータを返す", () => {
    const invalidData = {
      ...validFirestoreVideo,
      // 必須フィールドを削除してエラーを発生させる
      title: "", // 空文字はminLength(1)でエラー
    };

    const result = convertToFrontendVideo(invalidData);

    // フォールバックデータが返されることを確認
    expect(result.id).toBe(invalidData.id);
    expect(result.videoId).toBe(invalidData.videoId);
    expect(result.title).toBe(""); // フォールバック時は元のtitleがそのまま保持される
    expect(result.description).toBe(invalidData.description || "");
    expect(result.thumbnails).toBeDefined();
    expect(result.thumbnails.high?.url).toBe(invalidData.thumbnailUrl);
    expect(result.audioButtonCount).toBe(invalidData.audioButtonCount || 0);
    expect(result.hasAudioButtons).toBe(invalidData.hasAudioButtons || false);
  });

  it("thumbnailUrlが空の場合も適切に処理される", () => {
    const dataWithEmptyThumbnail = {
      ...validFirestoreVideo,
      thumbnailUrl: "",
    };

    const result = convertToFrontendVideo(dataWithEmptyThumbnail);
    // スキーマ検証エラーによりフォールバックデータが返される
    expect(result.id).toBe(dataWithEmptyThumbnail.id);
    expect(result.videoId).toBe(dataWithEmptyThumbnail.videoId);
    expect(result.thumbnailUrl).toBe(""); // 空文字が保持される
    expect(result.thumbnails).toBeDefined();
    expect(result.thumbnails.high?.url).toBe(""); // フォールバック時も空文字が使用される
  });
});

describe("serializeForRSC/deserializeForRCC", () => {
  it("フロントエンドデータを正しくシリアライズ・デシリアライズできる", () => {
    const serialized = serializeForRSC(validFrontendVideo);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeForRCC(serialized);
    expect(deserialized).toEqual(validFrontendVideo);
  });

  it("不正なJSON文字列でエラーが発生する", () => {
    const invalidJson = "invalid json";

    expect(() => {
      deserializeForRCC(invalidJson);
    }).toThrow("データの形式が無効です");
  });

  it("スキーマ検証エラーでエラーが発生する", () => {
    const invalidData = {
      id: "test",
      // その他の必須フィールドが不足
    };

    const serialized = JSON.stringify(invalidData);

    expect(() => {
      deserializeForRCC(serialized);
    }).toThrow("データの形式が無効です");
  });
});

describe("serializeListResult/deserializeListResult", () => {
  it("リスト結果を正しくシリアライズ・デシリアライズできる", () => {
    const validResult: VideoListResult = {
      videos: [validFrontendVideo],
      hasMore: true,
      lastVideo: validFrontendVideo,
    };

    const serialized = serializeListResult(validResult);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeListResult(serialized);
    expect(deserialized).toEqual(validResult);
  });

  it("空のリスト結果も正しく処理できる", () => {
    const emptyResult: VideoListResult = {
      videos: [],
      hasMore: false,
    };

    const serialized = serializeListResult(emptyResult);
    const deserialized = deserializeListResult(serialized);
    expect(deserialized).toEqual(emptyResult);
  });

  it("不正なデータでフォールバック値を返す", () => {
    const invalidJson = "invalid json";

    const result = deserializeListResult(invalidJson);
    expect(result).toEqual({ videos: [], hasMore: false });
  });

  it("スキーマ検証エラーでフォールバック値を返す", () => {
    const invalidData = {
      videos: "not-an-array",
      hasMore: "not-a-boolean",
    };

    const serialized = JSON.stringify(invalidData);
    const result = deserializeListResult(serialized);
    expect(result).toEqual({ videos: [], hasMore: false });
  });

  it("大きなリストも正しく処理できる", () => {
    const largeList: VideoListResult = {
      videos: Array(100).fill(validFrontendVideo),
      hasMore: true,
      lastVideo: validFrontendVideo,
    };

    const serialized = serializeListResult(largeList);
    const deserialized = deserializeListResult(serialized);
    expect(deserialized.videos.length).toBe(100);
    expect(deserialized.hasMore).toBe(true);
  });
});
