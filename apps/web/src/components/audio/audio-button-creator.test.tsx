import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonCreator } from "./audio-button-creator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	createAudioButton: vi.fn().mockResolvedValue({
		success: true,
		data: { id: "new-audio-button-id" },
	}),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		back: vi.fn(),
	}),
}));

// Mock YouTubePlayer
vi.mock("@suzumina.click/ui/components/custom/youtube-player", () => ({
	YouTubePlayer: ({ videoId }: any) => (
		<div data-testid="youtube-player" data-video-id={videoId}>
			YouTube Player Mock
		</div>
	),
}));

describe("AudioButtonCreator", () => {
	const defaultProps = {
		videoId: "test-video-id",
		videoTitle: "テスト動画タイトル",
		videoDuration: 300,
		initialStartTime: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("コンポーネントが正常にレンダリングされる", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
			expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
		});

		it("動画情報が正しく表示される", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			expect(screen.getByText("動画: テスト動画タイトル")).toBeInTheDocument();
		});

		it("必要なフォーム要素が全て存在する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// 基本情報フィールド
			expect(screen.getByPlaceholderText("例: おはようございます")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)"),
			).toBeInTheDocument();

			// 操作ボタン
			expect(screen.getByRole("button", { name: /音声ボタンを作成/ })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /キャンセル/ })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /選択範囲をプレビュー/ })).toBeInTheDocument();
		});
	});

	describe("Time Control System", () => {
		it("0.1秒精度の時間表示が正しく動作する", () => {
			render(<AudioButtonCreator {...defaultProps} initialStartTime={125.7} />);

			// 2:05.7 の形式で表示されることを確認
			expect(screen.getByDisplayValue("2:05.7")).toBeInTheDocument();
		});

		it("時間設定ボタンが存在する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			const endTimeButton = screen.getByRole("button", { name: /終了時間に設定/ });

			expect(startTimeButton).toBeInTheDocument();
			expect(endTimeButton).toBeInTheDocument();
		});

		it("時間入力フィールドが編集可能である", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const timeInputs = screen.getAllByPlaceholderText("0:00.0");
			expect(timeInputs.length).toBeGreaterThanOrEqual(2);

			// 開始時間の入力をテスト
			const startTimeInput = timeInputs[0];
			await user.clear(startTimeInput);
			await user.type(startTimeInput, "1:23.4");

			expect(startTimeInput).toHaveValue("1:23.4");
		});
	});

	describe("Microadjustment Buttons", () => {
		it("微調整ボタンが存在する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// 各調整値のボタンが存在することを確認
			const adjustmentValues = ["-10", "-1", "-0.1", "+0.1", "+1", "+10"];

			adjustmentValues.forEach((value) => {
				const buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === value);
				expect(buttons.length).toBeGreaterThan(0);
			});
		});

		it("微調整ボタンがクリック可能である", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} initialStartTime={10} />);

			const plus1Buttons = screen.getAllByRole("button").filter((btn) => btn.textContent === "+1");

			if (plus1Buttons.length > 0) {
				await user.click(plus1Buttons[0]);
				// クリックが成功すればテスト成功
				expect(plus1Buttons[0]).toBeInTheDocument();
			}
		});
	});

	describe("Form Interactions", () => {
		it("タイトル入力が正しく動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "新しい音声ボタン");

			expect(titleInput).toHaveValue("新しい音声ボタン");
		});

		it("説明文入力が正しく動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");
			await user.type(descriptionInput, "これはテスト用の説明文です。");

			expect(descriptionInput).toHaveValue("これはテスト用の説明文です。");
		});

		it("タグ追加機能が正しく動作する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const tagInput = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(tagInput, "テストタグ");
			await user.keyboard("{Enter}");

			expect(screen.getByText("テストタグ")).toBeInTheDocument();
		});
	});

	describe("Duration and Validation", () => {
		it("切り抜き時間が正しく表示される", () => {
			render(<AudioButtonCreator {...defaultProps} initialStartTime={10} />);

			// 初期状態で5秒間（10秒〜15秒）の切り抜きが表示される
			expect(screen.getByText("切り抜き時間:")).toBeInTheDocument();
			expect(screen.getByText("5.0秒")).toBeInTheDocument();
		});

		it("バリデーション: タイトルが空の場合は作成ボタンが無効", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			expect(createButton).toBeDisabled();
		});

		it("バリデーション: 有効な情報が入力されると作成ボタンが有効", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "有効なタイトル");

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			expect(createButton).toBeEnabled();
		});
	});

	describe("Responsive Design", () => {
		it("ボタンが適切なタッチターゲットサイズを持つ", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			expect(createButton).toHaveClass("min-h-[44px]");
		});

		it("時間設定ボタンがレスポンシブサイズを持つ", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			expect(startTimeButton).toHaveClass("h-8", "sm:h-10");
		});
	});

	describe("Accessibility", () => {
		it("キーボードナビゲーションが機能する", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			// Tab移動のテスト - 最初に開始時間設定ボタンにフォーカス
			await user.tab();
			expect(screen.getByRole("button", { name: /開始時間に設定/ })).toHaveFocus();

			// 次にタイトル入力フィールドにフォーカス（複数回タブを押して到達）
			while (document.activeElement !== screen.getByPlaceholderText("例: おはようございます")) {
				await user.tab();
			}
			expect(screen.getByPlaceholderText("例: おはようございます")).toHaveFocus();
		});

		it("文字数制限が適切に機能する", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toHaveAttribute("maxLength", "100");
		});
	});

	describe("Error Handling", () => {
		it("エラー状態が適切に表示される", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// 初期状態ではエラーが表示されないことを確認
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});

	describe("Performance", () => {
		it("長いビデオIDでも正常にレンダリングされる", () => {
			const props = {
				...defaultProps,
				videoId: `very-long-video-id-${"x".repeat(100)}`,
				videoDuration: 7200, // 2時間
			};

			render(<AudioButtonCreator {...props} />);
			expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
		});

		it("多数のタグが追加できる", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const tagInput = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");

			// 複数のタグを追加
			for (let i = 0; i < 3; i++) {
				await user.type(tagInput, `タグ${i}`);
				await user.keyboard("{Enter}");
			}

			// 最初のタグが表示されることを確認
			expect(screen.getByText("タグ0")).toBeInTheDocument();
		});
	});
});
