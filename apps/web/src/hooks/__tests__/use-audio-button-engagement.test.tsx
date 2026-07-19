/**
 * @vitest-environment happy-dom
 */

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import { getFavoritesStatusAction } from "@/actions/favorites";
import { mockUseSession } from "@/test-utils/auth";
import { useAudioButtonEngagement } from "../use-audio-button-engagement";

vi.mock("@/lib/auth/client");
vi.mock("@/actions/favorites", () => ({
	getFavoritesStatusAction: vi.fn().mockResolvedValue(new Map()),
	toggleFavoriteAction: vi.fn(),
}));
vi.mock("@/actions/dislikes", () => ({
	getLikeDislikeStatusAction: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/actions/likes", () => ({
	toggleLikeAction: vi.fn(),
}));
vi.mock("@/lib/analytics/events", () => ({
	trackFavoriteToggle: vi.fn(),
}));

const audioButton = {
	id: "ab1",
	buttonText: "テスト",
	stats: { playCount: 0, likeCount: 2, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
} as AudioButtonPlainObject;

describe("useAudioButtonEngagement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("初期値なし + 認証済みなら自己取得する（契約の正本・AIレビュー #824 対応の退行防止）", async () => {
		mockUseSession({ discordId: "u1" });
		vi.mocked(getFavoritesStatusAction).mockResolvedValue(new Map([["ab1", true]]));
		vi.mocked(getLikeDislikeStatusAction).mockResolvedValue(
			new Map([["ab1", { isLiked: true, isDisliked: false }]]),
		);

		const { result } = renderHook(() => useAudioButtonEngagement(audioButton));

		await waitFor(() => {
			expect(result.current.isFavorited).toBe(true);
			expect(result.current.isLiked).toBe(true);
		});
		expect(getFavoritesStatusAction).toHaveBeenCalledWith(["ab1"]);
		expect(getLikeDislikeStatusAction).toHaveBeenCalledWith(["ab1"]);
	});

	it("初期値が両方渡されたら自己取得しない（一覧の一括取得経路）", async () => {
		mockUseSession({ discordId: "u1" });

		const { result } = renderHook(() =>
			useAudioButtonEngagement(audioButton, { initialIsFavorited: true, initialIsLiked: false }),
		);

		expect(result.current.isFavorited).toBe(true);
		expect(result.current.isLiked).toBe(false);
		await new Promise((r) => setTimeout(r, 0));
		expect(getFavoritesStatusAction).not.toHaveBeenCalled();
		expect(getLikeDislikeStatusAction).not.toHaveBeenCalled();
	});

	it("片方だけ初期値があれば、無い方だけ自己取得する", async () => {
		mockUseSession({ discordId: "u1" });
		vi.mocked(getFavoritesStatusAction).mockResolvedValue(new Map([["ab1", true]]));

		const { result } = renderHook(() =>
			useAudioButtonEngagement(audioButton, { initialIsLiked: true }),
		);

		await waitFor(() => {
			expect(result.current.isFavorited).toBe(true);
		});
		expect(getFavoritesStatusAction).toHaveBeenCalledTimes(1);
		expect(getLikeDislikeStatusAction).not.toHaveBeenCalled();
	});

	it("未認証なら自己取得しない", async () => {
		mockUseSession(null);

		renderHook(() => useAudioButtonEngagement(audioButton));

		await new Promise((r) => setTimeout(r, 0));
		expect(getFavoritesStatusAction).not.toHaveBeenCalled();
		expect(getLikeDislikeStatusAction).not.toHaveBeenCalled();
	});
});
