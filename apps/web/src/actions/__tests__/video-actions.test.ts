/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVideoAction, getVideosAction } from "../video-actions";

// モジュールのモック
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/video-firestore", () => ({
	getVideoByIdFromFirestore: vi.fn(),
	getVideosByIdsFromFirestore: vi.fn(),
}));

// モックのインポート
import { auth } from "@/auth";
import { getVideoByIdFromFirestore, getVideosByIdsFromFirestore } from "@/lib/video-firestore";

describe("video-actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getVideoAction", () => {
		it("有効な動画IDで動画を取得できる", async () => {
			const mockVideo = {
				id: "test-video-123",
				title: "テスト動画",
				channelTitle: "テストチャンネル",
				publishedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(getVideoByIdFromFirestore).mockResolvedValue(mockVideo as any);

			const result = await getVideoAction("test-video-123");

			expect(result.success).toBe(true);
			expect(result.video).toBeDefined();
			expect(getVideoByIdFromFirestore).toHaveBeenCalledWith("test-video-123");
		});

		it("無効な動画IDでエラーを返す", async () => {
			const result = await getVideoAction("");

			expect(result.success).toBe(false);
			expect(result.error).toBe("有効な動画IDが必要です");
			expect(getVideoByIdFromFirestore).not.toHaveBeenCalled();
		});

		it("存在しない動画IDでエラーを返す", async () => {
			vi.mocked(getVideoByIdFromFirestore).mockResolvedValue(null);

			const result = await getVideoAction("non-existent-id");

			expect(result.success).toBe(false);
			expect(result.error).toBe("動画が見つかりません");
		});

		it("Firestoreエラーをハンドリングする", async () => {
			vi.mocked(getVideoByIdFromFirestore).mockRejectedValue(
				new Error("Firestore connection error"),
			);

			const result = await getVideoAction("test-video-123");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Firestore connection error");
		});
	});

	describe("getVideosAction", () => {
		it("有効な動画ID配列で複数の動画を取得できる", async () => {
			const mockVideos = [
				{
					id: "video-1",
					title: "動画1",
					channelTitle: "チャンネル1",
					publishedAt: "2024-01-01T00:00:00Z",
				},
				{
					id: "video-2",
					title: "動画2",
					channelTitle: "チャンネル2",
					publishedAt: "2024-01-02T00:00:00Z",
				},
			];

			vi.mocked(getVideosByIdsFromFirestore).mockResolvedValue(mockVideos as any);

			const result = await getVideosAction(["video-1", "video-2"]);

			expect(result.success).toBe(true);
			expect(result.videos).toHaveLength(2);
			expect(getVideosByIdsFromFirestore).toHaveBeenCalledWith(["video-1", "video-2"]);
		});

		it("空の配列で空の結果を返す", async () => {
			const result = await getVideosAction([]);

			expect(result.success).toBe(true);
			expect(result.videos).toEqual([]);
			expect(getVideosByIdsFromFirestore).not.toHaveBeenCalled();
		});

		it("重複したIDを除去する", async () => {
			vi.mocked(getVideosByIdsFromFirestore).mockResolvedValue([]);

			await getVideosAction(["video-1", "video-1", "video-2"]);

			expect(getVideosByIdsFromFirestore).toHaveBeenCalledWith(["video-1", "video-2"]);
		});

		it("30件を超える場合エラーを返す", async () => {
			const manyIds = Array.from({ length: 31 }, (_, i) => `video-${i}`);

			const result = await getVideosAction(manyIds);

			expect(result.success).toBe(false);
			expect(result.error).toBe("一度に取得できる動画は30件までです");
			expect(getVideosByIdsFromFirestore).not.toHaveBeenCalled();
		});

		it("配列以外の入力でエラーを返す", async () => {
			const result = await getVideosAction("not-an-array" as any);

			expect(result.success).toBe(false);
			expect(result.error).toBe("動画IDの配列が必要です");
		});
	});

	describe("updateVideoAction", () => {
		it("認証されていない場合エラーを返す", async () => {
			const { updateVideoAction } = await import("../video-actions");
			vi.mocked(auth).mockResolvedValue(null);

			const result = await updateVideoAction("video-123", {});

			expect(result.success).toBe(false);
			expect(result.error).toBe("ログインが必要です");
		});

		it("認証されている場合成功を返す", async () => {
			const { updateVideoAction } = await import("../video-actions");
			vi.mocked(auth).mockResolvedValue({
				user: {
					id: "user-123",
					discordId: "discord-123",
					role: "user",
				},
			} as any);

			const result = await updateVideoAction("video-123", {});

			expect(result.success).toBe(true);
		});
	});
});
