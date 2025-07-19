import { beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeAPIManager } from "./youtube-api-manager";

// Mock DOM environment
const mockWindow = vi.fn();
const mockDocument = {
	querySelector: vi.fn(),
	createElement: vi.fn(),
	body: {
		appendChild: vi.fn(),
	},
};

// Mock global objects before importing
Object.defineProperty(global, "window", {
	value: {
		YT: undefined,
		onYouTubeIframeAPIReady: undefined,
		onerror: null,
		onunhandledrejection: null,
	},
	writable: true,
	configurable: true,
});

Object.defineProperty(global, "document", {
	value: mockDocument,
	writable: true,
	configurable: true,
});

describe("YouTubeAPIManager", () => {
	let manager: YouTubeAPIManager;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		mockDocument.querySelector.mockReturnValue(null);
		mockDocument.createElement.mockReturnValue({
			src: "",
			async: false,
			onerror: null,
		});

		// Reset singleton
		(YouTubeAPIManager as any).instance = null;

		// Reset window state
		(global.window as any).YT = undefined;
		(global.window as any).onYouTubeIframeAPIReady = undefined;
		(global.window as any).onerror = null;
		(global.window as any).onunhandledrejection = null;

		manager = YouTubeAPIManager.getInstance();
	});

	// シングルトンパターンテスト
	describe("Singleton pattern", () => {
		it("should return the same instance", () => {
			const instance1 = YouTubeAPIManager.getInstance();
			const instance2 = YouTubeAPIManager.getInstance();

			expect(instance1).toBe(instance2);
		});

		it("should create only one instance", () => {
			const instance = YouTubeAPIManager.getInstance();
			expect(instance).toBeInstanceOf(YouTubeAPIManager);
		});
	});

	// API準備状態テスト
	describe("API readiness", () => {
		it("should return false when API is not loaded", () => {
			expect(manager.isReady()).toBe(false);
		});

		it("should return true when API is loaded", () => {
			(global.window as any).YT = {
				Player: vi.fn() as any,
				PlayerState: {} as any,
				ready: vi.fn(),
			};
			(manager as any).isAPILoaded = true;

			expect(manager.isReady()).toBe(true);
		});

		it("should return false when YT.Player is not available", () => {
			(global.window as any).YT = {} as any;
			(manager as any).isAPILoaded = true;

			expect(manager.isReady()).toBe(false);
		});
	});

	// コールバック実行テスト
	describe("Callback execution", () => {
		it("should execute callback immediately when API is ready", () => {
			const callback = vi.fn();
			(global.window as any).YT = {
				Player: vi.fn() as any,
				PlayerState: {} as any,
				ready: vi.fn(),
			};
			(manager as any).isAPILoaded = true;

			manager.onReady(callback);

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("should queue callbacks when API is not ready", () => {
			const callback = vi.fn();

			manager.onReady(callback);

			expect(callback).not.toHaveBeenCalled();
			expect((manager as any).callbacks).toContain(callback);
		});

		it("should execute all queued callbacks when API becomes ready", () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			manager.onReady(callback1);
			manager.onReady(callback2);

			// Simulate API ready
			(manager as any).handleAPIReady();

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});
	});

	// ユニークID生成テスト
	describe("Unique player ID generation", () => {
		it("should generate unique player IDs", () => {
			const id1 = manager.generateUniquePlayerId();
			const id2 = manager.generateUniquePlayerId();

			expect(id1).toMatch(/^yt-player-\d+-[a-z0-9]+$/);
			expect(id2).toMatch(/^yt-player-\d+-[a-z0-9]+$/);
			expect(id1).not.toBe(id2);
		});

		it("should generate IDs with correct format", () => {
			const id = manager.generateUniquePlayerId();
			const parts = id.split("-");

			expect(parts[0]).toBe("yt");
			expect(parts[1]).toBe("player");
			expect(parts[2]).toMatch(/^\d+$/); // timestamp
			expect(parts[3]).toMatch(/^[a-z0-9]+$/); // random string
		});
	});

	// エラー検出テスト
	describe("Error detection", () => {
		it("should detect postMessage errors", () => {
			const postMessageError = "postMessage error occurred";
			const result = (manager as any).isPostMessageError(postMessageError);

			expect(result).toBe(true);
		});

		it("should detect www-widgetapi errors", () => {
			const widgetApiError = "www-widgetapi script error";
			const result = (manager as any).isPostMessageError(widgetApiError);

			expect(result).toBe(true);
		});

		it("should detect Service Worker errors", () => {
			const swError = "navigation preload request was cancelled";
			const result = (manager as any).isServiceWorkerError(swError);

			expect(result).toBe(true);
		});

		it("should detect YouTube promise rejections", () => {
			const youtubeRejection = { message: "postMessage from youtube.com failed" };
			const result = (manager as any).isYouTubeRejection(youtubeRejection);

			expect(result).toBe(true);
		});

		it("should not detect unrelated errors", () => {
			const normalError = "Regular JavaScript error";
			const isPostMessage = (manager as any).isPostMessageError(normalError);
			const isServiceWorker = (manager as any).isServiceWorkerError(normalError);

			expect(isPostMessage).toBe(false);
			expect(isServiceWorker).toBe(false);
		});

		it("should handle invalid rejection reasons", () => {
			expect((manager as any).isYouTubeRejection(null)).toBe(false);
			expect((manager as any).isYouTubeRejection(undefined)).toBe(false);
			expect((manager as any).isYouTubeRejection("string")).toBe(false);
			expect((manager as any).isYouTubeRejection({ noMessage: true })).toBe(false);
		});
	});

	// API読み込みテスト（基本のみ）
	describe("API loading", () => {
		it("should not load API multiple times", () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			manager.onReady(callback1);
			manager.onReady(callback2);

			expect((manager as any).isAPILoading).toBe(true);
		});

		it("should handle existing API", () => {
			(global.window as any).YT = {
				Player: vi.fn() as any,
				PlayerState: {} as any,
				ready: vi.fn(),
			};

			const callback = vi.fn();
			manager.onReady(callback);

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	// エラーメッセージ処理テスト
	describe("Error message processing", () => {
		it("should process postMessage errors correctly", () => {
			const result = (manager as any).processErrorMessage("postMessage error", "source");
			expect(result).toBe(true);
		});

		it("should process Service Worker errors correctly", () => {
			const result = (manager as any).processErrorMessage(
				"navigation preload request was cancelled",
			);
			expect(result).toBe(true);
		});

		it("should not process unrelated errors", () => {
			const result = (manager as any).processErrorMessage("regular error", "source");
			expect(result).toBe(false);
		});
	});

	// 統合テスト
	describe("Integration", () => {
		it("should clear callbacks after execution", () => {
			const callback = vi.fn();
			manager.onReady(callback);

			expect((manager as any).callbacks).toHaveLength(1);

			(manager as any).handleAPIReady();

			expect((manager as any).callbacks).toHaveLength(0);
		});

		it("should handle callback execution errors gracefully", () => {
			const errorCallback = vi.fn(() => {
				throw new Error("Test error");
			});
			const normalCallback = vi.fn();

			manager.onReady(errorCallback);
			manager.onReady(normalCallback);

			// Should not throw
			expect(() => (manager as any).handleAPIReady()).not.toThrow();

			expect(errorCallback).toHaveBeenCalledTimes(1);
			expect(normalCallback).toHaveBeenCalledTimes(1);
		});
	});
});
