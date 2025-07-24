import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLikeDislikeStatusAction, toggleDislikeAction } from "../dislikes";

// モックの設定
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => ({
		collection: vi.fn(() => ({
			doc: vi.fn(() => ({
				collection: vi.fn(() => ({
					doc: vi.fn(() => ({
						get: vi.fn(),
						set: vi.fn(),
						delete: vi.fn(),
					})),
				})),
				get: vi.fn(),
			})),
		})),
		runTransaction: vi.fn(),
	})),
}));

vi.mock("@/app/buttons/actions", () => ({
	incrementDislikeCount: vi.fn(),
	decrementDislikeCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("@/components/system/protected-route", () => ({
	requireAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const mockRequireAuth = vi.mocked(await import("@/components/system/protected-route")).requireAuth;
const mockIncrementDislikeCount = vi.mocked(
	await import("@/app/buttons/actions"),
).incrementDislikeCount;
const _mockDecrementDislikeCount = vi.mocked(
	await import("@/app/buttons/actions"),
).decrementDislikeCount;

describe("dislikes actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("toggleDislikeAction", () => {
		it("認証されていない場合はエラーが返される", async () => {
			mockRequireAuth.mockRejectedValue(new Error("認証が必要です"));

			const result = await toggleDislikeAction("test-id");

			expect(result).toEqual({
				success: false,
				error: "低評価状態の更新に失敗しました",
			});
		});

		it("有効なユーザーがトグルできる", async () => {
			const mockUser = {
				discordId: "123456789012345678",
				name: "Test User",
				email: "test@example.com",
				image: null,
			};

			mockRequireAuth.mockResolvedValue(mockUser);
			mockIncrementDislikeCount.mockResolvedValue({ success: true });

			// Firestoreのモックを設定
			const mockFirestore = await import("@/lib/firestore");
			const getFirestore = vi.mocked(mockFirestore.getFirestore);
			const mockDoc = {
				get: vi.fn().mockResolvedValue({ exists: false }),
				set: vi.fn(),
				delete: vi.fn(),
			};
			const mockTransaction = {
				set: vi.fn(),
				delete: vi.fn(),
			};

			getFirestore.mockReturnValue({
				collection: vi.fn(() => ({
					doc: vi.fn(() => ({
						collection: vi.fn(() => ({
							doc: vi.fn(() => mockDoc),
						})),
					})),
				})),
				runTransaction: vi.fn((callback) => callback(mockTransaction)),
			} as any);

			const result = await toggleDislikeAction("test-id");

			expect(result.success).toBe(true);
			expect(result.isDisliked).toBe(true);
		});
	});

	describe("getLikeDislikeStatusAction", () => {
		it("認証されていない場合は空のMapが返される", async () => {
			mockRequireAuth.mockRejectedValue(new Error("認証が必要です"));

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
			};

			mockRequireAuth.mockResolvedValue(mockUser);

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
			} as any);

			const result = await getLikeDislikeStatusAction(["test-id"]);

			expect(result).toBeInstanceOf(Map);
			expect(result.get("test-id")).toEqual({
				isLiked: false,
				isDisliked: true,
			});
		});
	});
});
