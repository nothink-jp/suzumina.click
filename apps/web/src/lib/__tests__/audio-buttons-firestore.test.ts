import type { AudioButtonDocument } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertToAudioButtonPlainObject,
	getAudioButtonsByUser,
	getPublicAudioButtonStartTimesByVideo,
	getUserPublicAudioButtonStats,
} from "../audio-buttons-firestore";
import { getFirestore } from "../firestore";

// Firestoreモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../firestore", () => ({
	getFirestore: vi.fn(),
}));

// @google-cloud/firestore の FieldValue は firestore インスタンスに含まれる

describe("audio-buttons-firestore", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Firestoreインスタンスのモック設定
		const mockFirestore = {
			collection: mockCollection,
			FieldValue: {
				increment: vi.fn((value: number) => ({ operand: value })),
			},
		};

		vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

		// チェーンメソッドのセットアップ
		mockCollection.mockReturnValue({
			where: mockWhere,
			doc: mockDoc,
		});

		mockWhere.mockReturnValue({
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			get: mockGet,
		});

		mockOrderBy.mockReturnValue({
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			get: mockGet,
		});

		mockLimit.mockReturnValue({
			get: mockGet,
		});

		mockDoc.mockReturnValue({
			update: mockUpdate,
		});
	});

	describe("convertToAudioButtonPlainObject", () => {
		it("should convert Firestore data to frontend format", () => {
			const mockFirestoreData: AudioButtonDocument & { id: string } = {
				id: "test-button-1",
				buttonText: "テスト音声ボタン",
				tags: ["テスト", "音声"],
				videoId: "test-video-123",
				videoTitle: "テスト動画",
				startTime: 10,
				endTime: 25,
				duration: 15,
				creatorId: "discord-user-123",
				creatorName: "テストユーザー",
				isPublic: true,
				stats: {
					playCount: 100,
					likeCount: 50,
					dislikeCount: 0,
					favoriteCount: 25,
					engagementRate: 0.5,
				},
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(mockFirestoreData);

			expect(result).toMatchObject({
				id: "test-button-1",
				buttonText: "テスト音声ボタン",
				tags: ["テスト", "音声"],
				videoId: "test-video-123",
				videoTitle: "テスト動画",
				videoThumbnailUrl: "https://img.youtube.com/vi/test-video-123/maxresdefault.jpg",
				startTime: 10,
				endTime: 25,
				duration: 15,
				creatorId: "discord-user-123",
				creatorName: "テストユーザー",
				isPublic: true,
				stats: {
					playCount: 100,
					likeCount: 50,
					dislikeCount: 0,
					favoriteCount: 25,
					engagementRate: 0.5,
				},
			});

			expect(result._computed).toBeDefined();
			expect(result._computed.durationText).toBe("15秒"); // 25-10=15秒
			expect(result._computed.relativeTimeText).toBeDefined();
		});

		it("should handle duration formatting correctly", () => {
			const shortDurationData: AudioButtonDocument & { id: string } = {
				id: "short-button",
				buttonText: "短い音声",
				tags: [],
				videoId: "video-123",
				videoTitle: "動画",
				startTime: 0,
				endTime: 5,
				duration: 5,
				creatorId: "user-123",
				creatorName: "ユーザー",
				isPublic: true,
				stats: {
					playCount: 0,
					likeCount: 0,
					dislikeCount: 0,
					favoriteCount: 0,
					engagementRate: 0,
				},
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(shortDurationData);
			expect(result._computed.durationText).toBe("5秒");
		});

		it("should handle equal start and end time", () => {
			const equalTimeData: AudioButtonDocument & { id: string } = {
				id: "equal-time-button",
				buttonText: "同じ開始終了時間",
				tags: [],
				videoId: "video-123",
				videoTitle: "動画",
				startTime: 10,
				endTime: 10, // Same as startTime
				duration: 0,
				creatorId: "user-123",
				creatorName: "ユーザー",
				isPublic: true,
				stats: {
					playCount: 0,
					likeCount: 0,
					dislikeCount: 0,
					favoriteCount: 0,
					engagementRate: 0,
				},
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(equalTimeData);
			expect(result._computed.durationText).toBe("再生");
		});

		it("should handle missing favoriteCount", () => {
			const noFavoriteCountData: AudioButtonDocument & { id: string } = {
				id: "no-favorite-button",
				buttonText: "お気に入り数なし",
				tags: [],
				videoId: "video-123",
				videoTitle: "動画",
				startTime: 0,
				endTime: 10,
				duration: 10,
				creatorId: "user-123",
				creatorName: "ユーザー",
				isPublic: true,
				stats: {
					playCount: 0,
					likeCount: 0,
					dislikeCount: 0,
					favoriteCount: 0,
					engagementRate: 0,
				},
				createdAt: "2025-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			};

			const result = convertToAudioButtonPlainObject(noFavoriteCountData);
			expect(result.stats.favoriteCount).toBe(0);
		});
	});

	describe("getAudioButtonsByUser", () => {
		const doc = (id: string, isPublic: boolean, createdAt = "2025-01-01T00:00:00.000Z") => ({
			id,
			data: () => ({
				buttonText: id,
				tags: [],
				videoId: "video-1",
				videoTitle: "動画1",
				startTime: 0,
				endTime: 10,
				creatorId: "user-123",
				creatorName: "ユーザー",
				isPublic,
				stats: {
					playCount: 0,
					likeCount: 0,
					dislikeCount: 0,
					favoriteCount: 0,
					engagementRate: 0,
				},
				createdAt,
				updatedAt: createdAt,
			}),
		});

		it("公開・新しい順・表示件数分の limit で Firestore に問い合わせる（SPR-380）", async () => {
			mockGet.mockResolvedValue({ docs: [doc("button-1", true)] });

			const result = await getAudioButtonsByUser("user-123");

			expect(mockCollection).toHaveBeenCalledWith("audioButtons");
			expect(mockWhere).toHaveBeenCalledWith("creatorId", "==", "user-123");
			expect(mockWhere).toHaveBeenCalledWith("isPublic", "==", true);
			expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
			// 読み捨て分を取らない（read は表示件数に比例）
			expect(mockLimit).toHaveBeenCalledWith(20);
			expect(result.map((b) => b.id)).toEqual(["button-1"]);
		});

		it("limit を指定するとその件数で問い合わせる", async () => {
			mockGet.mockResolvedValue({ docs: [] });

			await getAudioButtonsByUser("user-123", { limit: 5 });

			expect(mockLimit).toHaveBeenCalledWith(5);
		});

		it("onlyPublic: false を渡されても非公開ボタンを返さない（SPR-379）", async () => {
			mockGet.mockResolvedValue({ docs: [doc("public", true), doc("private", false)] });

			// 型に無いキーが混ざっても公開判定は外れない
			const result = await getAudioButtonsByUser("user-123", {
				onlyPublic: false,
			} as Parameters<typeof getAudioButtonsByUser>[1]);

			expect(result.map((b) => b.id)).toEqual(["public"]);
		});

		it("インデックス未作成時は全件取得にフォールバックし、公開だけを新しい順に limit 件返す", async () => {
			mockGet
				.mockRejectedValueOnce(
					Object.assign(new Error("9 FAILED_PRECONDITION: The query requires an index."), {
						code: 9,
					}),
				)
				.mockResolvedValueOnce({
					docs: [
						doc("old", true, "2025-01-01T00:00:00.000Z"),
						doc("private-newest", false, "2025-01-04T00:00:00.000Z"),
						doc("newest", true, "2025-01-03T00:00:00.000Z"),
						doc("middle", true, "2025-01-02T00:00:00.000Z"),
					],
				});

			const result = await getAudioButtonsByUser("user-123", { limit: 2 });

			expect(mockGet).toHaveBeenCalledTimes(2);
			expect(result.map((b) => b.id)).toEqual(["newest", "middle"]);
		});

		it("インデックス不足以外のエラー（UNAVAILABLE 等）では全件取得にフォールバックしない", async () => {
			mockGet.mockRejectedValueOnce(
				Object.assign(new Error("14 UNAVAILABLE: Connection dropped"), { code: 14 }),
			);

			await expect(getAudioButtonsByUser("user-123")).rejects.toThrow(
				"音声ボタン一覧の取得に失敗しました",
			);
			expect(mockGet).toHaveBeenCalledTimes(1);
		});

		it("フォールバックも失敗したらエラーを投げる", async () => {
			mockGet.mockRejectedValue(Object.assign(new Error("Firestore error"), { code: 9 }));

			await expect(getAudioButtonsByUser("user-123")).rejects.toThrow(
				"音声ボタン一覧の取得に失敗しました",
			);
		});
	});

	describe("getUserPublicAudioButtonStats", () => {
		const mockAggregate = vi.fn();
		const mockAggregateGet = vi.fn();

		beforeEach(() => {
			mockAggregate.mockReturnValue({ get: mockAggregateGet });
			mockWhere.mockReturnValue({
				where: mockWhere,
				orderBy: mockOrderBy,
				limit: mockLimit,
				aggregate: mockAggregate,
				get: mockGet,
			});
		});

		it("公開ボタンを count + sum で集計し、最高再生数は limit(1) で取る（SPR-381）", async () => {
			mockAggregateGet.mockResolvedValue({ data: () => ({ count: 30, totalPlays: 1200 }) });
			mockGet.mockResolvedValue({ docs: [{ data: () => ({ stats: { playCount: 300 } }) }] });

			const result = await getUserPublicAudioButtonStats("user-123");

			expect(mockWhere).toHaveBeenCalledWith("creatorId", "==", "user-123");
			expect(mockWhere).toHaveBeenCalledWith("isPublic", "==", true);
			expect(Object.keys(mockAggregate.mock.calls[0]![0])).toEqual(["count", "totalPlays"]);
			expect(mockOrderBy).toHaveBeenCalledWith("stats.playCount", "desc");
			expect(mockLimit).toHaveBeenCalledWith(1);
			expect(result).toEqual({ count: 30, totalPlays: 1200, maxPlays: 300 });
		});

		it("公開ボタンが無ければ最高再生数は 0", async () => {
			mockAggregateGet.mockResolvedValue({ data: () => ({ count: 0, totalPlays: 0 }) });
			mockGet.mockResolvedValue({ docs: [] });

			const result = await getUserPublicAudioButtonStats("user-123");

			expect(result).toEqual({ count: 0, totalPlays: 0, maxPlays: 0 });
		});

		it("インデックス未作成時は全件取得にフォールバックし、非公開を除いて計算する", async () => {
			mockAggregateGet.mockRejectedValueOnce(
				Object.assign(new Error("9 FAILED_PRECONDITION: The query requires an index."), {
					code: 9,
				}),
			);
			mockGet
				// 最高再生数クエリ（Promise.all で並行に投げられる）
				.mockResolvedValueOnce({ docs: [] })
				// フォールバックの全件取得
				.mockResolvedValueOnce({
					docs: [
						{ data: () => ({ isPublic: true, stats: { playCount: 100 } }) },
						{ data: () => ({ isPublic: false, stats: { playCount: 999 } }) },
						{ data: () => ({ isPublic: true, stats: { playCount: 25 } }) },
						{ data: () => ({ isPublic: true }) },
					],
				});

			const result = await getUserPublicAudioButtonStats("user-123");

			expect(result).toEqual({ count: 3, totalPlays: 125, maxPlays: 100 });
		});

		it("インデックス不足以外のエラーではフォールバックせずエラーを投げる", async () => {
			mockAggregateGet.mockRejectedValueOnce(
				Object.assign(new Error("14 UNAVAILABLE: Connection dropped"), { code: 14 }),
			);
			mockGet.mockResolvedValue({ docs: [] });

			await expect(getUserPublicAudioButtonStats("user-123")).rejects.toThrow(
				"音声ボタン統計の取得に失敗しました",
			);
			// 最高再生数クエリの 1 回だけで、全件取得は走らない
			expect(mockGet).toHaveBeenCalledTimes(1);
		});
	});

	describe("getPublicAudioButtonStartTimesByVideo", () => {
		const mockSelect = vi.fn();

		beforeEach(() => {
			mockSelect.mockReturnValue({ get: mockGet });
			mockWhere.mockReturnValue({ where: mockWhere, select: mockSelect, get: mockGet });
		});

		it("動画の公開ボタンの startTime だけを件数で打ち切らずに取る（SPR-378）", async () => {
			mockGet.mockResolvedValue({
				docs: [
					{ data: () => ({ startTime: 12.5 }) },
					{ data: () => ({ startTime: 3 }) },
					{ data: () => ({}) },
				],
			});

			const result = await getPublicAudioButtonStartTimesByVideo("video-1");

			expect(mockCollection).toHaveBeenCalledWith("audioButtons");
			expect(mockWhere).toHaveBeenCalledWith("videoId", "==", "video-1");
			expect(mockWhere).toHaveBeenCalledWith("isPublic", "==", true);
			expect(mockSelect).toHaveBeenCalledWith("startTime");
			expect(mockLimit).not.toHaveBeenCalled();
			expect(result).toEqual([12.5, 3]);
		});

		it("取得に失敗したらエラーを投げる", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			await expect(getPublicAudioButtonStartTimesByVideo("video-1")).rejects.toThrow(
				"音声ボタンの開始位置の取得に失敗しました",
			);
		});
	});
});
