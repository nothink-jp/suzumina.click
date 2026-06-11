import { beforeEach, describe, expect, it, vi } from "vitest";

// toggleLikeAction は reaction-toggle の toggleReaction への薄い委譲（SPR-192）
const { mockToggleReaction } = vi.hoisted(() => ({ mockToggleReaction: vi.fn() }));
vi.mock("../reaction-toggle", () => ({ toggleReaction: mockToggleReaction }));

const { toggleLikeAction } = await import("../likes");

describe("toggleLikeAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("toggleReaction(id, 'like') に委譲し active を isLiked にマップする", async () => {
		mockToggleReaction.mockResolvedValue({ success: true, active: true });

		const result = await toggleLikeAction("audio-1");

		expect(mockToggleReaction).toHaveBeenCalledWith("audio-1", "like");
		expect(result).toEqual({ success: true, isLiked: true, error: undefined });
	});

	it("失敗時は error を透過する", async () => {
		mockToggleReaction.mockResolvedValue({
			success: false,
			error: "いいね状態の更新に失敗しました",
		});

		const result = await toggleLikeAction("audio-1");

		expect(result).toEqual({
			success: false,
			isLiked: undefined,
			error: "いいね状態の更新に失敗しました",
		});
	});
});
