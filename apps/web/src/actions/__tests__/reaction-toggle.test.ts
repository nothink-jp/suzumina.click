import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
vi.mock("@/components/system/protected-route", () => ({ requireAuth: mockRequireAuth }));

const mockGetFirestore = vi.fn();
vi.mock("@/lib/firestore", () => ({ getFirestore: mockGetFirestore }));

const mockUpdateCounter = vi.fn();
vi.mock("@/lib/firestore-helpers", () => ({ updateCounter: mockUpdateCounter }));

vi.mock("@/lib/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const { toggleReaction } = await import("../reaction-toggle");

function setupFirestore({
	likeExists,
	dislikeExists,
}: {
	likeExists: boolean;
	dislikeExists: boolean;
}) {
	const tx = { set: vi.fn(), delete: vi.fn() };
	const likeRef = { get: vi.fn().mockResolvedValue({ exists: likeExists }) };
	const dislikeRef = { get: vi.fn().mockResolvedValue({ exists: dislikeExists }) };
	mockGetFirestore.mockReturnValue({
		collection: () => ({
			doc: () => ({
				collection: (name: string) => ({
					doc: () => (name === "likes" ? likeRef : dislikeRef),
				}),
			}),
		}),
		runTransaction: (cb: (t: typeof tx) => unknown) => Promise.resolve(cb(tx)),
	});
	return { tx };
}

describe("toggleReaction (SPR-192)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAuth.mockResolvedValue({ discordId: "u1" });
		mockUpdateCounter.mockResolvedValue({ success: true });
	});

	it("like: 未likeなら追加し likeCount を +1（updateCounter 直叩き）", async () => {
		const { tx } = setupFirestore({ likeExists: false, dislikeExists: false });
		const result = await toggleReaction("ab1", "like");
		expect(tx.set).toHaveBeenCalled();
		expect(mockUpdateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.likeCount", 1, {
			min: 0,
		});
		expect(result).toEqual({ success: true, active: true });
	});

	it("like: 既likeなら削除し likeCount を -1", async () => {
		const { tx } = setupFirestore({ likeExists: true, dislikeExists: false });
		const result = await toggleReaction("ab1", "like");
		expect(tx.delete).toHaveBeenCalled();
		expect(mockUpdateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.likeCount", -1, {
			min: 0,
		});
		expect(result.active).toBe(false);
	});

	it("相互排他: like 追加時に dislike があれば dislike も -1 する", async () => {
		setupFirestore({ likeExists: false, dislikeExists: true });
		await toggleReaction("ab1", "like");
		expect(mockUpdateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.likeCount", 1, {
			min: 0,
		});
		expect(mockUpdateCounter).toHaveBeenCalledWith(
			"audioButtons",
			"ab1",
			"stats.dislikeCount",
			-1,
			{
				min: 0,
			},
		);
	});

	it("dislike も対称に動く", async () => {
		setupFirestore({ likeExists: false, dislikeExists: false });
		await toggleReaction("ab1", "dislike");
		expect(mockUpdateCounter).toHaveBeenCalledWith("audioButtons", "ab1", "stats.dislikeCount", 1, {
			min: 0,
		});
	});

	it("未認証はエラーを返す", async () => {
		mockRequireAuth.mockRejectedValue(new Error("unauth"));
		const result = await toggleReaction("ab1", "like");
		expect(result).toEqual({ success: false, error: "いいね状態の更新に失敗しました" });
	});
});
