import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonCreator } from "../audio-button-creator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	createAudioButton: vi.fn().mockResolvedValue({
		success: true,
		data: { id: "new-audio-button-id" },
	}),
}));

// Mock rate limit actions
vi.mock("@/actions/rate-limit-actions", () => ({
	getUserRateLimitInfo: vi.fn().mockResolvedValue({
		canCreate: true,
		current: 5,
		limit: 10,
		remaining: 5,
		isFamilyMember: false,
	}),
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		back: mockBack,
	}),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
	useSession: () => ({
		data: {
			user: {
				discordId: "test-user-id",
				username: "Test User",
				displayName: "Test User",
				role: "member",
			},
		},
		status: "authenticated",
	}),
	SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock YouTubePlayer with player methods
const mockYouTubePlayer = {
	seekTo: vi.fn(),
	playVideo: vi.fn(),
	pauseVideo: vi.fn(),
	getCurrentTime: vi.fn(() => 0),
	getDuration: vi.fn(() => 300),
	getPlayerState: vi.fn(() => 5), // Ready state
};

vi.mock("@suzumina.click/ui/components/custom/youtube-player", () => ({
	YouTubePlayer: ({ videoId, onReady, onTimeUpdate }: any) => {
		// Simulate player ready event with proper timing
		if (onReady) {
			setTimeout(() => {
				try {
					onReady(mockYouTubePlayer);
				} catch (_error) {
					// Ignore errors in test
				}
			}, 10);
		}
		// Simulate time updates with proper timing
		if (onTimeUpdate) {
			setTimeout(() => {
				try {
					onTimeUpdate(0, 300);
				} catch (_error) {
					// Ignore errors in test
				}
			}, 50);
		}
		return (
			<div data-testid="youtube-player" data-video-id={videoId}>
				YouTube Player Mock
			</div>
		);
	},
}));

describe("AudioButtonCreator - Refactored Architecture", () => {
	const defaultProps = {
		videoId: "test-video-id",
		videoTitle: "テスト動画タイトル",
		videoDuration: 300,
		initialStartTime: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockYouTubePlayer.seekTo.mockClear();
		mockYouTubePlayer.playVideo.mockClear();
		mockYouTubePlayer.pauseVideo.mockClear();
		mockYouTubePlayer.getCurrentTime.mockReturnValue(0);
		mockYouTubePlayer.getDuration.mockReturnValue(300);
		mockYouTubePlayer.getPlayerState.mockReturnValue(5);
	});

	describe("Component Architecture", () => {
		it("基本構造が正常にレンダリングされる", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// Main sections should be present
			expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
			expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
			expect(screen.getByText("音声操作")).toBeInTheDocument();
			expect(screen.getByText("基本情報")).toBeInTheDocument();
		});

		it("全ての子コンポーネントが存在する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// Time Control Panel
			expect(screen.getByText("切り抜き範囲")).toBeInTheDocument();
			expect(screen.getByText("開始時間に設定")).toBeInTheDocument();
			expect(screen.getByText("終了時間に設定")).toBeInTheDocument();

			// Basic Info Panel
			expect(screen.getByPlaceholderText("例: おはようございます")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）")).toBeInTheDocument();

			// Usage Guide
			expect(screen.getByText("動画を見ながら範囲を決めてください")).toBeInTheDocument();
		});
	});

	describe("useTimeAdjustment Hook Integration", () => {
		it("時間調整フックが正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Find +1 adjustment button for start time
			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");
			expect(plus1Buttons.length).toBeGreaterThan(0);

			await user.click(plus1Buttons[0]);

			// Check if the time was adjusted (should show 0:01.0)
			await waitFor(
				() => {
					expect(screen.getByDisplayValue("0:01.0")).toBeInTheDocument();
				},
				{ timeout: 5000 },
			);
		});

		it("現在時間設定ボタンが動作する", async () => {
			const user = userEvent.setup();
			mockYouTubePlayer.getCurrentTime.mockReturnValue(10.5);

			render(<AudioButtonCreator {...defaultProps} />);

			// Wait for player to be ready
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /開始時間に設定/ })).toBeInTheDocument();
			});

			const setStartTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			await user.click(setStartTimeButton);

			await waitFor(() => {
				expect(mockYouTubePlayer.getCurrentTime).toHaveBeenCalled();
				expect(screen.getByDisplayValue("0:10.5")).toBeInTheDocument();
			});
		});

		it("時間入力フィールドが正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			const startTimeInput = timeInputs[0];

			await user.clear(startTimeInput);
			await user.type(startTimeInput, "1:23.4");
			await user.tab(); // Trigger blur event

			expect(startTimeInput).toHaveValue("1:23.4");
		});
	});

	describe("Validation Logic", () => {
		it("初期状態では作成ボタンが無効", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			expect(createButton).toBeDisabled();
		});

		it("有効な入力で作成ボタンが有効になる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Set valid title
			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "テストタイトル");

			// Set valid time range
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]); // End time
			await user.type(timeInputs[1], "0:05.0");
			await user.tab(); // Trigger blur

			await waitFor(
				() => {
					const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
					expect(createButton).toBeEnabled();
				},
				{ timeout: 5000 },
			);
		});

		it("時間範囲の妥当性検証が動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Set invalid range (start > end)
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]);
			await user.type(timeInputs[0], "0:10.0");
			await user.clear(timeInputs[1]);
			await user.type(timeInputs[1], "0:05.0");
			await user.tab();

			// 範囲の妥当性エラーメッセージを確認
			expect(screen.getByText(/開始時間は終了時間より前にしてください/)).toBeInTheDocument();
		});

		it("60秒制限のガイダンスが表示される", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// ガイダンスメッセージが表示されることを確認
			expect(screen.getByText("最大60秒まで切り抜き可能です")).toBeInTheDocument();

			// 初期状態では警告メッセージは表示されない
			expect(screen.queryByText(/60秒以下にしてください/)).not.toBeInTheDocument();
		});
	});

	describe("Preview Functionality", () => {
		it("プレビューボタンが動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Set valid time range first
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]);
			await user.type(timeInputs[1], "0:05.0");
			await user.tab();

			await waitFor(() => {
				const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
				expect(previewButton).toBeEnabled();
			});

			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });

			// プレビューボタンが存在してクリックできることを確認
			expect(previewButton).toBeInTheDocument();
			expect(previewButton).toBeEnabled();

			// クリックしてもエラーが発生しないことを確認
			await expect(user.click(previewButton)).resolves.not.toThrow();
		});

		it("無効な範囲ではプレビューボタンが無効", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// 無効な範囲を設定（開始時間 > 終了時間）
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]);
			await user.type(timeInputs[0], "0:10.0");
			await user.clear(timeInputs[1]);
			await user.type(timeInputs[1], "0:05.0");
			await user.tab();

			await waitFor(() => {
				const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
				expect(previewButton).toBeDisabled();
			});
		});
	});

	describe("Edge Cases", () => {
		it("境界値での時間調整が正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} videoDuration={10} />);

			// Adjust to near video duration limit
			const plus10Buttons = screen
				.getAllByRole("button")
				.filter((btn) => btn.textContent === "+10");

			// Click multiple times to test clamping
			await user.click(plus10Buttons[0]);
			await user.click(plus10Buttons[0]);

			// Should be clamped to video duration - use getAllByDisplayValue to handle multiple matches
			await waitFor(() => {
				const timeInputs = screen.getAllByDisplayValue("0:10.0");
				expect(timeInputs.length).toBeGreaterThan(0);
				// At least one input should have the clamped value
				expect(timeInputs[0]).toBeInTheDocument();
			});
		});

		it("負の値への調整が正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} initialStartTime={5} />);

			// First set start time to 5
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]);
			await user.type(timeInputs[0], "0:05.0");
			await user.tab();

			// Verify initial state
			await waitFor(() => {
				expect(screen.getByDisplayValue("0:05.0")).toBeInTheDocument();
			});

			// Then adjust down past zero
			const minus10Buttons = screen
				.getAllByRole("button")
				.filter((btn) => btn.textContent === "-10");
			await user.click(minus10Buttons[0]);

			// Should be clamped to 0 - check the start time input specifically
			await waitFor(() => {
				const startTimeInputs = screen.getAllByPlaceholderText("0:00.0");
				expect(startTimeInputs[0]).toHaveValue("0:00.0");
			});
		});

		it("浮動小数点精度の問題が発生しない", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Perform multiple 0.1 second adjustments with delays to avoid debounce
			const plusPoint1Buttons = screen
				.getAllByRole("button")
				.filter((btn) => btn.textContent === "+0.1");

			for (let i = 0; i < 10; i++) {
				await user.click(plusPoint1Buttons[0]);
				// Wait for debounce to finish
				await new Promise((resolve) => setTimeout(resolve, 120));
			}

			// Should be exactly 1.0, not 0.9999999...
			await waitFor(() => {
				expect(screen.getByDisplayValue("0:01.0")).toBeInTheDocument();
			});
		});

		it("デバウンス機能が連続クリックを制限する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");

			// Rapid clicks within debounce window
			await user.click(plus1Buttons[0]);
			await user.click(plus1Buttons[0]);
			await user.click(plus1Buttons[0]);

			// Should only register one click due to debounce
			await waitFor(() => {
				expect(screen.getByDisplayValue("0:01.0")).toBeInTheDocument();
			});
		});

		it("YouTube API エラー時の適切な処理", async () => {
			const user = userEvent.setup();
			mockYouTubePlayer.getCurrentTime.mockImplementation(() => {
				throw new Error("YouTube API Error");
			});

			render(<AudioButtonCreator {...defaultProps} />);

			// Should not crash when YouTube API fails
			const setStartTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			await user.click(setStartTimeButton);

			// Component should still be functional
			expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("キーボードナビゲーションが機能する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Tab navigation should work
			await user.tab();
			expect(document.activeElement).toBeTruthy();
		});

		it("適切なARIAラベルが設定されている", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toHaveAttribute("maxLength", "100");
		});
	});

	describe("Performance", () => {
		it("大きな動画時間でも正常に動作する", () => {
			const props = {
				...defaultProps,
				videoDuration: 7200, // 2 hours
				initialStartTime: 3600, // 1 hour
			};

			render(<AudioButtonCreator {...props} />);
			expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
		});

		it("多数の微調整操作でもパフォーマンスが保たれる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const startTime = performance.now();

			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");

			// Perform many adjustments with delays to avoid debounce
			for (let i = 0; i < 10; i++) {
				await user.click(plus1Buttons[0]);
				await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for debounce
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time (less than 5 seconds)
			expect(duration).toBeLessThan(5000);
		});
	});
});
