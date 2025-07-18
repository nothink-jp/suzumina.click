import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VideoTagEditor } from "./video-tag-editor";

// モック
vi.mock("@/app/search/actions", () => ({
	getAutocompleteSuggestions: vi.fn(),
}));

describe("VideoTagEditor", () => {
	const defaultProps = {
		videoId: "test-video-id",
		userTags: [],
		canEdit: true,
		onUpdateTags: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本機能", () => {
		it("初期状態で正しくレンダリングされる", () => {
			render(<VideoTagEditor {...defaultProps} />);

			expect(screen.getByText("みんなのタグ")).toBeInTheDocument();
			expect(screen.getByText("編集")).toBeInTheDocument();
		});

		it("既存のユーザータグが表示される", () => {
			render(<VideoTagEditor {...defaultProps} userTags={["React", "TypeScript"]} />);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
		});

		it("プレイリストタグが表示される", () => {
			render(<VideoTagEditor {...defaultProps} playlistTags={["ゲーム", "配信"]} />);

			expect(screen.getByText("配信タイプ")).toBeInTheDocument();
			expect(screen.getByText("ゲーム")).toBeInTheDocument();
			expect(screen.getByText("配信")).toBeInTheDocument();
		});

		it("カテゴリが表示される", () => {
			render(<VideoTagEditor {...defaultProps} categoryId="20" />);

			expect(screen.getByText("ジャンル")).toBeInTheDocument();
			expect(screen.getByText("ゲーム")).toBeInTheDocument();
		});
	});

	describe("編集機能", () => {
		it("編集モードに入ることができる", async () => {
			const user = userEvent.setup();
			render(<VideoTagEditor {...defaultProps} userTags={["既存タグ"]} />);

			const editButton = screen.getByText("編集");
			await user.click(editButton);

			expect(
				screen.getByPlaceholderText("ユーザータグを入力してEnter (2文字以上で候補表示)"),
			).toBeInTheDocument();
			expect(screen.getByText("保存")).toBeInTheDocument();
			expect(screen.getByText("キャンセル")).toBeInTheDocument();
		});

		it("編集をキャンセルできる", async () => {
			const user = userEvent.setup();
			render(<VideoTagEditor {...defaultProps} userTags={["既存タグ"]} />);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを変更
			const input = screen.getByPlaceholderText(
				"ユーザータグを入力してEnter (2文字以上で候補表示)",
			);
			await user.type(input, "新しいタグ");

			// キャンセル
			const cancelButton = screen.getByText("キャンセル");
			await user.click(cancelButton);

			// 元の状態に戻る
			expect(screen.getByText("編集")).toBeInTheDocument();
			expect(screen.getByText("既存タグ")).toBeInTheDocument();
		});

		it("タグを保存できる", async () => {
			const user = userEvent.setup();
			const mockUpdateTags = vi.fn().mockResolvedValue({ success: true });
			render(
				<VideoTagEditor {...defaultProps} userTags={["既存タグ"]} onUpdateTags={mockUpdateTags} />,
			);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText(
				"ユーザータグを入力してEnter (2文字以上で候補表示)",
			);
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			// 保存
			const saveButton = screen.getByText("保存");
			await user.click(saveButton);

			// onUpdateTagsが呼ばれることを確認
			expect(mockUpdateTags).toHaveBeenCalledWith("test-video-id", ["既存タグ", "新しいタグ"]);
		});

		it("保存エラーが処理される", async () => {
			const user = userEvent.setup();
			const mockUpdateTags = vi.fn().mockResolvedValue({
				success: false,
				error: "保存に失敗しました",
			});
			render(<VideoTagEditor {...defaultProps} userTags={[]} onUpdateTags={mockUpdateTags} />);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText(
				"ユーザータグを入力してEnter (2文字以上で候補表示)",
			);
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			// 保存
			const saveButton = screen.getByText("保存");
			await user.click(saveButton);

			// エラーメッセージが表示される
			await waitFor(() => {
				expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
			});
		});

		it("保存中の状態が表示される", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			const mockUpdateTags = vi.fn().mockReturnValue(promise);
			render(<VideoTagEditor {...defaultProps} userTags={[]} onUpdateTags={mockUpdateTags} />);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText(
				"ユーザータグを入力してEnter (2文字以上で候補表示)",
			);
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			// 保存
			const saveButton = screen.getByText("保存");
			await user.click(saveButton);

			// ローディング状態を確認
			expect(screen.getByText("保存中...")).toBeInTheDocument();
			expect(input).toBeDisabled();

			// 保存完了
			resolvePromise!({ success: true });
			await waitFor(() => {
				expect(screen.getByText("編集")).toBeInTheDocument();
			});
		});
	});

	describe("権限チェック", () => {
		it("編集権限がない場合は編集ボタンが表示されない", () => {
			render(<VideoTagEditor {...defaultProps} canEdit={false} />);

			expect(screen.queryByText("編集")).not.toBeInTheDocument();
		});

		it("編集権限がない場合は適切なメッセージが表示される", () => {
			render(<VideoTagEditor {...defaultProps} canEdit={false} userTags={[]} />);

			expect(screen.getByText("ユーザータグはありません")).toBeInTheDocument();
		});

		it("編集権限がある場合は編集の説明が表示される", () => {
			render(<VideoTagEditor {...defaultProps} canEdit={true} userTags={[]} />);

			expect(
				screen.getByText("タグを追加するには「編集」をクリックしてください"),
			).toBeInTheDocument();
		});
	});

	describe("カテゴリ表示", () => {
		it("未知のカテゴリIDが正しく表示される", () => {
			render(<VideoTagEditor {...defaultProps} categoryId="999" />);

			expect(screen.getByText("カテゴリ999")).toBeInTheDocument();
		});

		it("空のカテゴリIDは表示されない", () => {
			render(<VideoTagEditor {...defaultProps} categoryId="" />);

			expect(screen.queryByText("ジャンル")).not.toBeInTheDocument();
		});
	});
});
