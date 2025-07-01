import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies first to avoid NextAuth issues
const mockRequireAuth = vi.fn();
const mockGetFirestore = vi.fn();
const mockIncrementLikeCount = vi.fn();
const mockDecrementLikeCount = vi.fn();

vi.mock("@/components/ProtectedRoute", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: mockGetFirestore,
}));

vi.mock("@/app/buttons/actions", () => ({
	incrementLikeCount: mockIncrementLikeCount,
	decrementLikeCount: mockDecrementLikeCount,
}));

vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

// Import after mocking
const { getLikesStatusAction, toggleLikeAction } = await import("./likes");

describe("likes actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getLikesStatusAction", () => {
		it("returns like status for authenticated user", async () => {
			const mockUser = { discordId: "user-1", displayName: "Test User", role: "member" };
			mockRequireAuth.mockResolvedValue(mockUser);

			const mockDoc = {
				exists: true,
			};
			const mockGet = vi.fn().mockResolvedValue(mockDoc);
			const mockCollection = vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					collection: vi.fn().mockReturnValue({
						doc: vi.fn().mockReturnValue({
							get: mockGet,
						}),
					}),
				}),
			});
			const mockFirestore = { collection: mockCollection };
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await getLikesStatusAction(["audio-1", "audio-2"]);

			expect(result.get("audio-1")).toBe(true);
			expect(result.get("audio-2")).toBe(true);
			expect(mockGet).toHaveBeenCalledTimes(2);
		});

		it("returns empty map for unauthenticated user", async () => {
			mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

			const result = await getLikesStatusAction(["audio-1"]);

			expect(result.size).toBe(0);
		});

		it("handles firestore errors gracefully", async () => {
			const mockUser = { discordId: "user-1", displayName: "Test User", role: "member" };
			mockRequireAuth.mockResolvedValue(mockUser);

			const mockGet = vi.fn().mockRejectedValue(new Error("Firestore error"));
			const mockCollection = vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					collection: vi.fn().mockReturnValue({
						doc: vi.fn().mockReturnValue({
							get: mockGet,
						}),
					}),
				}),
			});
			const mockFirestore = { collection: mockCollection };
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await getLikesStatusAction(["audio-1"]);

			expect(result.get("audio-1")).toBe(false);
		});
	});

	describe("toggleLikeAction", () => {
		it("adds like when not currently liked", async () => {
			const mockUser = { discordId: "user-1", displayName: "Test User", role: "member" };
			mockRequireAuth.mockResolvedValue(mockUser);

			const mockDoc = { exists: false };
			const mockGet = vi.fn().mockResolvedValue(mockDoc);
			const mockSet = vi.fn();
			const mockDelete = vi.fn();
			const mockUserLikeRef = { get: mockGet, set: mockSet, delete: mockDelete };

			const mockTransaction = vi.fn((callback) =>
				callback({
					set: mockSet,
					delete: mockDelete,
				}),
			);
			const mockRunTransaction = vi.fn().mockImplementation(mockTransaction);

			const mockCollection = vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					collection: vi.fn().mockReturnValue({
						doc: vi.fn().mockReturnValue(mockUserLikeRef),
					}),
				}),
			});
			const mockFirestore = {
				collection: mockCollection,
				runTransaction: mockRunTransaction,
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			mockIncrementLikeCount.mockResolvedValue({ success: true });

			const result = await toggleLikeAction("audio-1");

			expect(result.success).toBe(true);
			expect(result.isLiked).toBe(true);
			expect(mockSet).toHaveBeenCalled();
			expect(mockIncrementLikeCount).toHaveBeenCalledWith("audio-1");
		});

		it("removes like when currently liked", async () => {
			const mockUser = { discordId: "user-1", displayName: "Test User", role: "member" };
			mockRequireAuth.mockResolvedValue(mockUser);

			const mockDoc = { exists: true };
			const mockGet = vi.fn().mockResolvedValue(mockDoc);
			const mockSet = vi.fn();
			const mockDelete = vi.fn();
			const mockUserLikeRef = { get: mockGet, set: mockSet, delete: mockDelete };

			const mockTransaction = vi.fn((callback) =>
				callback({
					set: mockSet,
					delete: mockDelete,
				}),
			);
			const mockRunTransaction = vi.fn().mockImplementation(mockTransaction);

			const mockCollection = vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					collection: vi.fn().mockReturnValue({
						doc: vi.fn().mockReturnValue(mockUserLikeRef),
					}),
				}),
			});
			const mockFirestore = {
				collection: mockCollection,
				runTransaction: mockRunTransaction,
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			mockDecrementLikeCount.mockResolvedValue({ success: true });

			const result = await toggleLikeAction("audio-1");

			expect(result.success).toBe(true);
			expect(result.isLiked).toBe(false);
			expect(mockDelete).toHaveBeenCalled();
			expect(mockDecrementLikeCount).toHaveBeenCalledWith("audio-1");
		});

		it("handles unauthenticated user", async () => {
			mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

			const result = await toggleLikeAction("audio-1");

			expect(result.success).toBe(false);
			expect(result.error).toBe("いいね状態の更新に失敗しました");
		});

		it("handles firestore transaction errors", async () => {
			const mockUser = { discordId: "user-1", displayName: "Test User", role: "member" };
			mockRequireAuth.mockResolvedValue(mockUser);

			const mockDoc = { exists: false };
			const mockGet = vi.fn().mockResolvedValue(mockDoc);
			const mockUserLikeRef = { get: mockGet };

			const mockRunTransaction = vi.fn().mockRejectedValue(new Error("Transaction failed"));

			const mockCollection = vi.fn().mockReturnValue({
				doc: vi.fn().mockReturnValue({
					collection: vi.fn().mockReturnValue({
						doc: vi.fn().mockReturnValue(mockUserLikeRef),
					}),
				}),
			});
			const mockFirestore = {
				collection: mockCollection,
				runTransaction: mockRunTransaction,
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await toggleLikeAction("audio-1");

			expect(result.success).toBe(false);
			expect(result.error).toBe("いいね状態の更新に失敗しました");
		});
	});
});
