import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFavoritesList } from "../actions";

vi.mock("@/lib/favorites-firestore", () => ({
	getUserFavoritesCount: vi.fn(),
	getUserFavorites: vi.fn(),
	getAudioButtonsFromFavorites: vi.fn(),
}));

vi.mock("@/actions/dislikes", () => ({
	getLikeDislikeStatusAction: vi.fn(),
}));

vi.mock("@suzumina.click/shared-types", () => ({
	AudioButton: {
		fromFirestoreData: vi.fn(),
	},
}));

describe("getFavoritesList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("正常にお気に入り音声ボタンを取得できる", async () => {
		const mockUserId = "test-user-id";
		const mockAudioButtonId = "test-button-id";
		const mockAudioButton = {
			id: { toString: () => mockAudioButtonId },
			toPlainObject: () => ({
				id: mockAudioButtonId,
				title: "Test Button",
				playCount: 10,
			}),
		};

		const { getUserFavoritesCount, getUserFavorites, getAudioButtonsFromFavorites } = await import(
			"@/lib/favorites-firestore"
		);
		const { getLikeDislikeStatusAction } = await import("@/actions/dislikes");
		const { AudioButton } = await import("@suzumina.click/shared-types");

		vi.mocked(getUserFavoritesCount).mockResolvedValue(1);
		vi.mocked(getUserFavorites).mockResolvedValue({
			favorites: [{ audioButtonId: mockAudioButtonId, addedAt: "2024-01-01" }],
			hasMore: false,
		});
		vi.mocked(getAudioButtonsFromFavorites).mockResolvedValue(
			new Map([[mockAudioButtonId, { id: mockAudioButtonId }]]),
		);
		vi.mocked(AudioButton.fromFirestoreData).mockReturnValue(mockAudioButton);
		vi.mocked(getLikeDislikeStatusAction).mockResolvedValue([
			[mockAudioButtonId, { isLiked: true, isDisliked: false }],
		]);

		const result = await getFavoritesList({
			userId: mockUserId,
			page: 1,
			limit: 20,
			sort: "newest",
		});

		expect(result).toEqual({
			audioButtons: [
				{
					id: mockAudioButtonId,
					title: "Test Button",
					playCount: 10,
				},
			],
			totalCount: 1,
			hasMore: false,
			likeDislikeStatuses: {
				[mockAudioButtonId]: { isLiked: true, isDisliked: false },
			},
		});
	});

	it("エラーが発生した場合はデフォルト値を返す", async () => {
		const { getUserFavoritesCount } = await import("@/lib/favorites-firestore");
		vi.mocked(getUserFavoritesCount).mockRejectedValue(new Error("Test error"));

		const result = await getFavoritesList({
			userId: "test-user-id",
		});

		expect(result).toEqual({
			audioButtons: [],
			totalCount: 0,
			likeDislikeStatuses: {},
		});
	});

	it("音声ボタンが見つからない場合は空の配列を返す", async () => {
		const { getUserFavoritesCount, getUserFavorites, getAudioButtonsFromFavorites } = await import(
			"@/lib/favorites-firestore"
		);
		const { AudioButton } = await import("@suzumina.click/shared-types");

		vi.mocked(getUserFavoritesCount).mockResolvedValue(1);
		vi.mocked(getUserFavorites).mockResolvedValue({
			favorites: [{ audioButtonId: "missing-button", addedAt: "2024-01-01" }],
			hasMore: false,
		});
		vi.mocked(getAudioButtonsFromFavorites).mockResolvedValue(new Map());
		vi.mocked(AudioButton.fromFirestoreData).mockReturnValue(null);

		const result = await getFavoritesList({
			userId: "test-user-id",
		});

		expect(result.audioButtons).toEqual([]);
		expect(result.likeDislikeStatuses).toEqual({});
	});
});
