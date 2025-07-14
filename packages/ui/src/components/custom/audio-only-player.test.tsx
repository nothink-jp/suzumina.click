import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioOnlyPlayer } from "./audio-only-player";
import { youTubeAPIManager } from "./youtube-api-manager";

// Mock YouTube API
vi.mock("./youtube-api-manager", () => ({
	youTubeAPIManager: {
		setupErrorSuppression: vi.fn(),
		onReady: vi.fn((callback) => callback()),
		generateUniquePlayerId: vi.fn(() => "test-player-id"),
	},
}));

// Mock YT Player
const mockPlayer = {
	playVideo: vi.fn(),
	pauseVideo: vi.fn(),
	seekTo: vi.fn(),
	setVolume: vi.fn(),
	getCurrentTime: vi.fn(() => 0),
	destroy: vi.fn(),
};

const mockYT = {
	Player: vi.fn().mockImplementation((id, options) => {
		// Call onReady callback
		setTimeout(() => {
			options.events.onReady({ target: mockPlayer });
		}, 0);
		return mockPlayer;
	}),
	PlayerState: {
		PLAYING: 1,
		PAUSED: 2,
		ENDED: 0,
		BUFFERING: 3,
		CUED: 5,
	},
};

describe("AudioOnlyPlayer", () => {
	beforeEach(() => {
		// Set up window.YT
		(window as any).YT = mockYT;
		vi.clearAllMocks();
	});

	afterEach(() => {
		(window as any).YT = undefined;
		vi.clearAllMocks();
	});

	it("YouTube APIの初期化を行う", async () => {
		render(<AudioOnlyPlayer videoId="test-video" startTime={10} />);

		expect(youTubeAPIManager.setupErrorSuppression).toHaveBeenCalled();
		expect(youTubeAPIManager.onReady).toHaveBeenCalled();
	});

	it("プレイヤーが非表示で作成される", async () => {
		const { container } = render(<AudioOnlyPlayer videoId="test-video" startTime={10} />);

		const playerContainer = container.querySelector(".audio-only-player");
		expect(playerContainer).toBeInTheDocument();
		expect(playerContainer).toHaveAttribute("style", "display: none;");
	});

	it("正しいパラメータでプレイヤーが初期化される", async () => {
		render(
			<AudioOnlyPlayer
				videoId="test-video"
				startTime={10}
				endTime={20}
				autoPlay={true}
				volume={75}
			/>,
		);

		await waitFor(() => {
			expect(mockYT.Player).toHaveBeenCalledWith(
				"test-player-id",
				expect.objectContaining({
					videoId: "test-video",
					playerVars: expect.objectContaining({
						autoplay: 1,
						controls: 0,
						start: 10,
						end: 20,
					}),
				}),
			);
		});
	});

	it("onReadyコールバックが呼ばれる", async () => {
		const onReady = vi.fn();
		render(<AudioOnlyPlayer videoId="test-video" startTime={10} onReady={onReady} />);

		await waitFor(() => {
			expect(onReady).toHaveBeenCalled();
		});
	});

	it("ボリュームが設定される", async () => {
		render(<AudioOnlyPlayer videoId="test-video" startTime={10} volume={80} />);

		await waitFor(() => {
			expect(mockPlayer.setVolume).toHaveBeenCalledWith(80);
		});
	});

	it("videoIdが変更されたときにプレイヤーが再作成される", async () => {
		const { rerender } = render(<AudioOnlyPlayer videoId="video1" startTime={10} />);

		await waitFor(() => {
			expect(mockYT.Player).toHaveBeenCalledTimes(1);
		});

		rerender(<AudioOnlyPlayer videoId="video2" startTime={10} />);

		await waitFor(() => {
			expect(mockPlayer.destroy).toHaveBeenCalled();
			expect(mockYT.Player).toHaveBeenCalledTimes(2);
		});
	});

	it("カスタムクラス名が適用される", () => {
		const { container } = render(
			<AudioOnlyPlayer videoId="test-video" startTime={10} className="custom-audio" />,
		);

		const playerContainer = container.querySelector(".audio-only-player");
		expect(playerContainer).toHaveClass("custom-audio");
	});

	it("エラーコールバックが呼ばれる", async () => {
		const onError = vi.fn();
		const mockErrorPlayer = {
			...mockPlayer,
		};

		const mockYTWithError = {
			...mockYT,
			Player: vi.fn().mockImplementation((id, options) => {
				setTimeout(() => {
					options.events.onReady({ target: mockErrorPlayer });
					options.events.onError({ data: 150 });
				}, 0);
				return mockErrorPlayer;
			}),
		};

		(window as any).YT = mockYTWithError;

		render(<AudioOnlyPlayer videoId="test-video" startTime={10} onError={onError} />);

		await waitFor(() => {
			expect(onError).toHaveBeenCalledWith(150);
		});
	});

	it("再生状態の変更でコールバックが呼ばれる", async () => {
		const onPlay = vi.fn();
		const onPause = vi.fn();
		const onEnd = vi.fn();

		const mockStatePlayer = {
			...mockPlayer,
		};

		const mockYTWithState = {
			...mockYT,
			Player: vi.fn().mockImplementation((id, options) => {
				setTimeout(() => {
					options.events.onReady({ target: mockStatePlayer });
					// Test play state
					options.events.onStateChange({ data: mockYT.PlayerState.PLAYING });
					// Test pause state
					options.events.onStateChange({ data: mockYT.PlayerState.PAUSED });
					// Test end state
					options.events.onStateChange({ data: mockYT.PlayerState.ENDED });
				}, 0);
				return mockStatePlayer;
			}),
		};

		(window as any).YT = mockYTWithState;

		render(
			<AudioOnlyPlayer
				videoId="test-video"
				startTime={10}
				onPlay={onPlay}
				onPause={onPause}
				onEnd={onEnd}
			/>,
		);

		await waitFor(() => {
			expect(onPlay).toHaveBeenCalled();
			expect(onPause).toHaveBeenCalled();
			expect(onEnd).toHaveBeenCalled();
		});
	});

	it("endTimeに達したときに再生が停止される", async () => {
		mockPlayer.getCurrentTime.mockReturnValue(25);

		const onEnd = vi.fn();

		render(<AudioOnlyPlayer videoId="test-video" startTime={10} endTime={20} onEnd={onEnd} />);

		// Trigger playing state to start interval check
		await waitFor(() => {
			const playerCall = mockYT.Player.mock.calls[0];
			if (playerCall) {
				playerCall[1].events.onStateChange({ data: mockYT.PlayerState.PLAYING });
			}
		});

		// Wait for interval to check current time
		await waitFor(
			() => {
				expect(mockPlayer.pauseVideo).toHaveBeenCalled();
				expect(onEnd).toHaveBeenCalled();
			},
			{ timeout: 300 },
		);
	});

	it("コンポーネントがアンマウントされたときにクリーンアップされる", async () => {
		const { unmount } = render(<AudioOnlyPlayer videoId="test-video" startTime={10} />);

		await waitFor(() => {
			expect(mockYT.Player).toHaveBeenCalled();
		});

		unmount();

		expect(mockPlayer.destroy).toHaveBeenCalled();
	});
});
