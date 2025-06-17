import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromServerModel, toServerModel } from "./firestore-utils";
import type { FirestoreServerVideoData } from "./video";

// Firestoreタイムスタンプのモック
const createMockTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
});

const mockFirestoreTimestamp = {
  now: vi.fn(() => createMockTimestamp(new Date("2023-01-01T00:00:00Z"))),
  fromDate: vi.fn((date: Date) => createMockTimestamp(date)),
};

const mockFirestore = {
  Timestamp: mockFirestoreTimestamp,
};

describe("firestore-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("toServerModel", () => {
    it("should convert client data to server model correctly", () => {
      const clientData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        description: "テスト動画の説明",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00Z",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z",
        videoType: "video" as const,
        liveBroadcastContent: "none" as const,
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(result).toEqual({
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        description: "テスト動画の説明",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: expect.objectContaining({
          toDate: expect.any(Function),
        }),
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: expect.objectContaining({
          toDate: expect.any(Function),
        }),
        videoType: "video",
        liveBroadcastContent: "none",
      });

      expect(mockFirestoreTimestamp.fromDate).toHaveBeenCalledWith(
        new Date("2023-05-15T10:30:00Z"),
      );
      expect(mockFirestoreTimestamp.fromDate).toHaveBeenCalledWith(
        new Date("2023-06-01T12:00:00Z"),
      );
    });

    it("should use videoId as fallback when id is missing", () => {
      const clientData = {
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00Z",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z",
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(result.videoId).toBe("ABC123");
      expect(result.id).toBeUndefined();
    });

    it("should use id as videoId when videoId is missing", () => {
      const clientData = {
        id: "video123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00Z",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z",
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(result.id).toBe("video123");
      expect(result.videoId).toBe("video123");
    });

    it("should handle missing description with empty string", () => {
      const clientData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00Z",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z",
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(result.description).toBe("");
    });

    it("should handle missing timestamps with current time", () => {
      const clientData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        thumbnailUrl: "https://example.com/thumb.jpg",
        // publishedAt と lastFetchedAt が欠けている
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(mockFirestoreTimestamp.now).toHaveBeenCalledTimes(2);
      expect(result.publishedAt).toEqual(
        expect.objectContaining({
          toDate: expect.any(Function),
        }),
      );
      expect(result.lastFetchedAt).toEqual(
        expect.objectContaining({
          toDate: expect.any(Function),
        }),
      );
    });

    it("should handle invalid date strings gracefully", () => {
      const clientData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "invalid-date-string",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z",
      };

      // fromDateが無効な日付でエラーを投げるようにモック
      mockFirestoreTimestamp.fromDate.mockImplementation((date: Date) => {
        if (Number.isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
        return createMockTimestamp(date);
      });

      const result = toServerModel(clientData, mockFirestore);

      // publishedAtは無効な日付でエラーとなり、now()が呼ばれる
      expect(mockFirestoreTimestamp.now).toHaveBeenCalledTimes(1);
      // lastFetchedAtは有効な日付なのでfromDateが呼ばれる
      expect(mockFirestoreTimestamp.fromDate).toHaveBeenCalledTimes(2); // 最初の無効な呼び出し + 有効な呼び出し
      expect(result.publishedAt).toBeDefined();
      expect(result.lastFetchedAt).toBeDefined();
    });

    it("should handle null and undefined dates", () => {
      const clientData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: null,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: undefined,
      };

      const result = toServerModel(clientData, mockFirestore);

      expect(mockFirestoreTimestamp.now).toHaveBeenCalledTimes(2);
      expect(result.publishedAt).toBeDefined();
      expect(result.lastFetchedAt).toBeDefined();
    });
  });

  describe("fromServerModel", () => {
    it("should convert server data to client model correctly", () => {
      const publishedDate = new Date("2023-05-15T10:30:00Z");
      const fetchedDate = new Date("2023-06-01T12:00:00Z");

      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        description: "テスト動画の説明",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: createMockTimestamp(publishedDate),
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: createMockTimestamp(fetchedDate),
        videoType: "video",
        liveBroadcastContent: "none",
      };

      const result = fromServerModel(serverData);

      expect(result).toEqual({
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        description: "テスト動画の説明",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00.000Z",
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00.000Z",
        videoType: "video",
        liveBroadcastContent: "none",
      });
    });

    it("should use videoId as id when id is missing", () => {
      const serverData: FirestoreServerVideoData = {
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: createMockTimestamp(new Date("2023-05-15T10:30:00Z")),
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: createMockTimestamp(new Date("2023-06-01T12:00:00Z")),
      };

      const result = fromServerModel(serverData);

      expect(result.id).toBe("ABC123");
      expect(result.videoId).toBe("ABC123");
    });

    it("should handle missing description with empty string", () => {
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: createMockTimestamp(new Date("2023-05-15T10:30:00Z")),
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: createMockTimestamp(new Date("2023-06-01T12:00:00Z")),
      };

      const result = fromServerModel(serverData);

      expect(result.description).toBe("");
    });

    it("should handle missing liveBroadcastContent with 'none'", () => {
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: createMockTimestamp(new Date("2023-05-15T10:30:00Z")),
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: createMockTimestamp(new Date("2023-06-01T12:00:00Z")),
      };

      const result = fromServerModel(serverData);

      expect(result.liveBroadcastContent).toBe("none");
    });

    it("should handle missing timestamps with current time", () => {
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: null as any,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: undefined as any,
      };

      const result = fromServerModel(serverData);

      expect(result.publishedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result.lastFetchedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should handle invalid timestamp objects gracefully", () => {
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: { invalid: "timestamp" } as any,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "invalid-timestamp" as any,
      };

      const result = fromServerModel(serverData);

      expect(result.publishedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result.lastFetchedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should handle Date objects correctly", () => {
      const publishedDate = new Date("2023-05-15T10:30:00Z");
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: publishedDate as any,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: publishedDate as any,
      };

      const result = fromServerModel(serverData);

      expect(result.publishedAt).toBe("2023-05-15T10:30:00.000Z");
      expect(result.lastFetchedAt).toBe("2023-05-15T10:30:00.000Z");
    });

    it("should handle string timestamps correctly", () => {
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-05-15T10:30:00Z" as any,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: "2023-06-01T12:00:00Z" as any,
      };

      const result = fromServerModel(serverData);

      expect(result.publishedAt).toBe("2023-05-15T10:30:00.000Z");
      expect(result.lastFetchedAt).toBe("2023-06-01T12:00:00.000Z");
    });

    it("should handle numeric timestamps correctly", () => {
      const timestamp = Date.parse("2023-05-15T10:30:00Z");
      const serverData: FirestoreServerVideoData = {
        id: "video123",
        videoId: "ABC123",
        title: "テスト動画",
        channelId: "UC123456",
        channelTitle: "テストチャンネル",
        publishedAt: timestamp as any,
        thumbnailUrl: "https://example.com/thumb.jpg",
        lastFetchedAt: timestamp as any,
      };

      const result = fromServerModel(serverData);

      expect(result.publishedAt).toBe("2023-05-15T10:30:00.000Z");
      expect(result.lastFetchedAt).toBe("2023-05-15T10:30:00.000Z");
    });
  });
});
