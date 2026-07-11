import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioButtonHeroState } from "../use-audio-button-hero-state";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSession = vi.hoisted(() => ({ current: null as { discordId: string } | null }));
vi.mock("@/lib/auth/client", () => ({
	useSession: () => mockSession.current,
}));

vi.mock("@/hooks/use-play-count", () => ({
	usePlayCount: () => ({ handlePlay: vi.fn(), cleanup: vi.fn() }),
}));

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

import { toggleFavoriteAction } from "@/actions/favorites";
import { toggleLikeAction } from "@/actions/likes";

const mockToggleFavorite = vi.mocked(toggleFavoriteAction);
const mockToggleLike = vi.mocked(toggleLikeAction);

const audioButton = {
	id: "btn1",
	buttonText: "テスト",
	stats: { playCount: 7, likeCount: 2, dislikeCount: 0, favoriteCount: 1, engagementRate: 0 },
	createdAt: "2026-06-26T00:00:00.000Z",
	startTime: 0,
	endTime: 3.4,
} as AudioButtonPlainObject;

describe("useAudioButtonHeroState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSession.current = { discordId: "user1" };
	});

	it("再生開始で playCount が楽観的に +1 される", () => {
		const { result } = renderHook(() => useAudioButtonHeroState(audioButton));

		expect(result.current.playCount).toBe(7);
		act(() => result.current.handlePlayStart());
		expect(result.current.playCount).toBe(8);
	});

	it("お気に入りトグル失敗時はロールバックされる", async () => {
		mockToggleFavorite.mockResolvedValue({ success: false, error: "失敗" });
		const { result } = renderHook(() => useAudioButtonHeroState(audioButton));

		act(() => result.current.toggleFavorite());
		// 楽観的更新で一旦 true
		expect(result.current.isFavorited).toBe(true);

		// 失敗後に元へ戻る
		await waitFor(() => expect(result.current.isFavorited).toBe(false));
	});

	it("お気に入りトグル成功時はサーバー確定値を反映する", async () => {
		mockToggleFavorite.mockResolvedValue({ success: true, isFavorited: true });
		const { result } = renderHook(() => useAudioButtonHeroState(audioButton));

		act(() => result.current.toggleFavorite());
		await waitFor(() => expect(result.current.isFavorited).toBe(true));
	});

	it("高評価トグル失敗時は isLiked と likeCount の両方がロールバックされる", async () => {
		mockToggleLike.mockResolvedValue({ success: false, error: "失敗" });
		const { result } = renderHook(() => useAudioButtonHeroState(audioButton));

		act(() => result.current.toggleLike());
		// 楽観的更新
		expect(result.current.isLiked).toBe(true);
		expect(result.current.likeCount).toBe(3);

		// ロールバック
		await waitFor(() => {
			expect(result.current.isLiked).toBe(false);
			expect(result.current.likeCount).toBe(2);
		});
	});

	it("未認証ではトグルせずアクションも呼ばない", () => {
		mockSession.current = null;
		const { result } = renderHook(() => useAudioButtonHeroState(audioButton));

		act(() => result.current.toggleFavorite());
		act(() => result.current.toggleLike());

		expect(result.current.isFavorited).toBe(false);
		expect(result.current.isLiked).toBe(false);
		expect(mockToggleFavorite).not.toHaveBeenCalled();
		expect(mockToggleLike).not.toHaveBeenCalled();
	});
});
