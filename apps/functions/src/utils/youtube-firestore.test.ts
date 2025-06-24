import type { youtube_v3 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";

// firestoreをモックする（vi.mockはファイルの先頭でhoistingされる）
vi.mock("./firestore", () => {
	// モックオブジェクトを作成
	const mockDoc = vi.fn().mockReturnValue({
		id: "test-video-id",
	});

	const mockCollection = {
		doc: mockDoc,
	};

	const mockBatch = {
		set: vi.fn().mockReturnThis(),
		commit: vi.fn().mockResolvedValue(undefined),
	};

	return {
		default: {
			collection: vi.fn().mockReturnValue(mockCollection),
			batch: vi.fn().mockReturnValue(mockBatch),
		},
		Timestamp: {
			now: vi.fn().mockReturnValue({ seconds: 1621234567, nanoseconds: 123000000 }),
			fromDate: vi.fn().mockImplementation((date) => ({
				seconds: Math.floor(date.getTime() / 1000),
				nanoseconds: 0,
				toDate: () => date,
			})),
		},
	};
});

// loggerをモック
vi.mock("./logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

import * as firestore from "./firestore";
import * as logger from "./logger";
// モック後にインポート（これが重要）
import * as youtubeFirestore from "./youtube-firestore";

describe("youtube-firestore", () => {
	// YouTube API モックデータ
	const mockVideoWithAllData: youtube_v3.Schema$Video = {
		id: "test-video-id",
		snippet: {
			title: "テスト動画タイトル",
			description: "これはテスト用の動画説明です。",
			publishedAt: "2025-05-15T10:00:00Z",
			thumbnails: {
				default: { url: "https://example.com/default.jpg" },
				medium: { url: "https://example.com/medium.jpg" },
				high: { url: "https://example.com/high.jpg" },
				standard: { url: "https://example.com/standard.jpg" },
				maxres: { url: "https://example.com/maxres.jpg" },
			},
			channelId: "test-channel-id",
			channelTitle: "テストチャンネル",
			liveBroadcastContent: "none",
		},
		statistics: {
			viewCount: "1000",
			likeCount: "100",
			commentCount: "50",
		},
	};

	const mockLiveVideo: youtube_v3.Schema$Video = {
		id: "live-video-id",
		snippet: {
			title: "ライブ配信テスト",
			description: "これはライブ配信のテスト動画です。",
			publishedAt: "2025-05-20T15:00:00Z",
			thumbnails: {
				default: { url: "https://example.com/live-default.jpg" },
				high: { url: "https://example.com/live-high.jpg" },
			},
			channelId: "test-channel-id",
			channelTitle: "テストチャンネル",
			liveBroadcastContent: "live",
		},
	};

	const mockUpcomingVideo: youtube_v3.Schema$Video = {
		id: "upcoming-video-id",
		snippet: {
			title: "配信予定テスト",
			description: "これは配信予定のテスト動画です。",
			publishedAt: "2025-05-25T20:00:00Z",
			thumbnails: {
				default: { url: "https://example.com/upcoming-default.jpg" },
			},
			channelId: "test-channel-id",
			channelTitle: "テストチャンネル",
			liveBroadcastContent: "upcoming",
		},
	};

	const mockInvalidVideo: youtube_v3.Schema$Video = {
		snippet: {
			title: "無効な動画",
			description: "IDがない無効な動画です。",
		},
	};

	beforeEach(() => {
		// テスト前にモックをリセット
		vi.clearAllMocks();
	});

	describe("convertVideoDataForFirestore", () => {
		it("正常な動画データをFirestore形式に変換できる", () => {
			const result = youtubeFirestore.convertVideoDataForFirestore(mockVideoWithAllData);

			expect(result).not.toBeNull();
			expect(result).toMatchObject({
				videoId: "test-video-id",
				title: "テスト動画タイトル",
				description: "これはテスト用の動画説明です。",
				channelId: "test-channel-id",
				channelTitle: "テストチャンネル",
				thumbnailUrl: "https://example.com/maxres.jpg",
				liveBroadcastContent: "none",
			});
		});

		it("ライブ配信動画のliveBroadcastContentが正しく設定される", () => {
			const result = youtubeFirestore.convertVideoDataForFirestore(mockLiveVideo);

			expect(result).not.toBeNull();
			expect(result).toMatchObject({
				videoId: "live-video-id",
				liveBroadcastContent: "live",
			});
		});

		it("配信予定動画のliveBroadcastContentが正しく設定される", () => {
			const result = youtubeFirestore.convertVideoDataForFirestore(mockUpcomingVideo);

			expect(result).not.toBeNull();
			expect(result).toMatchObject({
				videoId: "upcoming-video-id",
				liveBroadcastContent: "upcoming",
			});
		});

		it("無効な動画データの場合はnullを返す", () => {
			const result = youtubeFirestore.convertVideoDataForFirestore(mockInvalidVideo);
			expect(result).toBeNull();
		});
	});

	describe("saveVideosToFirestore", () => {
		it("空の動画リストの場合は0を返す", async () => {
			const result = await youtubeFirestore.saveVideosToFirestore([]);
			expect(result).toBe(0);
		});

		it("有効な動画をFirestoreに保存できる", async () => {
			const result = await youtubeFirestore.saveVideosToFirestore([mockVideoWithAllData]);

			expect(result).toBe(1);
			expect(firestore.default.collection).toHaveBeenCalledWith("videos");
			// モックされた関数が正しく呼ばれたことを確認
			expect(firestore.default.collection("videos").doc).toHaveBeenCalledWith("test-video-id");
			expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("複数の動画をバッチ処理できる", async () => {
			// docメソッドのモックを書き換え
			const mockDoc = firestore.default.collection("").doc;
			vi.mocked(mockDoc).mockImplementation((id) => ({ id }) as any);

			const videos = [mockVideoWithAllData, mockLiveVideo, mockUpcomingVideo, mockInvalidVideo];
			const result = await youtubeFirestore.saveVideosToFirestore(videos);

			// 無効な動画を除いた数が返される
			expect(result).toBe(3);
			expect(firestore.default.batch().set).toHaveBeenCalledTimes(3);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("バッチサイズ上限を超える場合に複数回コミットする", async () => {
			// docメソッドのモックを書き換え
			const mockDoc = firestore.default.collection("").doc;
			vi.mocked(mockDoc).mockImplementation((id) => ({ id }) as any);

			// コミット回数をテストするための大量データ
			// MAX_FIRESTORE_BATCH_SIZE = 500なので、501件で2回コミットされることを確認
			const largeVideosList = Array(501).fill(mockVideoWithAllData);

			await youtubeFirestore.saveVideosToFirestore(largeVideosList);

			// バッチコミットが2回呼ばれることを確認（500件 + 1件）
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(2);
		});

		it("空の動画リストを処理する", async () => {
			await youtubeFirestore.saveVideosToFirestore([]);

			// 空の場合はバッチ操作が実行されないことを確認
			expect(firestore.default.batch().set).not.toHaveBeenCalled();
			expect(firestore.default.batch().commit).not.toHaveBeenCalled();
		});

		it("部分的なデータを持つ動画を処理する", async () => {
			const partialVideo: youtube_v3.Schema$Video = {
				id: "partial-video-id",
				snippet: {
					title: "部分データの動画",
					// publishedAt や description が欠けている
				},
				statistics: {
					// viewCount が欠けている
					likeCount: "10",
				},
			};

			await youtubeFirestore.saveVideosToFirestore([partialVideo]);

			expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("無効なデータを含む動画をスキップする", async () => {
			const invalidVideos: youtube_v3.Schema$Video[] = [
				// IDがない動画
				{
					snippet: {
						title: "IDなしの動画",
					},
				},
				// 正常な動画
				mockVideoWithAllData,
				// snippetがない動画
				{
					id: "no-snippet-video",
				},
			];

			await youtubeFirestore.saveVideosToFirestore(invalidVideos);

			// 正常な動画1件のみが処理されることを確認
			expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("統計情報がない動画を処理する", async () => {
			const videoWithoutStats: youtube_v3.Schema$Video = {
				id: "no-stats-video",
				snippet: {
					title: "統計情報なしの動画",
					publishedAt: "2023-01-01T00:00:00Z",
					description: "説明",
				},
				// statistics がない
			};

			await youtubeFirestore.saveVideosToFirestore([videoWithoutStats]);

			expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("thumbnailsがない動画を処理する", async () => {
			const videoWithoutThumbnails: youtube_v3.Schema$Video = {
				id: "no-thumbnails-video",
				snippet: {
					title: "サムネイルなしの動画",
					publishedAt: "2023-01-01T00:00:00Z",
					description: "説明",
					// thumbnails がない
				},
				statistics: {
					viewCount: "1000",
					likeCount: "100",
				},
			};

			await youtubeFirestore.saveVideosToFirestore([videoWithoutThumbnails]);

			expect(firestore.default.batch().set).toHaveBeenCalledTimes(1);
			expect(firestore.default.batch().commit).toHaveBeenCalledTimes(1);
		});

		it("Firestoreエラーが発生した場合の処理", async () => {
			// バッチコミットでエラーを発生させる
			const mockBatch = firestore.default.batch();
			vi.mocked(mockBatch.commit).mockRejectedValue(new Error("Firestore commit error"));

			const result = await youtubeFirestore.saveVideosToFirestore([mockVideoWithAllData]);

			// エラーが発生してもPromiseはresolveし、保存された動画数を返す
			expect(result).toBe(1);

			// エラーログが出力されることを確認
			expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
				expect.stringContaining("Firestoreバッチコミット中にエラーが発生しました"),
				expect.any(Error),
			);
		});
	});

	describe("convertVideoDataForFirestore - contentDetails", () => {
		it("contentDetailsがある動画を正しく変換できる", () => {
			const videoWithContentDetails: youtube_v3.Schema$Video = {
				id: "content-details-video",
				snippet: {
					title: "コンテンツ詳細テスト",
					publishedAt: "2023-01-01T00:00:00Z",
				},
				contentDetails: {
					duration: "PT10M30S",
					dimension: "2d",
					definition: "hd",
					caption: "true",
					licensedContent: true,
					contentRating: {
						ytRating: "ytAgeRestricted",
						mpaaRating: "mpaaR",
					},
					regionRestriction: {
						allowed: ["US", "CA"],
						blocked: ["CN"],
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithContentDetails);

			expect(result).not.toBeNull();
			expect(result).toMatchObject({
				duration: "PT10M30S",
				dimension: "2d",
				definition: "hd",
				caption: true,
				licensedContent: true,
				contentRating: {
					ytRating: "ytAgeRestricted",
					mpaaRating: "mpaaR",
				},
				regionRestriction: {
					allowed: ["US", "CA"],
					blocked: ["CN"],
				},
			});
		});

		it("部分的なcontentDetailsを持つ動画を変換できる", () => {
			const videoWithPartialContentDetails: youtube_v3.Schema$Video = {
				id: "partial-content-video",
				snippet: {
					title: "部分コンテンツ詳細テスト",
				},
				contentDetails: {
					duration: "PT5M15S",
					caption: "false",
					licensedContent: false,
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithPartialContentDetails);

			expect(result).not.toBeNull();
			expect(result).toMatchObject({
				duration: "PT5M15S",
				caption: false,
				licensedContent: false,
			});
			expect(result?.dimension).toBeUndefined();
			expect(result?.definition).toBeUndefined();
		});

		it("regionRestrictionの各パターンを正しく処理できる", () => {
			const videoWithAllowedOnly: youtube_v3.Schema$Video = {
				id: "allowed-only-video",
				snippet: { title: "許可リストのみ" },
				contentDetails: {
					regionRestriction: {
						allowed: ["JP", "US"],
					},
				},
			};

			const videoWithBlockedOnly: youtube_v3.Schema$Video = {
				id: "blocked-only-video",
				snippet: { title: "ブロックリストのみ" },
				contentDetails: {
					regionRestriction: {
						blocked: ["CN", "RU"],
					},
				},
			};

			const videoWithEmptyRestriction: youtube_v3.Schema$Video = {
				id: "empty-restriction-video",
				snippet: { title: "空の制限" },
				contentDetails: {
					regionRestriction: {
						allowed: [],
						blocked: [],
					},
				},
			};

			const result1 = youtubeFirestore.convertVideoDataForFirestore(videoWithAllowedOnly);
			const result2 = youtubeFirestore.convertVideoDataForFirestore(videoWithBlockedOnly);
			const result3 = youtubeFirestore.convertVideoDataForFirestore(videoWithEmptyRestriction);

			expect(result1?.regionRestriction).toEqual({
				allowed: ["JP", "US"],
			});
			expect(result2?.regionRestriction).toEqual({
				blocked: ["CN", "RU"],
			});
			expect(result3?.regionRestriction).toBeUndefined();
		});
	});

	describe("convertVideoDataForFirestore - liveStreamingDetails", () => {
		it("ライブストリーミング詳細を正しく変換できる", () => {
			const liveVideoWithDetails: youtube_v3.Schema$Video = {
				id: "live-details-video",
				snippet: {
					title: "ライブ詳細テスト",
					liveBroadcastContent: "live",
				},
				liveStreamingDetails: {
					scheduledStartTime: "2023-12-01T20:00:00Z",
					scheduledEndTime: "2023-12-01T22:00:00Z",
					actualStartTime: "2023-12-01T20:05:00Z",
					actualEndTime: "2023-12-01T21:55:00Z",
					concurrentViewers: "1500",
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(liveVideoWithDetails);

			expect(result).not.toBeNull();
			expect(result?.liveStreamingDetails).toBeDefined();
			expect(result?.liveStreamingDetails?.concurrentViewers).toBe(1500);
		});

		it("部分的なライブストリーミング詳細を処理できる", () => {
			const partialLiveVideo: youtube_v3.Schema$Video = {
				id: "partial-live-video",
				snippet: {
					title: "部分ライブ詳細テスト",
					liveBroadcastContent: "upcoming",
				},
				liveStreamingDetails: {
					scheduledStartTime: "2023-12-01T20:00:00Z",
					// その他のフィールドは未設定
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(partialLiveVideo);

			expect(result).not.toBeNull();
			expect(result?.liveStreamingDetails?.scheduledStartTime).toBeDefined();
			expect(result?.liveStreamingDetails?.actualStartTime).toBeUndefined();
		});
	});

	describe("convertVideoDataForFirestore - topicDetails", () => {
		it("トピック詳細を正しく変換できる", () => {
			const videoWithTopics: youtube_v3.Schema$Video = {
				id: "topic-video",
				snippet: {
					title: "トピック詳細テスト",
				},
				topicDetails: {
					topicCategories: [
						"https://en.wikipedia.org/wiki/Music",
						"https://en.wikipedia.org/wiki/Entertainment",
					],
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithTopics);

			expect(result).not.toBeNull();
			expect(result?.topicDetails?.topicCategories).toEqual([
				"https://en.wikipedia.org/wiki/Music",
				"https://en.wikipedia.org/wiki/Entertainment",
			]);
		});
	});

	describe("convertVideoDataForFirestore - status", () => {
		it("ステータス情報を正しく変換できる", () => {
			const videoWithStatus: youtube_v3.Schema$Video = {
				id: "status-video",
				snippet: {
					title: "ステータステスト",
				},
				status: {
					uploadStatus: "processed",
					privacyStatus: "public",
					license: "youtube",
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithStatus);

			expect(result).not.toBeNull();
			expect(result?.status).toEqual({
				uploadStatus: "processed",
				privacyStatus: "public",
				commentStatus: "youtube", // licenseがcommentStatusにマップされる
			});
		});
	});

	describe("convertVideoDataForFirestore - recordingDetails", () => {
		it("録画詳細を正しく変換できる", () => {
			const videoWithRecording: youtube_v3.Schema$Video = {
				id: "recording-video",
				snippet: {
					title: "録画詳細テスト",
				},
				recordingDetails: {
					locationDescription: "Tokyo, Japan",
					recordingDate: "2023-06-01T15:30:00Z",
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithRecording);

			expect(result).not.toBeNull();
			expect(result?.recordingDetails?.locationDescription).toBe("Tokyo, Japan");
			expect(result?.recordingDetails?.recordingDate).toBeDefined();
		});
	});

	describe("convertVideoDataForFirestore - snippetの追加フィールド", () => {
		it("categoryIdとtagsを正しく変換できる", () => {
			const videoWithExtraSnippet: youtube_v3.Schema$Video = {
				id: "extra-snippet-video",
				snippet: {
					title: "拡張スニペットテスト",
					categoryId: "10", // Music category
					tags: ["music", "rock", "guitar"],
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithExtraSnippet);

			expect(result).not.toBeNull();
			expect(result?.categoryId).toBe("10");
			expect(result?.tags).toEqual(["music", "rock", "guitar"]);
		});
	});

	describe("getBestThumbnailUrl function", () => {
		it("maxresサムネイルを優先して選択する", () => {
			const videoWithMaxres: youtube_v3.Schema$Video = {
				id: "maxres-video",
				snippet: {
					title: "Maxresサムネイルテスト",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
						medium: { url: "https://example.com/medium.jpg" },
						high: { url: "https://example.com/high.jpg" },
						standard: { url: "https://example.com/standard.jpg" },
						maxres: { url: "https://example.com/maxres.jpg" },
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithMaxres);

			expect(result?.thumbnailUrl).toBe("https://example.com/maxres.jpg");
		});

		it("maxresがない場合はstandardを選択する", () => {
			const videoWithoutMaxres: youtube_v3.Schema$Video = {
				id: "no-maxres-video",
				snippet: {
					title: "Maxresなしサムネイルテスト",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
						medium: { url: "https://example.com/medium.jpg" },
						high: { url: "https://example.com/high.jpg" },
						standard: { url: "https://example.com/standard.jpg" },
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithoutMaxres);

			expect(result?.thumbnailUrl).toBe("https://example.com/standard.jpg");
		});

		it("高品質サムネイルがない場合はhighを選択する", () => {
			const videoWithHighOnly: youtube_v3.Schema$Video = {
				id: "high-only-video",
				snippet: {
					title: "High品質のみサムネイルテスト",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
						medium: { url: "https://example.com/medium.jpg" },
						high: { url: "https://example.com/high.jpg" },
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithHighOnly);

			expect(result?.thumbnailUrl).toBe("https://example.com/high.jpg");
		});

		it("defaultサムネイルのみの場合はdefaultを選択する", () => {
			const videoWithDefaultOnly: youtube_v3.Schema$Video = {
				id: "default-only-video",
				snippet: {
					title: "Defaultのみサムネイルテスト",
					thumbnails: {
						default: { url: "https://example.com/default.jpg" },
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithDefaultOnly);

			expect(result?.thumbnailUrl).toBe("https://example.com/default.jpg");
		});
	});

	describe("統計情報の数値変換", () => {
		it("統計情報の文字列を数値に正しく変換できる", () => {
			const videoWithStringStats: youtube_v3.Schema$Video = {
				id: "string-stats-video",
				snippet: {
					title: "文字列統計テスト",
				},
				statistics: {
					viewCount: "123456",
					likeCount: "7890",
					commentCount: "234",
					favoriteCount: "567",
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithStringStats);

			expect(result?.statistics).toEqual({
				viewCount: 123456,
				likeCount: 7890,
				commentCount: 234,
				favoriteCount: 567,
			});
		});

		it("無効な数値文字列の場合は0にフォールバックする", () => {
			const videoWithInvalidStats: youtube_v3.Schema$Video = {
				id: "invalid-stats-video",
				snippet: {
					title: "無効統計テスト",
				},
				statistics: {
					viewCount: "invalid",
					likeCount: "",
					commentCount: undefined as any,
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithInvalidStats);

			expect(result?.statistics).toEqual({
				viewCount: 0,
				likeCount: 0,
				commentCount: 0,
				favoriteCount: 0,
			});
		});
	});

	describe("contentRatingのフィルタリング", () => {
		it("非文字列値をcontentRatingから除外する", () => {
			const videoWithMixedRating: youtube_v3.Schema$Video = {
				id: "mixed-rating-video",
				snippet: {
					title: "混合レーティングテスト",
				},
				contentDetails: {
					contentRating: {
						ytRating: "ytAgeRestricted",
						mpaaRating: "mpaaR",
						...({
							invalidField: 123,
							nullField: null,
							undefinedField: undefined,
						} as any),
					},
				},
			};

			const result = youtubeFirestore.convertVideoDataForFirestore(videoWithMixedRating);

			expect(result?.contentRating).toEqual({
				ytRating: "ytAgeRestricted",
				mpaaRating: "mpaaR",
			});
			expect(result?.contentRating).not.toHaveProperty("invalidField");
			expect(result?.contentRating).not.toHaveProperty("nullField");
			expect(result?.contentRating).not.toHaveProperty("undefinedField");
		});
	});
});
