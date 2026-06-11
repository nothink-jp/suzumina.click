import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLikeDislikeStatusAction, toggleDislikeAction } from "../dislikes";

// toggleDislikeAction は reaction-toggle の toggleReaction への薄い委譲（SPR-192）
const { mockToggleReaction } = vi.hoisted(() => ({ mockToggleReaction: vi.fn() }));
vi.mock("../reaction-toggle", () => ({ toggleReaction: mockToggleReaction }));

vi.mock("@/lib/firestore", () => ({ getFirestore: vi.fn() }));

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(await import("@/lib/auth/server")).getCurrentUser;

describe("dislikes actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("toggleDislikeAction（reaction-toggle への委譲）", () => {
		it("toggleReaction(id, 'dislike') に委譲し active を isDisliked にマップする", async () => {
			mockToggleReaction.mockResolvedValue({ success: true, active: true });

			const result = await toggleDislikeAction("test-id");

			expect(mockToggleReaction).toHaveBeenCalledWith("test-id", "dislike");
			expect(result).toEqual({ success: true, isDisliked: true, error: undefined });
		});

		it("失敗時は error を透過する", async () => {
			mockToggleReaction.mockResolvedValue({
				success: false,
				error: "低評価状態の更新に失敗しました",
			});

			const result = await toggleDislikeAction("test-id");

			expect(result).toEqual({
				success: false,
				isDisliked: undefined,
				error: "低評価状態の更新に失敗しました",
			});
		});
	});

	describe("getLikeDislikeStatusAction", () => {
		it("未認証（getCurrentUser が null）は空の Map を返す（redirect しない・SPR-195）", async () => {
			mockGetCurrentUser.mockResolvedValue(null);

			const result = await getLikeDislikeStatusAction(["test-id"]);

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it("認証されている場合はステータスが返される", async () => {
			const mockUser = {
				discordId: "123456789012345678",
				name: "Test User",
				email: "test@example.com",
				image: null,
				isActive: true,
			};

			mockGetCurrentUser.mockResolvedValue(mockUser as never);

			// Firestoreのモックを設定
			const mockFirestore = await import("@/lib/firestore");
			const getFirestore = vi.mocked(mockFirestore.getFirestore);
			const mockLikeDoc = { exists: false };
			const mockDislikeDoc = { exists: true };

			getFirestore.mockReturnValue({
				collection: vi.fn(() => ({
					doc: vi.fn(() => ({
						collection: vi.fn((name) => ({
							doc: vi.fn(() => ({
								get: vi.fn().mockResolvedValue(name === "likes" ? mockLikeDoc : mockDislikeDoc),
							})),
						})),
					})),
				})),
			} as never);

			const result = await getLikeDislikeStatusAction(["test-id"]);

			expect(result).toBeInstanceOf(Map);
			expect(result.get("test-id")).toEqual({
				isLiked: false,
				isDisliked: true,
			});
		});
	});
});
