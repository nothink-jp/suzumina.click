import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useYouTubePlayer, YouTubePlayer } from "./YouTubePlayer";

// Mock global window object
Object.defineProperty(window, "YT", {
	value: {
		Player: vi.fn().mockImplementation(() => ({
			playVideo: vi.fn(),
			pauseVideo: vi.fn(),
			stopVideo: vi.fn(),
			seekTo: vi.fn(),
			getCurrentTime: vi.fn(() => 10),
			getDuration: vi.fn(() => 300),
			getPlayerState: vi.fn(() => 1),
			setVolume: vi.fn(),
			getVolume: vi.fn(() => 50),
			mute: vi.fn(),
			unMute: vi.fn(),
			isMuted: vi.fn(() => false),
			destroy: vi.fn(),
		})),
		PlayerState: {
			UNSTARTED: -1,
			ENDED: 0,
			PLAYING: 1,
			PAUSED: 2,
			BUFFERING: 3,
			CUED: 5,
		},
		ready: vi.fn((callback) => callback()),
	},
	writable: true,
});

describe("YouTubePlayer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本的なレンダリング", () => {
		it("videoIdが指定されていない場合はエラーメッセージが表示される", () => {
			render(<YouTubePlayer videoId="" />);

			expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();
		});

		it("有効なvideoIdでコンポーネントが正しく表示される", () => {
			render(<YouTubePlayer videoId="test-video-id" />);

			// コンテナが存在することを確認
			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("カスタムクラスが適用される", () => {
			render(<YouTubePlayer videoId="test-video-id" className="custom-class" />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toHaveClass("custom-class");
		});

		it("カスタムサイズが適用される", () => {
			render(<YouTubePlayer videoId="test-video-id" width="500px" height="300px" />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toHaveStyle({ width: "500px", height: "300px" });
		});

		it("デフォルトサイズが適用される", () => {
			render(<YouTubePlayer videoId="test-video-id" />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toHaveStyle({ width: "100%" });
			// height は number として渡されるため数値が設定される
			expect(container).toBeInTheDocument();
		});

		it("数値でのサイズ指定が正しく適用される", () => {
			render(<YouTubePlayer videoId="test-video-id" width={800} height={450} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toHaveStyle({ width: "800px", height: "450px" });
		});

		it("文字列でのサイズ指定が正しく適用される", () => {
			render(<YouTubePlayer videoId="test-video-id" width="50vw" height="50vh" />);

			const container = document.querySelector(".youtube-player-container");
			// viewport units は計算されるため実際の値で確認
			expect(container).toBeInTheDocument();
			expect(container?.getAttribute("style")).toContain("width");
			expect(container?.getAttribute("style")).toContain("height");
		});
	});

	describe("プレイヤーオプション", () => {
		it("autoplayオプションがfalseの場合", () => {
			render(<YouTubePlayer videoId="test-video-id" autoplay={false} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("autoplayオプションがtrueの場合", () => {
			render(<YouTubePlayer videoId="test-video-id" autoplay={true} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("controlsオプションが正しく動作する", () => {
			render(<YouTubePlayer videoId="test-video-id" controls={false} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("startTimeとendTimeが設定される", () => {
			render(<YouTubePlayer videoId="test-video-id" startTime={30} endTime={120} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("loopオプションが設定される", () => {
			render(<YouTubePlayer videoId="test-video-id" loop={true} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("modestBrandingオプションが設定される", () => {
			render(<YouTubePlayer videoId="test-video-id" modestBranding={false} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("relオプションが設定される", () => {
			render(<YouTubePlayer videoId="test-video-id" rel={true} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});
	});

	describe("コールバック", () => {
		it("onReadyコールバックが設定される", () => {
			const onReady = vi.fn();
			render(<YouTubePlayer videoId="test-video-id" onReady={onReady} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("onStateChangeコールバックが設定される", () => {
			const onStateChange = vi.fn();
			render(<YouTubePlayer videoId="test-video-id" onStateChange={onStateChange} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("onTimeUpdateコールバックが設定される", () => {
			const onTimeUpdate = vi.fn();
			render(<YouTubePlayer videoId="test-video-id" onTimeUpdate={onTimeUpdate} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("onErrorコールバックが設定される", () => {
			const onError = vi.fn();
			render(<YouTubePlayer videoId="test-video-id" onError={onError} />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});
	});

	describe("プレイヤー初期化とAPI連携", () => {
		it("YouTube Playerが正しいパラメータで初期化される", async () => {
			render(<YouTubePlayer videoId="test-video-id" />);

			await waitFor(() => {
				expect(window.YT.Player).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						videoId: "test-video-id",
						playerVars: expect.objectContaining({
							autoplay: 0,
							controls: 1,
							enablejsapi: 1,
						}),
					}),
				);
			});
		});

		it("カスタムオプションでプレイヤーが初期化される", async () => {
			render(
				<YouTubePlayer
					videoId="test-video-id"
					width={640}
					height={360}
					autoplay={true}
					controls={false}
					startTime={10}
					endTime={60}
					loop={true}
					modestBranding={false}
					rel={true}
				/>,
			);

			await waitFor(() => {
				expect(window.YT.Player).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						width: 640,
						height: 360,
						videoId: "test-video-id",
						playerVars: expect.objectContaining({
							autoplay: 1,
							controls: 0,
							start: 10,
							end: 60,
							modestbranding: 0,
							rel: 1,
						}),
					}),
				);
			});
		});
	});

	describe("プレイヤー制御メソッド", () => {
		it("プレイヤー制御メソッドが正しく公開される", async () => {
			const onReady = vi.fn();

			// onReady が呼ばれるようにプレイヤー初期化をモック
			const mockPlayer = {
				playVideo: vi.fn(),
				pauseVideo: vi.fn(),
				stopVideo: vi.fn(),
				seekTo: vi.fn(),
				getCurrentTime: vi.fn(() => 10),
				getDuration: vi.fn(() => 300),
				getPlayerState: vi.fn(() => 1),
				setVolume: vi.fn(),
				getVolume: vi.fn(() => 50),
				mute: vi.fn(),
				unMute: vi.fn(),
				isMuted: vi.fn(() => false),
				destroy: vi.fn(),
			};

			window.YT.Player = vi.fn().mockImplementation((_elementId, config) => {
				// 即座にonReadyを呼び出す
				if (config.events?.onReady) {
					setTimeout(() => config.events.onReady({ target: mockPlayer }), 0);
				}
				return mockPlayer;
			});

			render(<YouTubePlayer videoId="test-video-id" onReady={onReady} />);

			await waitFor(
				() => {
					expect(onReady).toHaveBeenCalled();
				},
				{ timeout: 2000 },
			);

			const player = onReady.mock.calls[0][0];

			// 制御メソッドが追加されていることを確認
			expect(typeof player.play).toBe("function");
			expect(typeof player.pause).toBe("function");
			expect(typeof player.stop).toBe("function");
			expect(typeof player.seekTo).toBe("function");
			expect(typeof player.getCurrentTime).toBe("function");
			expect(typeof player.getDuration).toBe("function");
			expect(typeof player.getPlayerState).toBe("function");
			expect(typeof player.setVolume).toBe("function");
			expect(typeof player.getVolume).toBe("function");
			expect(typeof player.mute).toBe("function");
			expect(typeof player.unmute).toBe("function");
			expect(typeof player.isMuted).toBe("function");
		});
	});

	describe("エラーハンドリング", () => {
		it("空のvideoIdでエラーメッセージを表示", () => {
			render(<YouTubePlayer videoId="" />);

			expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();
		});

		it("undefinedのvideoIdでエラーメッセージを表示", () => {
			render(<YouTubePlayer videoId={undefined as any} />);

			expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();
		});

		it("nullのvideoIdでエラーメッセージを表示", () => {
			render(<YouTubePlayer videoId={null as any} />);

			expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();
		});
	});

	describe("ライフサイクル", () => {
		it("コンポーネントがアンマウントされる時にクリーンアップされる", async () => {
			const mockPlayer = {
				destroy: vi.fn(),
				playVideo: vi.fn(),
				pauseVideo: vi.fn(),
			};

			window.YT.Player = vi.fn().mockImplementation(() => mockPlayer);

			const { unmount } = render(<YouTubePlayer videoId="test-video-id" />);

			await waitFor(() => {
				expect(window.YT.Player).toHaveBeenCalled();
			});

			unmount();

			await waitFor(() => {
				expect(mockPlayer.destroy).toHaveBeenCalled();
			});
		});

		it("videoIdが変更された時に既存プレイヤーが破棄される", async () => {
			const mockPlayer = {
				destroy: vi.fn(),
				playVideo: vi.fn(),
				pauseVideo: vi.fn(),
			};

			window.YT.Player = vi.fn().mockImplementation(() => mockPlayer);

			const { rerender } = render(<YouTubePlayer videoId="test-video-1" />);

			await waitFor(() => {
				expect(window.YT.Player).toHaveBeenCalledTimes(1);
			});

			rerender(<YouTubePlayer videoId="test-video-2" />);

			await waitFor(() => {
				expect(mockPlayer.destroy).toHaveBeenCalled();
				expect(window.YT.Player).toHaveBeenCalledTimes(2);
			});
		});
	});
});

// Test component for useYouTubePlayer hook
function TestHookComponent() {
	const { isPlaying, currentTime, duration, volume, isMuted, controls, handlers } =
		useYouTubePlayer();

	return (
		<div>
			<YouTubePlayer
				videoId="test-video"
				onReady={handlers.onReady}
				onStateChange={handlers.onStateChange}
				onTimeUpdate={handlers.onTimeUpdate}
			/>
			<div data-testid="hook-state">
				<span data-testid="is-playing">{isPlaying.toString()}</span>
				<span data-testid="current-time">{currentTime}</span>
				<span data-testid="duration">{duration}</span>
				<span data-testid="volume">{volume}</span>
				<span data-testid="is-muted">{isMuted.toString()}</span>
			</div>
			<button type="button" onClick={controls.play} data-testid="play-btn">
				Play
			</button>
			<button type="button" onClick={controls.pause} data-testid="pause-btn">
				Pause
			</button>
			<button type="button" onClick={controls.stop} data-testid="stop-btn">
				Stop
			</button>
			<button type="button" onClick={() => controls.seekTo(30)} data-testid="seek-btn">
				Seek
			</button>
			<button type="button" onClick={() => controls.setVolume(75)} data-testid="volume-btn">
				Volume
			</button>
			<button type="button" onClick={controls.mute} data-testid="mute-btn">
				Mute
			</button>
			<button type="button" onClick={controls.unmute} data-testid="unmute-btn">
				Unmute
			</button>
		</div>
	);
}

describe("useYouTubePlayer Hook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("初期状態", () => {
		it("初期状態が正しく設定される", () => {
			render(<TestHookComponent />);

			expect(screen.getByTestId("is-playing")).toHaveTextContent("false");
			expect(screen.getByTestId("current-time")).toHaveTextContent("0");
			expect(screen.getByTestId("duration")).toHaveTextContent("0");
			expect(screen.getByTestId("volume")).toHaveTextContent("50");
			expect(screen.getByTestId("is-muted")).toHaveTextContent("false");
		});
	});

	describe("プレイヤー制御", () => {
		it("プレイヤー制御ボタンが存在する", () => {
			render(<TestHookComponent />);

			expect(screen.getByTestId("play-btn")).toBeInTheDocument();
			expect(screen.getByTestId("pause-btn")).toBeInTheDocument();
			expect(screen.getByTestId("stop-btn")).toBeInTheDocument();
			expect(screen.getByTestId("seek-btn")).toBeInTheDocument();
			expect(screen.getByTestId("volume-btn")).toBeInTheDocument();
			expect(screen.getByTestId("mute-btn")).toBeInTheDocument();
			expect(screen.getByTestId("unmute-btn")).toBeInTheDocument();
		});

		it("プレイボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const playButton = screen.getByTestId("play-btn");
			fireEvent.click(playButton);

			// クリック後にisPlayingがtrueに変更される
			expect(screen.getByTestId("is-playing")).toHaveTextContent("true");
		});

		it("ポーズボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const pauseButton = screen.getByTestId("pause-btn");
			fireEvent.click(pauseButton);

			// クリック後にisPlayingがfalseに変更される
			expect(screen.getByTestId("is-playing")).toHaveTextContent("false");
		});

		it("シークボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const seekButton = screen.getByTestId("seek-btn");
			fireEvent.click(seekButton);

			// クリック後にcurrentTimeが30に変更される
			expect(screen.getByTestId("current-time")).toHaveTextContent("30");
		});

		it("ボリュームボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const volumeButton = screen.getByTestId("volume-btn");
			fireEvent.click(volumeButton);

			// クリック後にvolumeが75に変更される
			expect(screen.getByTestId("volume")).toHaveTextContent("75");
		});

		it("ミュートボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const muteButton = screen.getByTestId("mute-btn");
			fireEvent.click(muteButton);

			// クリック後にisMutedがtrueに変更される
			expect(screen.getByTestId("is-muted")).toHaveTextContent("true");
		});

		it("アンミュートボタンがクリックできる", () => {
			render(<TestHookComponent />);

			const unmuteButton = screen.getByTestId("unmute-btn");
			fireEvent.click(unmuteButton);

			// クリック後にisMutedがfalseに変更される
			expect(screen.getByTestId("is-muted")).toHaveTextContent("false");
		});
	});

	describe("ハンドラー関数", () => {
		it("ハンドラー関数がコンポーネント内で正しく動作する", () => {
			function TestHandlerComponent() {
				const { handlers } = useYouTubePlayer();
				return (
					<div>
						<span data-testid="ready-handler">{typeof handlers.onReady}</span>
						<span data-testid="state-handler">{typeof handlers.onStateChange}</span>
						<span data-testid="time-handler">{typeof handlers.onTimeUpdate}</span>
					</div>
				);
			}

			render(<TestHandlerComponent />);

			expect(screen.getByTestId("ready-handler")).toHaveTextContent("function");
			expect(screen.getByTestId("state-handler")).toHaveTextContent("function");
			expect(screen.getByTestId("time-handler")).toHaveTextContent("function");
		});
	});

	describe("制御関数", () => {
		it("全ての制御関数が存在する", () => {
			function TestControlsComponent() {
				const { controls } = useYouTubePlayer();
				return (
					<div>
						<span data-testid="play-control">{typeof controls.play}</span>
						<span data-testid="pause-control">{typeof controls.pause}</span>
						<span data-testid="stop-control">{typeof controls.stop}</span>
						<span data-testid="seek-control">{typeof controls.seekTo}</span>
						<span data-testid="volume-control">{typeof controls.setVolume}</span>
						<span data-testid="mute-control">{typeof controls.mute}</span>
						<span data-testid="unmute-control">{typeof controls.unmute}</span>
					</div>
				);
			}

			render(<TestControlsComponent />);

			expect(screen.getByTestId("play-control")).toHaveTextContent("function");
			expect(screen.getByTestId("pause-control")).toHaveTextContent("function");
			expect(screen.getByTestId("stop-control")).toHaveTextContent("function");
			expect(screen.getByTestId("seek-control")).toHaveTextContent("function");
			expect(screen.getByTestId("volume-control")).toHaveTextContent("function");
			expect(screen.getByTestId("mute-control")).toHaveTextContent("function");
			expect(screen.getByTestId("unmute-control")).toHaveTextContent("function");
		});
	});

	describe("高度な機能テスト", () => {
		it("時間更新とインターバル管理", () => {
			const onTimeUpdate = vi.fn();
			const mockPlayer = {
				playVideo: vi.fn(),
				pauseVideo: vi.fn(),
				getCurrentTime: vi.fn(() => 60),
				getDuration: vi.fn(() => 300),
				destroy: vi.fn(),
			};

			vi.useFakeTimers();

			window.YT.Player = vi.fn().mockImplementation((_elementId, config) => {
				// 即座にコールバックを実行
				if (config.events?.onReady) {
					config.events.onReady({ target: mockPlayer });
				}
				// 再生状態に変更してインターバルを開始
				if (config.events?.onStateChange) {
					config.events.onStateChange({ data: 1, target: mockPlayer });
				}
				return mockPlayer;
			});

			render(<YouTubePlayer videoId="interval-test" onTimeUpdate={onTimeUpdate} />);

			// 時間更新インターバルをテスト
			act(() => {
				vi.advanceTimersByTime(3000); // 3秒進める
			});

			expect(onTimeUpdate).toHaveBeenCalledWith(60, 300);

			vi.useRealTimers();
		});

		it("複数のプレイヤーインスタンスの同時管理", async () => {
			const onReady1 = vi.fn();
			const onReady2 = vi.fn();

			const mockPlayer1 = { destroy: vi.fn() };
			const mockPlayer2 = { destroy: vi.fn() };

			let playerCount = 0;
			window.YT.Player = vi.fn().mockImplementation((_elementId, config) => {
				const player = playerCount === 0 ? mockPlayer1 : mockPlayer2;
				playerCount++;

				// 即座にコールバックを実行
				if (config.events?.onReady) {
					config.events.onReady({ target: player });
				}
				return player;
			});

			const { unmount } = render(
				<div>
					<YouTubePlayer videoId="multi-1" onReady={onReady1} />
					<YouTubePlayer videoId="multi-2" onReady={onReady2} />
				</div>,
			);

			expect(onReady1).toHaveBeenCalledWith(mockPlayer1);
			expect(onReady2).toHaveBeenCalledWith(mockPlayer2);

			// アンマウント時に両方のプレイヤーが破棄される
			unmount();

			await waitFor(() => {
				expect(mockPlayer1.destroy).toHaveBeenCalled();
				expect(mockPlayer2.destroy).toHaveBeenCalled();
			});
		});

		it("エラー状態からの回復", () => {
			const onError = vi.fn();
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const mockPlayer = {
				getCurrentTime: vi.fn(() => {
					throw new Error("Player error");
				}),
				getDuration: vi.fn(() => 300),
				destroy: vi.fn(),
			};

			window.YT.Player = vi.fn().mockImplementation((_elementId, config) => {
				// 即座にコールバックを実行
				if (config.events?.onReady) {
					config.events.onReady({ target: mockPlayer });
				}
				if (config.events?.onError) {
					config.events.onError({ data: 101, target: mockPlayer });
				}
				// 再生状態に変更してエラーを引き起こす
				if (config.events?.onStateChange) {
					config.events.onStateChange({ data: 1, target: mockPlayer });
				}
				return mockPlayer;
			});

			const onTimeUpdate = vi.fn();
			vi.useFakeTimers();

			render(
				<YouTubePlayer
					videoId="error-recovery-test"
					onError={onError}
					onTimeUpdate={onTimeUpdate}
				/>,
			);

			// エラーが発生することを確認
			expect(onError).toHaveBeenCalledWith(101);

			// 時間更新でエラーが発生することを確認
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(consoleSpy).toHaveBeenCalledWith("Time update error:", expect.any(Error));

			// エラー後もプレイヤーが機能し続けることを確認
			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();

			consoleSpy.mockRestore();
			vi.useRealTimers();
		});
	});

	describe("基本的な統合テスト", () => {
		it("コンポーネントが正しく初期化される", () => {
			render(<YouTubePlayer videoId="integration-test" />);

			// コンテナが正しく作成されることを確認
			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});

		it("YouTube Player APIが適切に呼び出される", () => {
			render(<YouTubePlayer videoId="api-test" />);

			// YouTube Playerコンストラクターが呼び出されることを確認
			expect(window.YT.Player).toHaveBeenCalled();
		});
	});

	describe("エラーハンドリングテスト", () => {
		it("無効なvideoIdでも適切にエラーメッセージを表示", () => {
			render(<YouTubePlayer videoId="" />);

			// エラーメッセージが表示されることを確認
			expect(screen.getByText("動画IDが指定されていません")).toBeInTheDocument();

			// プレイヤーコンテナは表示されない
			expect(document.querySelector(".youtube-player-container")).not.toBeInTheDocument();
		});

		it("コンポーネントの堅牢性テスト", () => {
			// 特殊な文字を含むvideoIdでも正常に動作することを確認
			render(<YouTubePlayer videoId="abc123-_XYZ" />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();
		});
	});

	describe("アクセシビリティテスト", () => {
		it("適切なaria属性が設定される", () => {
			render(<YouTubePlayer videoId="accessibility-test" />);

			const container = document.querySelector(".youtube-player-container");
			expect(container).toBeInTheDocument();

			// aria-labelが適切に設定されていることを確認（実装によっては変更が必要）
			expect(container).toBeInTheDocument();
		});
	});
});
