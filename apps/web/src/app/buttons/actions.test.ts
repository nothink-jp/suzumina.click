import type { CreateAudioReferenceInput } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAudioReference,
  getAudioReferenceById,
  getAudioReferences,
} from "./actions";

// Mock Firestore Admin
const mockAdd = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockFieldValue = {
  increment: vi.fn(),
};

vi.mock("@/lib/firestore-admin", () => ({
  FirestoreAdmin: {
    getInstance: () => ({
      collection: mockCollection,
      FieldValue: mockFieldValue,
    }),
  },
}));

// Mock headers for rate limiting
vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => "127.0.0.1"),
  })),
}));

// Mock cache revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Audio Reference Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock YouTube API key
    process.env.YOUTUBE_API_KEY = "test-api-key";

    // Setup collection chain - collection should return a query that has all methods
    const mockQuery = {
      add: mockAdd,
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      startAfter: mockStartAfter,
      get: mockGet,
    };

    mockCollection.mockReturnValue(mockQuery);

    // Each query method should return an object that also has all query methods
    mockWhere.mockReturnValue(mockQuery);
    mockOrderBy.mockReturnValue(mockQuery);
    mockLimit.mockReturnValue(mockQuery);
    mockStartAfter.mockReturnValue(mockQuery);

    mockDoc.mockReturnValue({
      get: mockGet,
      update: vi.fn(),
    });
  });

  describe("createAudioReference", () => {
    const validInput: CreateAudioReferenceInput = {
      title: "テスト音声ボタン",
      description: "テスト用の説明",
      category: "voice",
      tags: ["テスト"],
      videoId: "test-video-id",
      startTime: 30,
      endTime: 45,
    };

    it("有効な入力で音声リファレンスが作成される", async () => {
      // Mock successful add
      mockAdd.mockResolvedValue({ id: "new-audio-ref-id" });

      // Mock YouTube API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                snippet: {
                  title: "Test Video",
                  channelId: "test-channel",
                  channelTitle: "Test Channel",
                  publishedAt: "2024-01-01T00:00:00Z",
                  thumbnails: {
                    high: { url: "https://example.com/thumb.jpg" },
                  },
                },
                contentDetails: {
                  duration: "PT5M30S", // 5 minutes 30 seconds
                },
              },
            ],
          }),
      });

      // Mock rate limit check
      mockGet.mockResolvedValue({
        docs: [], // No recent creations
      });

      const result = await createAudioReference(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("new-audio-ref-id");
      }
      expect(mockAdd).toHaveBeenCalled();
    });

    it("無効な入力でエラーが返される", async () => {
      const invalidInput = {
        ...validInput,
        title: "", // Empty title should fail validation
      };

      const result = await createAudioReference(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("入力データが無効です");
      }
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("YouTube動画が見つからない場合はエラーが返される", async () => {
      // Mock YouTube API response with no items
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
          }),
      });

      const result = await createAudioReference(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("YouTube動画が見つからない");
      }
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("Firestoreエラーが適切にハンドリングされる", async () => {
      // Mock successful YouTube API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                snippet: {
                  title: "Test Video",
                  channelId: "test-channel",
                  channelTitle: "Test Channel",
                  publishedAt: "2024-01-01T00:00:00Z",
                },
                contentDetails: {
                  duration: "PT5M30S",
                },
              },
            ],
          }),
      });

      // Mock rate limit check
      mockGet.mockResolvedValue({
        docs: [],
      });

      // Mock Firestore error
      mockAdd.mockRejectedValue(new Error("Firestore error"));

      const result = await createAudioReference(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("音声ボタンの作成に失敗しました");
      }
    });
  });

  describe("getAudioReferences", () => {
    it("音声リファレンスリストが正常に取得される", async () => {
      const mockDocs = [
        {
          id: "audio-ref-1",
          data: () => ({
            title: "音声ボタン1",
            description: "説明1",
            category: "voice",
            videoId: "video-1",
            videoTitle: "動画タイトル1",
            startTime: 10,
            endTime: 20,
            duration: 10,
            playCount: 5,
            likeCount: 2,
            viewCount: 10,
            isPublic: true,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          }),
        },
        {
          id: "audio-ref-2",
          data: () => ({
            title: "音声ボタン2",
            description: "説明2",
            category: "bgm",
            videoId: "video-2",
            videoTitle: "動画タイトル2",
            startTime: 30,
            endTime: 45,
            duration: 15,
            playCount: 8,
            likeCount: 3,
            viewCount: 15,
            isPublic: true,
            createdAt: "2024-01-02T00:00:00Z",
            updatedAt: "2024-01-02T00:00:00Z",
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      const result = await getAudioReferences({
        limit: 20,
        sortBy: "newest",
        onlyPublic: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.audioReferences).toHaveLength(2);
        expect(result.data.audioReferences[0].title).toBe("音声ボタン1");
        expect(result.data.hasMore).toBe(false);
      }
    });

    it("フィルタリングが正しく動作する", async () => {
      mockGet.mockResolvedValue({
        docs: [],
      });

      const result = await getAudioReferences({
        limit: 20,
        category: "voice",
        sortBy: "newest",
        onlyPublic: true,
      });

      expect(result.success).toBe(true);
      expect(mockWhere).toHaveBeenCalledWith("category", "==", "voice");
    });

    it("無効なクエリでエラーが返される", async () => {
      const result = await getAudioReferences({
        limit: -1, // Invalid limit
        sortBy: "newest",
        onlyPublic: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("検索条件が無効です");
      }
    });
  });

  describe("getAudioReferenceById", () => {
    it("IDで音声リファレンスが正常に取得される", async () => {
      const mockDocData = {
        title: "テスト音声ボタン",
        description: "テスト用の説明",
        category: "voice",
        videoId: "test-video",
        videoTitle: "テスト動画",
        startTime: 10,
        endTime: 25,
        duration: 15,
        playCount: 5,
        likeCount: 2,
        viewCount: 10,
        isPublic: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "test-audio-ref-id",
        data: () => mockDocData,
      });

      const result = await getAudioReferenceById("test-audio-ref-id");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("test-audio-ref-id");
        expect(result.data.title).toBe("テスト音声ボタン");
      }
    });

    it("存在しないIDでエラーが返される", async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await getAudioReferenceById("non-existent-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("音声ボタンが見つかりません");
      }
    });

    it("非公開の音声リファレンスでエラーが返される", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: "private-audio-ref",
        data: () => ({
          title: "非公開音声ボタン",
          description: "非公開説明",
          category: "voice",
          videoId: "private-video",
          videoTitle: "非公開動画",
          startTime: 0,
          endTime: 10,
          duration: 10,
          playCount: 0,
          likeCount: 0,
          viewCount: 0,
          isPublic: false,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      });

      const result = await getAudioReferenceById("private-audio-ref");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("非公開です");
      }
    });

    it("無効なIDでエラーが返される", async () => {
      const result = await getAudioReferenceById("");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("音声ボタンIDが指定されていません");
      }
    });
  });
});
