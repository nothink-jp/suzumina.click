import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CREATE_ENTRY } from "@/lib/analytics/create-entry";
import { mockUseSession } from "@/test-utils/auth";
import { AudioButtonCreator } from "../audio-button-creator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	createAudioButton: vi.fn().mockResolvedValue({
		success: true,
		data: { id: "new-audio-button-id" },
	}),
}));

// Mock draft actions（連続仕上げ・SPR-266）
const mockDeleteButtonDraft = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/actions/button-drafts", () => ({
	deleteButtonDraft: (draftId: string) => mockDeleteButtonDraft(draftId),
}));

// GA4 の作成ファネルだけ差し替える（AI候補パネルも同じモジュールを使うため他は実体のまま）
const mockTrackCreateStart = vi.fn();
const mockTrackCreateSuccess = vi.fn();
vi.mock("@/lib/analytics/events", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/events")>()),
	trackCreateStart: (input: unknown) => mockTrackCreateStart(input),
	trackCreateSuccess: (input: unknown) => mockTrackCreateSuccess(input),
}));

const mockGetVideoTranscriptChunk = vi.fn();
vi.mock("@/actions/video-transcription", () => ({
	getVideoTranscriptChunk: (input: unknown) => mockGetVideoTranscriptChunk(input),
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

// Mock 認証抽象（既定はログイン済み。beforeEach で設定）
vi.mock("@/lib/auth/client");

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
		entry: CREATE_ENTRY.detailClip,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession({ discordId: "test-user-id", username: "Test User", displayName: "Test User" });
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
			expect(screen.getByTestId("clip-trim-lane")).toBeInTheDocument();
			expect(screen.getByText(/ボタンタイトル/)).toBeInTheDocument();
		});

		it("全ての子コンポーネントが存在する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// Time Control Panel
			expect(screen.getByText("切り抜き範囲")).toBeInTheDocument();
			expect(screen.getByText("開始時間に設定")).toBeInTheDocument();
			expect(screen.getByText("終了時間に設定")).toBeInTheDocument();

			// Basic Info Panel（説明は既定で折りたたまれている・SPR-290）
			expect(screen.getByPlaceholderText("例: おはようございます")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /説明を追加/ })).toBeInTheDocument();

			// Usage Guide
			expect(screen.getByText("動画を見ながら範囲を決めてください")).toBeInTheDocument();
		});
	});

	describe("固定アクションバー・作成して次を切り抜く (SPR-290)", () => {
		it("押せない理由がバーに表示され、入力すると消える", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			expect(screen.getByText("タイトルを入力すると作成できます")).toBeInTheDocument();

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "タイトル");
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
			await user.tab();

			await waitFor(() => {
				expect(screen.queryByText("タイトルを入力すると作成できます")).not.toBeInTheDocument();
			});
		});

		it("作成して次を切り抜く: 遷移せずタイトルだけリセットして残留する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} madeMarks={[500]} />);

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "連続作成ボタン");
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
			await user.tab();

			const continueButton = screen.getByRole("button", { name: "作成して次を切り抜く" });
			await waitFor(() => expect(continueButton).toBeEnabled());
			await user.click(continueButton);

			// 遷移せず残留し、タイトルはリセット・時刻は維持
			await waitFor(() => {
				expect(screen.getByText(/「連続作成ボタン」を作成しました/)).toBeInTheDocument();
			});
			expect(mockPush).not.toHaveBeenCalled();
			expect(window.location.href).not.toContain("/buttons/new-audio-button-id");
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("");
			expect(screen.getByDisplayValue("0:05.0")).toBeInTheDocument();
			// 作成済みマークが即時反映される（500 と 0 の2箇所）
			expect(screen.getAllByTestId("explore-made-mark")).toHaveLength(2);
		});

		it("下書き起点の最後の1件を continue で仕上げたら activeDraftId がクリアされる（AIレビュー対応）", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[
						{
							id: "draft-1",
							videoId: "test-video-id",
							videoTitle: "テスト動画タイトル",
							playerTime: 45,
							markedAt: "2026-07-15T12:00:00.000Z",
							createdAt: "2026-07-15T12:00:00.000Z",
							suggestedStartTime: 30,
						},
					]}
					draftMarks={[30]}
				/>,
			);

			// 1回目: 下書きを continue で仕上げる → 消化される
			await user.type(screen.getByPlaceholderText("例: おはようございます"), "下書きから作成");
			const continueButton = screen.getByRole("button", { name: "作成して次を切り抜く" });
			await waitFor(() => expect(continueButton).toBeEnabled());
			await user.click(continueButton);

			await waitFor(() => {
				expect(mockDeleteButtonDraft).toHaveBeenCalledTimes(1);
			});
			await waitFor(() => {
				expect(screen.queryAllByTestId("explore-draft-mark")).toHaveLength(0);
			});

			// 2回目: 同じ画面で続けて作成 → もう下書き由来ではない＝再削除されない
			await user.type(screen.getByPlaceholderText("例: おはようございます"), "続けて作成");
			await user.click(screen.getByRole("button", { name: "作成して次を切り抜く" }));

			await waitFor(() => {
				expect(screen.getByText(/「続けて作成」を作成しました/)).toBeInTheDocument();
			});
			expect(mockDeleteButtonDraft).toHaveBeenCalledTimes(1);
		});

		it("下書きキュー進行中は「作成して次を切り抜く」を出さない（作成自体が次へ進む）", () => {
			render(
				<AudioButtonCreator
					{...defaultProps}
					draftId="draft-1"
					videoDrafts={[
						{
							id: "draft-1",
							videoId: "test-video-id",
							videoTitle: "テスト動画タイトル",
							playerTime: 45,
							markedAt: "2026-07-15T12:00:00.000Z",
							createdAt: "2026-07-15T12:00:00.000Z",
							suggestedStartTime: 30,
						},
						{
							id: "draft-2",
							videoId: "test-video-id",
							videoTitle: "テスト動画タイトル",
							playerTime: 135,
							markedAt: "2026-07-15T12:00:00.000Z",
							createdAt: "2026-07-15T12:00:00.000Z",
							suggestedStartTime: 120,
						},
					]}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: "作成して次を切り抜く" }),
			).not.toBeInTheDocument();
		});
	});

	describe("発話スナップ・タイトルプリフィル (SPR-292)", () => {
		beforeEach(() => {
			mockGetVideoTranscriptChunk.mockResolvedValue({
				success: true,
				data: {
					chunkIndex: 0,
					utterances: [{ start: 3, end: 5, text: "なんで落とすんですか" }],
				},
			});
		});

		it("読み込みボタンで発話を取得し、行クリックでスナップ＋タイトルプリフィルされる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ }));
			await waitFor(() => {
				expect(screen.getByTestId("utterance-row")).toBeInTheDocument();
			});
			expect(mockGetVideoTranscriptChunk).toHaveBeenCalledWith({
				videoId: "test-video-id",
				chunkIndex: 0,
			});

			await user.click(screen.getByTestId("utterance-row"));

			// スナップ: 3-0.15=2.9 / 5+0.35=5.4、タイトルは発話テキストで初期化
			await waitFor(() => {
				expect(screen.getByDisplayValue("0:02.9")).toBeInTheDocument();
			});
			expect(screen.getByDisplayValue("0:05.4")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue(
				"なんで落とすんですか",
			);
			// トリムレーンにも発話ブロックが出る
			expect(screen.getAllByTestId("lane-utterance").length).toBeGreaterThan(0);
		});

		it("タイトル入力済みならプリフィルで上書きしない", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "手入力タイトル");
			await user.click(screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ }));
			await waitFor(() => {
				expect(screen.getByTestId("utterance-row")).toBeInTheDocument();
			});
			await user.click(screen.getByTestId("utterance-row"));

			await waitFor(() => {
				expect(screen.getByDisplayValue("0:02.9")).toBeInTheDocument();
			});
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("手入力タイトル");
		});

		it("Shift＋クリックで現在区間を発話まで広げる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} initialStartTime={20} />);

			await user.click(screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ }));
			await waitFor(() => {
				expect(screen.getByTestId("utterance-row")).toBeInTheDocument();
			});
			// 現在区間 20-30、発話 2.9-5.4 → Shift クリックで 2.9-30 に拡張
			fireEvent.click(screen.getByTestId("utterance-row"), { shiftKey: true });

			await waitFor(() => {
				expect(screen.getByDisplayValue("0:02.9")).toBeInTheDocument();
			});
			expect(screen.getByDisplayValue("0:30.0")).toBeInTheDocument();
			// 拡張ではタイトルを入れない
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("");
		});

		it("取得失敗はエラー表示のみで既存フローに影響しない", async () => {
			const user = userEvent.setup();
			mockGetVideoTranscriptChunk.mockResolvedValue({
				success: false,
				error: "ログインが必要です",
			});
			render(<AudioButtonCreator {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /再生位置の周辺の発話を読み込む/ }));
			await waitFor(() => {
				expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
			});
			// フォームは通常どおり使える
			expect(screen.getByPlaceholderText("例: おはようございます")).toBeEnabled();
		});
	});

	describe("Explore Lane Marks (SPR-289)", () => {
		it("マークとサマリーカードが表示される", () => {
			render(<AudioButtonCreator {...defaultProps} madeMarks={[5, 20]} draftMarks={[40]} />);

			expect(screen.getAllByTestId("explore-made-mark")).toHaveLength(2);
			expect(screen.getAllByTestId("explore-draft-mark")).toHaveLength(1);
			expect(screen.getByText("この動画からの作成")).toBeInTheDocument();
			expect(screen.getByText(/作成済み 2個 ・ 下書き 1個/)).toBeInTheDocument();
		});

		it("マーク未指定（未ログイン相当）でも探索レーンは表示される", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			expect(screen.getByTestId("clip-explore-lane")).toBeInTheDocument();
			expect(screen.getByText(/作成済み 0個/)).toBeInTheDocument();
		});
	});

	describe("useTimeAdjustment Hook Integration", () => {
		it("時間調整フックが正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Find +1 adjustment button for start time
			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");
			expect(plus1Buttons.length).toBeGreaterThan(0);

			await user.click(plus1Buttons[0]!);

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

			// プレイヤー ready（モックは 10ms 遅延で onReady）を待ってからクリックする。
			// ready 前にクリックすると youtubePlayerRef が null で currentTime(0) にフォールバックし
			// 恒久的に失敗する（ready 後は 100ms ポーリングが getCurrentTime を呼ぶ＝ready の観測点）
			await waitFor(() => {
				expect(mockYouTubePlayer.getCurrentTime).toHaveBeenCalled();
			});

			const setStartTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			await user.click(setStartTimeButton);

			await waitFor(() => {
				expect(screen.getByDisplayValue("0:10.5")).toBeInTheDocument();
			});
		});

		it("時間入力フィールドが正常に動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			const startTimeInput = timeInputs[0]!;

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
			await user.clear(timeInputs[1]!); // End time
			await user.type(timeInputs[1]!, "0:05.0");
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
			await user.clear(timeInputs[0]!);
			await user.type(timeInputs[0]!, "0:10.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
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

	describe("Audition Functionality (SPR-288)", () => {
		it("ループ再生ボタンでシークと再生が始まり、停止表示に切り替わる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Set valid time range first
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
			await user.tab();

			const loopButton = screen.getByRole("button", { name: /区間をループ再生/ });
			await waitFor(() => expect(loopButton).toBeEnabled());
			await user.click(loopButton);

			// プリロール既定 ON: 開始0秒 - 1.5秒 は 0 にクランプされる
			expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(0, true);
			expect(mockYouTubePlayer.playVideo).toHaveBeenCalled();
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /停止/ })).toBeInTheDocument();
			});
		});

		it("無効な範囲では試聴ボタンが無効", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// 無効な範囲を設定（開始時間 > 終了時間）
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]!);
			await user.type(timeInputs[0]!, "0:10.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
			await user.tab();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /区間をループ再生/ })).toBeDisabled();
				expect(screen.getByRole("button", { name: "頭を聴く" })).toBeDisabled();
			});
		});
	});

	describe("Edge Cases", () => {
		it("動画長を超える入力がクランプされる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// プレイヤーの実長 300 秒を超える値を直接入力
			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]!);
			await user.type(timeInputs[0]!, "9:00.0");
			await user.tab();

			// 300 秒 = 5:00.0 でクランプ
			await waitFor(() => {
				expect(screen.getByDisplayValue("5:00.0")).toBeInTheDocument();
			});
		});

		it("負の値への調整が0でクランプされる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[0]!);
			await user.type(timeInputs[0]!, "0:00.5");
			await user.tab();

			await waitFor(() => {
				expect(screen.getByDisplayValue("0:00.5")).toBeInTheDocument();
			});

			// -1 で 0 を下回る調整 → 0 でクランプ
			const minus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "-1");
			await user.click(minus1Buttons[0]!);

			await waitFor(() => {
				const startTimeInputs = screen.getAllByPlaceholderText("0:00.0");
				expect(startTimeInputs[0]).toHaveValue("0:00.0");
			});
		});

		it("浮動小数点精度の問題が発生しない", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// スロットル撤廃（SPR-288）後は待ち時間なしの連打が全て累積する
			const plusPoint1Buttons = screen
				.getAllByRole("button")
				.filter((btn) => btn.textContent === "+0.1");

			for (let i = 0; i < 10; i++) {
				await user.click(plusPoint1Buttons[0]!);
			}

			// Should be exactly 1.0, not 0.9999999...
			await waitFor(() => {
				expect(screen.getByDisplayValue("0:01.0")).toBeInTheDocument();
			});
		});

		it("連続クリックが間引かれず全て反映される（SPR-288 スロットル撤廃）", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");

			await user.click(plus1Buttons[0]!);
			await user.click(plus1Buttons[0]!);
			await user.click(plus1Buttons[0]!);

			await waitFor(() => {
				expect(screen.getByDisplayValue("0:03.0")).toBeInTheDocument();
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

	describe("作成完了・キャンセルの遷移", () => {
		// 成功・キャンセルはいずれも create セグメント外へ遷移し instance が unmount されるため、
		// 遷移先が描画されるまでフォームを空白化せず「作成中…」を維持する（ちらつき防止）。
		// 同一セグメント別動画の値残留は page 側の key（videoId+startTime）で remount して防ぐ。
		it("作成成功で詳細ページへ遷移し、遷移中はフォームを空白化せず作成中表示を維持する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// タイトルと有効な時間範囲を入力
			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "作成するタイトル");

			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			await user.clear(timeInputs[1]!);
			await user.type(timeInputs[1]!, "0:05.0");
			await user.tab();

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);

			// 詳細ページへフルロード遷移する（router.push だと @modal にインターセプトされるため。SPR-252）
			await waitFor(() => {
				expect(window.location.href).toContain("/buttons/new-audio-button-id");
			});
			expect(mockPush).not.toHaveBeenCalled();

			// 遷移完了まで「作成中…」を維持し、フォームは空白化しない（ちらつき防止）
			expect(screen.getByRole("button", { name: /作成中/ })).toBeInTheDocument();
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("作成するタイトル");
		});

		it("キャンセルで前のページへ戻る", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "入力途中のタイトル");

			await user.click(screen.getByRole("button", { name: "キャンセル" }));

			expect(mockBack).toHaveBeenCalled();
		});

		it("別動画で再訪（key 変更）するとフォームが初期状態へ作り直される", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<AudioButtonCreator key="video-a" {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "前回のタイトル");
			expect(titleInput).toHaveValue("前回のタイトル");

			// page 側の key 変更（別動画への遷移）を模した remount
			rerender(<AudioButtonCreator key="video-b" {...defaultProps} videoId="other-video" />);

			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("");
		});
	});

	describe("連続仕上げ（下書きキュー・SPR-266 第2段）", () => {
		const makeDraft = (id: string, suggestedStartTime: number) => ({
			id,
			videoId: "test-video-id",
			videoTitle: "テスト動画タイトル",
			playerTime: suggestedStartTime + 15,
			markedAt: "2026-07-15T12:00:00.000Z",
			createdAt: "2026-07-15T12:00:00.000Z",
			suggestedStartTime,
		});

		async function createWithTitle(user: ReturnType<typeof userEvent.setup>, title: string) {
			await user.type(screen.getByPlaceholderText("例: おはようございます"), title);
			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			await waitFor(() => expect(createButton).toBeEnabled());
			await user.click(createButton);
		}

		it("「作成して次の下書きへ」で遷移せず次の下書きへ進む（フォームリセット＋プレイヤー維持）", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30), makeDraft("draft-2", 120)]}
				/>,
			);

			// キュー帯（0の帯）に位置と時刻チップが見えている
			expect(screen.getByText("マーク棚から 2件")).toBeInTheDocument();
			expect(screen.getByText(/1件目 \/ 2/)).toBeInTheDocument();

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "1個目のボタン");
			const continueButton = screen.getByRole("button", {
				name: "作成して次の下書きへ（残り1）",
			});
			await waitFor(() => expect(continueButton).toBeEnabled());
			await user.click(continueButton);

			// 消化（削除）される
			await waitFor(() => {
				expect(mockDeleteButtonDraft).toHaveBeenCalledWith("draft-1");
			});
			// 遷移せずフォームが次の下書きへ: タイトルはリセット・開始時間は次の下書きの推奨秒
			expect(mockPush).not.toHaveBeenCalled();
			expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveValue("");
			await waitFor(() => {
				expect(screen.getByDisplayValue("2:00.0")).toBeInTheDocument();
			});
			// プレイヤーは遷移せず seek で次の位置へ
			expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(120, true);
			// 成功バナーが出る（作成したボタンへは新規タブリンク）
			expect(screen.getByText(/「1個目のボタン」を作成しました/)).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /開く/ })).toHaveAttribute(
				"href",
				"/buttons/new-audio-button-id",
			);
		});

		it("create_entry は1本目が入口・2本目以降は queue_continue になる（SPR-296）", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					entry={CREATE_ENTRY.watchBulk}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30), makeDraft("draft-2", 120)]}
				/>,
			);

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "1個目のボタン");
			const continueButton = screen.getByRole("button", {
				name: "作成して次の下書きへ（残り1）",
			});
			await waitFor(() => expect(continueButton).toBeEnabled());
			await user.click(continueButton);

			// 1本目は URL 由来の入口のまま
			expect(mockTrackCreateStart).toHaveBeenLastCalledWith({
				videoId: "test-video-id",
				fromDraft: true,
				entry: "watch_bulk",
			});
			await waitFor(() => {
				expect(mockTrackCreateSuccess).toHaveBeenLastCalledWith(
					expect.objectContaining({ entry: "watch_bulk" }),
				);
			});

			// 2本目は遷移していない＝URL は変わらないので、実行時に queue_continue へ切り替わる
			await createWithTitle(user, "2個目のボタン");
			expect(mockTrackCreateStart).toHaveBeenLastCalledWith({
				videoId: "test-video-id",
				fromDraft: true,
				entry: "queue_continue",
			});
			await waitFor(() => {
				expect(mockTrackCreateSuccess).toHaveBeenLastCalledWith(
					expect.objectContaining({ entry: "queue_continue" }),
				);
			});
		});

		it("主ボタン「音声ボタンを作成」はキューが残っていても詳細ページへフルロード遷移する（続行は毎回選ぶ・段4）", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30), makeDraft("draft-2", 120)]}
				/>,
			);

			await createWithTitle(user, "抜けるボタン");

			await waitFor(() => {
				expect(mockDeleteButtonDraft).toHaveBeenCalledWith("draft-1");
			});
			await waitFor(() => {
				expect(window.location.href).toContain("/buttons/new-audio-button-id");
			});
		});

		it("最後の下書きなら従来どおり詳細ページへフルロード遷移する", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30)]}
				/>,
			);

			await createWithTitle(user, "最後のボタン");

			await waitFor(() => {
				expect(mockDeleteButtonDraft).toHaveBeenCalledWith("draft-1");
			});
			await waitFor(() => {
				expect(window.location.href).toContain("/buttons/new-audio-button-id");
			});
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("スキップは下書きを消化せず次へ進む", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30), makeDraft("draft-2", 120)]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /スキップして次へ/ }));

			expect(mockDeleteButtonDraft).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(screen.getByDisplayValue("2:00.0")).toBeInTheDocument();
			});
			// キューが尽きたら「最後の下書き」の案内に変わり、位置表示も進む
			expect(screen.getByText("最後の下書きです")).toBeInTheDocument();
			expect(screen.getByText(/2件目 \/ 2/)).toBeInTheDocument();
		});

		it("下書きキューなし（通常作成）ではキュー帯を出さず、副アクションは従来の文言", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			expect(screen.queryByText(/マーク棚から/)).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "作成して次を切り抜く" })).toBeInTheDocument();
		});

		it("作成成功で消化した下書きのマークが探索レーンから消える（SPR-289 レビュー対応）", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonCreator
					{...defaultProps}
					initialStartTime={30}
					draftId="draft-1"
					videoDrafts={[makeDraft("draft-1", 30), makeDraft("draft-2", 120)]}
					draftMarks={[30, 120]}
					madeMarks={[500]}
				/>,
			);

			expect(screen.getAllByTestId("explore-draft-mark")).toHaveLength(2);
			expect(screen.getByText(/作成済み 1個 ・ 下書き 2個/)).toBeInTheDocument();

			await user.type(screen.getByPlaceholderText("例: おはようございます"), "1個目のボタン");
			const continueButton = screen.getByRole("button", {
				name: "作成して次の下書きへ（残り1）",
			});
			await waitFor(() => expect(continueButton).toBeEnabled());
			await user.click(continueButton);

			await waitFor(() => {
				expect(mockDeleteButtonDraft).toHaveBeenCalledWith("draft-1");
			});
			// 消化した draft-1（30秒）のマークが消え、作成済みマークが増える
			await waitFor(() => {
				expect(screen.getAllByTestId("explore-draft-mark")).toHaveLength(1);
			});
			expect(screen.getAllByTestId("explore-made-mark")).toHaveLength(2);
			expect(screen.getByText(/作成済み 2個 ・ 下書き 1個/)).toBeInTheDocument();
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
				await user.click(plus1Buttons[0]!);
				await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for debounce
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Should complete within reasonable time (less than 5 seconds)
			expect(duration).toBeLessThan(5000);
		});
	});
});
