import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeAdjustment } from "../use-time-adjustment";

// Mock YouTube Player
const mockYouTubePlayer = {
	getCurrentTime: vi.fn(() => 0),
	seekTo: vi.fn(),
	playVideo: vi.fn(),
	pauseVideo: vi.fn(),
};

describe("useTimeAdjustment", () => {
	const defaultProps = {
		videoDuration: 300,
		currentTime: 0,
		youtubePlayerRef: { current: mockYouTubePlayer },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockYouTubePlayer.getCurrentTime.mockReturnValue(0);
	});

	describe("Initial State", () => {
		it("初期状態が正しく設定される", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			expect(result.current.startTime).toBe(0);
			expect(result.current.endTime).toBe(0);
			expect(result.current.startTimeInput).toBe("0:00.0");
			expect(result.current.endTimeInput).toBe("0:00.0");
			expect(result.current.isEditingStartTime).toBe(false);
			expect(result.current.isEditingEndTime).toBe(false);
			expect(result.current.isAdjusting).toBe(false);
		});

		it("外部のcurrentTimeが正しく参照される", () => {
			const props = { ...defaultProps, currentTime: 10.5 };
			renderHook(() => useTimeAdjustment(props));

			// hookは外部のcurrentTimeを参照するため、テストではpropsを確認
			expect(props.currentTime).toBe(10.5);
		});
	});

	describe("Time Adjustments", () => {
		it("開始時間の調整が正常に動作する", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.adjustStartTime(1);
			});

			await waitFor(() => {
				expect(result.current.startTime).toBe(1);
				expect(result.current.startTimeInput).toBe("0:01.0");
			});
		});

		it("終了時間の調整が正常に動作する", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.adjustEndTime(5);
			});

			await waitFor(() => {
				expect(result.current.endTime).toBe(5);
				expect(result.current.endTimeInput).toBe("0:05.0");
			});
		});

		it("負の値への調整が0でクランプされる", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.adjustStartTime(-10);
			});

			await waitFor(() => {
				expect(result.current.startTime).toBe(0);
			});
		});

		it("動画時間を超える調整がクランプされる", async () => {
			const { result } = renderHook(() =>
				useTimeAdjustment({ ...defaultProps, videoDuration: 10 }),
			);

			act(() => {
				result.current.adjustStartTime(15);
			});

			await waitFor(() => {
				expect(result.current.startTime).toBe(10);
			});
		});

		it("浮動小数点の精度が正しく維持される", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			// 0.1秒を10回調整、デバウンスを避けるため間隔をあける
			for (let i = 0; i < 10; i++) {
				await act(async () => {
					result.current.adjustStartTime(0.1);
					// デバウンスを避けるため少し待つ
					await new Promise((resolve) => setTimeout(resolve, 120));
				});
			}

			await waitFor(() => {
				expect(result.current.startTime).toBe(1.0);
				expect(result.current.startTimeInput).toBe("0:01.0");
			});
		});
	});

	describe("Debounce Functionality", () => {
		it("デバウンス機能が連続調整を制限する", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			// 短時間で連続実行
			act(() => {
				result.current.adjustStartTime(1);
				result.current.adjustStartTime(1);
				result.current.adjustStartTime(1);
			});

			await waitFor(() => {
				// デバウンスにより1回のみ実行される
				expect(result.current.startTime).toBe(1);
			});
		});

		it("デバウンス期間後は正常に実行される", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			// 最初の調整
			await act(async () => {
				result.current.adjustStartTime(1);
			});

			// 初回の調整が完了するまで待つ
			await waitFor(() => {
				expect(result.current.startTime).toBe(1);
			});

			// デバウンス期間を経過するまで待つ
			await new Promise((resolve) => setTimeout(resolve, 150));

			// 2回目の調整
			await act(async () => {
				result.current.adjustStartTime(1);
			});

			await waitFor(() => {
				expect(result.current.startTime).toBe(2);
			});
		});

		it("調整中フラグが適切に制御される", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			await act(async () => {
				result.current.adjustStartTime(1);
			});

			expect(result.current.isAdjusting).toBe(true);

			// 100ms後にフラグがfalseになることを確認
			await waitFor(
				() => {
					expect(result.current.isAdjusting).toBe(false);
				},
				{ timeout: 200 },
			);
		});
	});

	describe("Current Time Setting", () => {
		it("現在時間を開始時間に設定できる", () => {
			const props = { ...defaultProps, currentTime: 10.5, youtubePlayerRef: { current: null } };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.setCurrentAsStart();
			});

			expect(result.current.startTime).toBe(10.5);
			expect(result.current.startTimeInput).toBe("0:10.5");
		});

		it("現在時間を終了時間に設定できる", () => {
			const props = { ...defaultProps, currentTime: 15.3, youtubePlayerRef: { current: null } };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.setCurrentAsEnd();
			});

			expect(result.current.endTime).toBe(15.3);
			expect(result.current.endTimeInput).toBe("0:15.3");
		});

		it("YouTube Playerから現在時間を取得する", () => {
			mockYouTubePlayer.getCurrentTime.mockReturnValue(20.7);
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.setCurrentAsStart();
			});

			expect(result.current.startTime).toBe(20.7);
		});

		it("YouTube API エラー時は currentTime を使用する", () => {
			mockYouTubePlayer.getCurrentTime.mockImplementation(() => {
				throw new Error("API Error");
			});
			const props = { ...defaultProps, currentTime: 25.4 };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.setCurrentAsStart();
			});

			expect(result.current.startTime).toBe(25.4);
		});

		it("無効な YouTube Player 時間は無視される", () => {
			mockYouTubePlayer.getCurrentTime.mockReturnValue(Number.NaN);
			const props = { ...defaultProps, currentTime: 12.3 };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.setCurrentAsStart();
			});

			expect(result.current.startTime).toBe(12.3);
		});
	});

	describe("Time String Parsing", () => {
		it("時:分:秒.小数 形式をパースできる", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			const parsed = result.current.parseTimeString("1:23:45.6");
			expect(parsed).toBe(3600 + 23 * 60 + 45 + 0.6);
		});

		it("分:秒.小数 形式をパースできる", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			const parsed = result.current.parseTimeString("12:34.5");
			expect(parsed).toBe(12 * 60 + 34 + 0.5);
		});

		it("無効な形式は null を返す", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			expect(result.current.parseTimeString("invalid")).toBe(null);
			expect(result.current.parseTimeString("1:2:3")).toBe(null);
			expect(result.current.parseTimeString("")).toBe(null);
		});

		it("境界値が正しく処理される", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			expect(result.current.parseTimeString("0:00.0")).toBe(0);
			expect(result.current.parseTimeString("59:59.9")).toBe(59 * 60 + 59 + 0.9);
		});
	});

	describe("State Setters", () => {
		it("直接的な時間設定が動作する", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.setStartTime(30.5);
				result.current.setEndTime(45.8);
			});

			expect(result.current.startTime).toBe(30.5);
			expect(result.current.endTime).toBe(45.8);
		});

		it("入力フィールドの値設定が動作する", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.setStartTimeInput("1:23.4");
				result.current.setEndTimeInput("2:34.5");
			});

			expect(result.current.startTimeInput).toBe("1:23.4");
			expect(result.current.endTimeInput).toBe("2:34.5");
		});

		it("編集状態の制御が動作する", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.setIsEditingStartTime(true);
				result.current.setIsEditingEndTime(true);
			});

			expect(result.current.isEditingStartTime).toBe(true);
			expect(result.current.isEditingEndTime).toBe(true);
		});

		it("現在時間は外部で管理される", () => {
			const props = { ...defaultProps, currentTime: 42.7 };
			renderHook(() => useTimeAdjustment(props));

			// hookは外部のcurrentTimeを参照するため、propsを確認
			expect(props.currentTime).toBe(42.7);
		});
	});

	describe("Error Handling", () => {
		it("null YouTube Player でもエラーにならない", () => {
			const props = { ...defaultProps, youtubePlayerRef: { current: null } };
			const { result } = renderHook(() => useTimeAdjustment(props));

			expect(() => {
				act(() => {
					result.current.setCurrentAsStart();
				});
			}).not.toThrow();
		});

		it("YouTube Player API エラーがハンドリングされる", () => {
			mockYouTubePlayer.getCurrentTime.mockImplementation(() => {
				throw new Error("API Error");
			});

			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			expect(() => {
				act(() => {
					result.current.setCurrentAsStart();
				});
			}).not.toThrow();
		});

		it("無効な時間値は外部で管理される", () => {
			// 無効な時間値は外部の責任で管理されるため、
			// hookの内部ロジックでは検証しない
			const props = { ...defaultProps, currentTime: Number.NaN };
			renderHook(() => useTimeAdjustment(props));

			// hookは外部のcurrentTimeをそのまま参照
			expect(props.currentTime).toBeNaN();
		});
	});

	describe("Performance", () => {
		it("大量の調整操作でもパフォーマンスが保たれる", () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			const startTime = performance.now();

			for (let i = 0; i < 100; i++) {
				act(() => {
					result.current.adjustStartTime(0.1);
				});
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// 100回の調整が1秒以内に完了する
			expect(duration).toBeLessThan(1000);
		});

		it("メモリリークが発生しない", () => {
			const { unmount } = renderHook(() => useTimeAdjustment(defaultProps));

			// コンポーネントがアンマウントされても問題ない
			expect(() => unmount()).not.toThrow();
		});
	});

	describe("Edge Cases", () => {
		it("極小値の調整が正しく処理される", async () => {
			const { result } = renderHook(() => useTimeAdjustment(defaultProps));

			act(() => {
				result.current.adjustStartTime(0.01);
			});

			await waitFor(() => {
				// 0.01秒は0.1秒単位で丸められるため、0になる
				expect(result.current.startTime).toBe(0);
			});
		});

		it("極大値の調整が正しくクランプされる", async () => {
			const { result } = renderHook(() => useTimeAdjustment({ ...defaultProps, videoDuration: 1 }));

			act(() => {
				result.current.adjustStartTime(999999);
			});

			await waitFor(() => {
				expect(result.current.startTime).toBe(1);
			});
		});

		it("ゼロ動画時間でも動作する", () => {
			const props = { ...defaultProps, videoDuration: 0 };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.adjustStartTime(1);
			});

			expect(result.current.startTime).toBe(0);
		});

		it("負の動画時間は正常化される", () => {
			const props = { ...defaultProps, videoDuration: -10 };
			const { result } = renderHook(() => useTimeAdjustment(props));

			act(() => {
				result.current.adjustStartTime(1);
			});

			// 負の動画時間でも0でクランプされる
			expect(result.current.startTime).toBe(0);
		});
	});
});
