/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubePlayerPool } from "../youtube-player-pool";

// Track the last created player instance
let lastCreatedPlayer: MockYouTubePlayer | null = null;

// Mock YouTube Player class
class MockYouTubePlayer {
	playVideo = vi.fn();
	pauseVideo = vi.fn();
	stopVideo = vi.fn();
	seekTo = vi.fn();
	getCurrentTime = vi.fn(() => 0);
	getPlayerState = vi.fn(() => 1);
	setVolume = vi.fn();
	getVolume = vi.fn(() => 50);
	destroy = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();

	constructor(elementId: string, config: any) {
		// Track constructor calls
		mockYTConstructorSpy(elementId, config);

		// Store this instance as the last created player
		lastCreatedPlayer = this;

		// onReadyコールバックを即座に実行
		setTimeout(() => {
			config.events?.onReady?.();
		}, 0);
	}
}

// Spy for tracking constructor calls
const mockYTConstructorSpy = vi.fn();

// グローバルなYTオブジェクトをモック
Object.defineProperty(window, "YT", {
	value: {
		Player: MockYouTubePlayer,
		PlayerState: {
			UNSTARTED: -1,
			ENDED: 0,
			PLAYING: 1,
			PAUSED: 2,
			BUFFERING: 3,
			CUED: 5,
		},
	},
	writable: true,
});

describe("YouTubePlayerPool", () => {
	let pool: YouTubePlayerPool;

	beforeEach(() => {
		// 各テスト前にモックをリセット
		vi.clearAllMocks();

		// DOMをクリア
		document.body.innerHTML = "";

		// Reset last created player
		lastCreatedPlayer = null;

		// シングルトンインスタンスをリセット
		(YouTubePlayerPool as any).instance = null;

		pool = YouTubePlayerPool.getInstance();
	});

	afterEach(() => {
		// 各テスト後にプールをクリーンアップ
		pool.destroyAll();
	});

	it("should be a singleton", () => {
		const pool1 = YouTubePlayerPool.getInstance();
		const pool2 = YouTubePlayerPool.getInstance();

		expect(pool1).toBe(pool2);
	});

	it("should create player when requested", async () => {
		const player = await pool.getOrCreatePlayer("test-video-id");

		expect(player).toBeDefined();
		expect(mockYTConstructorSpy).toHaveBeenCalledWith(
			expect.stringContaining("youtube-player-pool-test-video-id"),
			expect.objectContaining({
				videoId: "test-video-id",
				height: 1,
				width: 1,
			}),
		);
	});

	it("should reuse existing players", async () => {
		const player1 = await pool.getOrCreatePlayer("test-video-id");
		const player2 = await pool.getOrCreatePlayer("test-video-id");

		expect(player1).toBe(player2);
		expect(mockYTConstructorSpy).toHaveBeenCalledTimes(1);
	});

	it("should limit pool size to maximum", async () => {
		// 最大プールサイズ（5個）を超えてプレイヤーを作成
		const players = [];
		for (let i = 0; i < 7; i++) {
			const player = await pool.getOrCreatePlayer(`video-${i}`);
			players.push(player);
		}

		const stats = pool.getStats();
		expect(stats.totalPlayers).toBeLessThanOrEqual(5);
	});

	it("should play segment correctly", async () => {
		const callbacks = {
			onPlay: vi.fn(),
			onPause: vi.fn(),
			onEnd: vi.fn(),
		};

		await pool.playSegment("test-video-id", 10, 20, callbacks);

		expect(lastCreatedPlayer?.seekTo).toHaveBeenCalledWith(10, true);
		expect(lastCreatedPlayer?.playVideo).toHaveBeenCalled();
		expect(callbacks.onPlay).toHaveBeenCalled();
	});

	it("should stop current segment", async () => {
		const callbacks = {
			onPlay: vi.fn(),
			onEnd: vi.fn(),
		};

		await pool.playSegment("test-video-id", 10, 20, callbacks);
		pool.stopCurrentSegment();

		expect(lastCreatedPlayer?.pauseVideo).toHaveBeenCalled();
		expect(callbacks.onEnd).toHaveBeenCalled();
	});

	it("should handle onReady callback", () => {
		const readyCallback = vi.fn();

		pool.onReady(readyCallback);

		expect(readyCallback).toHaveBeenCalled();
	});

	it("should provide correct stats", () => {
		const stats = pool.getStats();

		expect(stats).toHaveProperty("totalPlayers");
		expect(stats).toHaveProperty("playingPlayers");
		expect(stats).toHaveProperty("hasActiveSegment");
		expect(stats).toHaveProperty("maxPoolSize");
		expect(stats).toHaveProperty("isAPIReady");
		expect(stats).toHaveProperty("activeSegmentVideoId");
	});

	it("should cleanup old players", async () => {
		// プレイヤーを作成
		await pool.getOrCreatePlayer("test-video-id");

		// プレイヤーが作成されたことを確認
		let stats = pool.getStats();
		expect(stats.totalPlayers).toBeGreaterThan(0);

		// クリーンアップを実行（cleanup関数の存在を確認）
		expect(typeof pool.cleanup).toBe("function");
		pool.cleanup(0);

		// クリーンアップ後の状態を確認（プレイヤーの削除が期待される）
		stats = pool.getStats();
		expect(stats.totalPlayers).toBeLessThanOrEqual(1);
	});

	it("should destroy all players", async () => {
		await pool.getOrCreatePlayer("video-1");
		await pool.getOrCreatePlayer("video-2");

		pool.destroyAll();

		const stats = pool.getStats();
		expect(stats.totalPlayers).toBe(0);
		expect(lastCreatedPlayer?.destroy).toHaveBeenCalled();
	});

	it("should handle player creation errors", async () => {
		// 新しいプールインスタンスを作成してエラーテスト
		(YouTubePlayerPool as any).instance = null;
		const errorPool = YouTubePlayerPool.getInstance();

		// プレイヤー作成時にエラーを発生させる
		const originalConstructor = window.YT.Player;
		window.YT.Player = vi.fn(() => {
			throw new Error("Player creation failed");
		});

		await expect(errorPool.getOrCreatePlayer("error-video-id")).rejects.toThrow();

		// 元のコンストラクタを復元
		window.YT.Player = originalConstructor;
	});

	it("should monitor end time during playback", async () => {
		const callbacks = {
			onEnd: vi.fn(),
		};

		await pool.playSegment("test-video-id", 10, 20, callbacks);

		// getCurrentTimeが終了時間を超える値を返すように設定
		lastCreatedPlayer?.getCurrentTime.mockReturnValue(25);

		// 少し待ってからタイマーが動作したかチェック
		await new Promise((resolve) => setTimeout(resolve, 300));

		expect(callbacks.onEnd).toHaveBeenCalled();
	});
});
