import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadYouTubeIframeAPI } from "../youtube-api-loader";

// window.YT / onYouTubeIframeAPIReady の型は youtube-types.ts でグローバル宣言済み。
// テストでの差し替えは緩い別名経由で行う（再宣言による型衝突を避ける）。
const w = window as unknown as {
	YT?: { Player?: unknown };
	onYouTubeIframeAPIReady?: () => void;
};

describe("loadYouTubeIframeAPI (SPR-188)", () => {
	beforeEach(() => {
		// 各テストで API 未ロード状態に戻す
		w.YT = undefined;
		w.onYouTubeIframeAPIReady = undefined;
		for (const el of document.querySelectorAll('script[src*="youtube.com/iframe_api"]')) {
			el.remove();
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("API が既に準備済みなら onReady を即時実行する", () => {
		w.YT = { Player: () => {} };
		const onReady = vi.fn();
		loadYouTubeIframeAPI(onReady);
		expect(onReady).toHaveBeenCalledTimes(1);
	});

	it("読み込み中は既存の onYouTubeIframeAPIReady をチェーンする（上書きしない）", () => {
		const first = vi.fn();
		const second = vi.fn();
		loadYouTubeIframeAPI(first);
		loadYouTubeIframeAPI(second);

		// API ロード完了をシミュレート
		w.onYouTubeIframeAPIReady?.();

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("script タグを挿入し、複数回呼んでも重複挿入しない", () => {
		loadYouTubeIframeAPI(vi.fn());
		loadYouTubeIframeAPI(vi.fn());
		expect(document.querySelectorAll('script[src*="youtube.com/iframe_api"]').length).toBe(1);
	});
});
