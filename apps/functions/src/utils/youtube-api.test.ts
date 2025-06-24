import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUZUKA_MINASE_CHANNEL_ID } from "./common";
import * as youtubeApi from "./youtube-api";

// モックの型定義
interface SearchListResponse {
	data: youtube_v3.Schema$SearchListResponse;
}

interface VideoListResponse {
	data: youtube_v3.Schema$VideoListResponse;
}

// googleapisのモック
const mockYoutubeSearchList = vi.fn();
const mockYoutubeVideosList = vi.fn();
const mockYoutubeClient = {
	search: {
		list: mockYoutubeSearchList,
	},
	videos: {
		list: mockYoutubeVideosList,
	},
};

vi.mock("googleapis", () => ({
	google: {
		youtube: vi.fn().mockImplementation(() => mockYoutubeClient),
	},
}));

// logger関数のモック
vi.mock("./logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

// retryApiCallのモック
vi.mock("./retry", () => ({
	retryApiCall: vi.fn().mockImplementation(async (fn) => fn()),
}));

describe("youtube-api", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// 環境変数を保存
		originalEnv = { ...process.env };

		// モックをリセット
		vi.clearAllMocks();
	});

	afterEach(() => {
		// テスト後に環境変数を復元
		process.env = originalEnv;
	});

	describe("initializeYouTubeClient", () => {
		it("APIキーが設定されている場合、YouTubeクライアントを返すこと", () => {
			// テスト用のAPIキーを設定
			process.env.YOUTUBE_API_KEY = "test-api-key";

			// 関数を実行
			const [client, error] = youtubeApi.initializeYouTubeClient();

			// 検証
			expect(client).toBeDefined();
			expect(error).toBeUndefined();
		});

		it("APIキーが設定されていない場合、エラーを返すこと", () => {
			// APIキーをクリア
			process.env.YOUTUBE_API_KEY = undefined;

			// 関数を実行
			const [client, error] = youtubeApi.initializeYouTubeClient();

			// 検証
			expect(client).toBeUndefined();
			expect(error).toEqual({
				videoCount: 0,
				error: "YouTube API Keyが設定されていません",
			});
		});
	});

	describe("searchVideos", () => {
		// テスト用のYouTubeクライアント
		let youtubeClient: youtube_v3.Youtube;

		beforeEach(() => {
			youtubeClient = mockYoutubeClient as unknown as youtube_v3.Youtube;
		});

		it("正常に動画を検索できること", async () => {
			// APIレスポンスのモック
			const mockResponse: SearchListResponse = {
				data: {
					items: [
						{ id: { videoId: "video1" }, kind: "", etag: "" },
						{ id: { videoId: "video2" }, kind: "", etag: "" },
					],
					nextPageToken: "next-token",
				},
			};
			mockYoutubeSearchList.mockResolvedValueOnce(mockResponse);

			// 関数を実行
			const result = await youtubeApi.searchVideos(youtubeClient);

			// 検証
			expect(mockYoutubeSearchList).toHaveBeenCalledWith({
				part: ["id", "snippet"],
				channelId: SUZUKA_MINASE_CHANNEL_ID,
				maxResults: youtubeApi.MAX_VIDEOS_PER_BATCH,
				type: ["video"],
				order: "date",
				pageToken: undefined,
			});
			expect(result.items).toHaveLength(2);
			expect(result.nextPageToken).toBe("next-token");
		});

		it("ページトークンが指定された場合、それを使用して検索すること", async () => {
			// APIレスポンスのモック
			const mockResponse: SearchListResponse = {
				data: {
					items: [],
					nextPageToken: undefined,
				},
			};
			mockYoutubeSearchList.mockResolvedValueOnce(mockResponse);

			// ページトークンを指定して実行
			const pageToken = "test-page-token";
			await youtubeApi.searchVideos(youtubeClient, pageToken);

			// 検証
			expect(mockYoutubeSearchList).toHaveBeenCalledWith(
				expect.objectContaining({
					pageToken: pageToken,
				}),
			);
		});

		it("クォータ超過エラーが発生した場合、適切にエラーをスローすること", async () => {
			// クォータ超過エラーのモック
			const quotaError = {
				code: youtubeApi.QUOTA_EXCEEDED_CODE,
				message: "Quota exceeded",
			};
			mockYoutubeSearchList.mockRejectedValueOnce(quotaError);

			// 関数の実行と検証
			await expect(youtubeApi.searchVideos(youtubeClient)).rejects.toThrow(
				"YouTube APIクォータを超過しました",
			);
		});

		it("その他のエラーが発生した場合、そのエラーがスローされること", async () => {
			// 一般的なエラーのモック
			const generalError = new Error("一般的なAPIエラー");
			mockYoutubeSearchList.mockRejectedValueOnce(generalError);

			// 関数の実行と検証
			await expect(youtubeApi.searchVideos(youtubeClient)).rejects.toThrow("一般的なAPIエラー");
		});
	});

	describe("fetchVideoDetails", () => {
		// テスト用のYouTubeクライアント
		let youtubeClient: youtube_v3.Youtube;

		beforeEach(() => {
			youtubeClient = mockYoutubeClient as unknown as youtube_v3.Youtube;
		});

		it("正常に動画の詳細情報を取得できること", async () => {
			// APIレスポンスのモック
			const mockResponse: VideoListResponse = {
				data: {
					items: [
						{
							id: "video1",
							snippet: {
								title: "テスト動画1",
								description: "説明文1",
							},
							kind: "",
							etag: "",
						},
						{
							id: "video2",
							snippet: {
								title: "テスト動画2",
								description: "説明文2",
							},
							kind: "",
							etag: "",
						},
					],
				},
			};
			mockYoutubeVideosList.mockResolvedValueOnce(mockResponse);

			// 関数を実行
			const videoIds = ["video1", "video2"];
			const result = await youtubeApi.fetchVideoDetails(youtubeClient, videoIds);

			// 検証
			expect(mockYoutubeVideosList).toHaveBeenCalledWith({
				part: [
					"snippet",
					"contentDetails",
					"statistics",
					"liveStreamingDetails",
					"topicDetails",
					"status",
					"recordingDetails",
					"player",
				],
				id: videoIds,
				maxResults: youtubeApi.MAX_VIDEOS_PER_BATCH,
			});
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("video1");
			expect(result[1].id).toBe("video2");
		});

		it("動画IDが多い場合はバッチ処理されること", async () => {
			// バッチ処理のテスト用に51個の動画IDを用意
			const manyVideoIds = Array.from({ length: 51 }, (_, i) => `video${i + 1}`);

			// 1回目のバッチ（50件）のレスポンス
			const mockResponse1: VideoListResponse = {
				data: {
					items: Array.from({ length: 50 }, (_, i) => ({
						id: `video${i + 1}`,
						snippet: { title: `テスト動画${i + 1}` },
						kind: "",
						etag: "",
					})),
				},
			};

			// 2回目のバッチ（1件）のレスポンス
			const mockResponse2: VideoListResponse = {
				data: {
					items: [
						{
							id: "video51",
							snippet: { title: "テスト動画51" },
							kind: "",
							etag: "",
						},
					],
				},
			};

			mockYoutubeVideosList.mockResolvedValueOnce(mockResponse1);
			mockYoutubeVideosList.mockResolvedValueOnce(mockResponse2);

			// 関数を実行
			const result = await youtubeApi.fetchVideoDetails(youtubeClient, manyVideoIds);

			// 検証
			expect(mockYoutubeVideosList).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(51);
		});

		it("クォータ超過エラーが発生した場合、その時点までの結果を返すこと", async () => {
			// 1回目のバッチは正常に処理
			const mockResponse1: VideoListResponse = {
				data: {
					items: [
						{
							id: "video1",
							snippet: { title: "テスト動画1" },
							kind: "",
							etag: "",
						},
						{
							id: "video2",
							snippet: { title: "テスト動画2" },
							kind: "",
							etag: "",
						},
					],
				},
			};
			mockYoutubeVideosList.mockResolvedValueOnce(mockResponse1);

			// 2回目のバッチでクォータ超過エラー
			const quotaError = {
				code: youtubeApi.QUOTA_EXCEEDED_CODE,
				message: "Quota exceeded",
			};
			mockYoutubeVideosList.mockRejectedValueOnce(quotaError);

			// 関数を実行（3つの動画IDを2つのバッチに分ける）
			const videoIds = ["video1", "video2", "video3"];
			const result = await youtubeApi.fetchVideoDetails(youtubeClient, videoIds);

			// 検証（最初のバッチの結果だけが返されること）
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("video1");
			expect(result[1].id).toBe("video2");
		});

		it("その他のエラーが発生した場合、エラーがスローされること", async () => {
			// Vitestのモック関数リセット
			vi.resetAllMocks();

			// retryApiCallのモックを上書き
			const generalError = new Error("一般的なAPIエラー");
			const mockRetryApiCall = await import("./retry");
			mockRetryApiCall.retryApiCall = vi.fn().mockRejectedValueOnce(generalError);

			// 動画IDは空でない配列であることを確認
			const videoIds = ["video1"];

			// 関数の実行と検証
			try {
				await youtubeApi.fetchVideoDetails(youtubeClient, videoIds);
				// ここに到達したら失敗
				expect(true).toBe(false); // 到達すべきでない
			} catch (e) {
				expect(e).toEqual(generalError);
			}
		});

		it("空の動画IDリストが渡された場合、空の結果を返すこと", async () => {
			const result = await youtubeApi.fetchVideoDetails(youtubeClient, []);
			expect(result).toEqual([]);
			expect(mockYoutubeVideosList).not.toHaveBeenCalled();
		});
	});

	describe("extractVideoIds", () => {
		it("検索結果から動画IDを正しく抽出できること", () => {
			// テスト用の検索結果
			const searchItems: youtube_v3.Schema$SearchResult[] = [
				{ id: { videoId: "video1" }, kind: "", etag: "" },
				{ id: { videoId: "video2" }, kind: "", etag: "" },
				{ id: { videoId: "video3" }, kind: "", etag: "" },
			];

			// 関数を実行
			const result = youtubeApi.extractVideoIds(searchItems);

			// 検証
			expect(result).toEqual(["video1", "video2", "video3"]);
		});

		it("videoIdが存在しない項目は無視されること", () => {
			// テスト用の検索結果（一部にvideoIdがない項目を含む）
			const searchItems: youtube_v3.Schema$SearchResult[] = [
				{ id: { videoId: "video1" }, kind: "", etag: "" },
				{ id: {}, kind: "", etag: "" }, // videoIdなし
				{ id: undefined, kind: "", etag: "" }, // idがundefined
				{ id: { videoId: "video2" }, kind: "", etag: "" },
			];

			// 関数を実行
			const result = youtubeApi.extractVideoIds(searchItems);

			// 検証
			expect(result).toEqual(["video1", "video2"]);
		});

		it("空の検索結果の場合、空の配列を返すこと", () => {
			const result = youtubeApi.extractVideoIds([]);
			expect(result).toEqual([]);
		});
	});
});
