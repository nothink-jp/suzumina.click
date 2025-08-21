import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AudioButtonTagEditorDetail } from "../audio-button-tag-editor-detail";

// モック
vi.mock("@/app/buttons/actions", () => ({
	updateAudioButtonTags: vi.fn(),
}));

// useRouter is mocked in vitest.setup.ts

describe("AudioButtonTagEditorDetail", () => {
	const defaultProps = {
		audioButtonId: "test-button-id",
		tags: [],
		createdBy: "creator-id",
		currentUserId: undefined,
		currentUserRole: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("権限チェック", () => {
		it("未認証ユーザーには編集権限がない", () => {
			render(<AudioButtonTagEditorDetail {...defaultProps} />);

			expect(screen.queryByText("編集")).not.toBeInTheDocument();
			expect(
				screen.getByText("※ タグを編集するには、ボタンの作成者としてログインする必要があります"),
			).toBeInTheDocument();
		});

		it("作成者には編集権限がある", () => {
			render(<AudioButtonTagEditorDetail {...defaultProps} currentUserId="creator-id" />);

			expect(screen.getByText("編集")).toBeInTheDocument();
			expect(
				screen.queryByText("※ タグを編集するには、ボタンの作成者としてログインする必要があります"),
			).not.toBeInTheDocument();
		});

		it("管理者には編集権限がある", () => {
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					currentUserId="admin-id"
					currentUserRole="admin"
				/>,
			);

			expect(screen.getByText("編集")).toBeInTheDocument();
			expect(
				screen.queryByText("※ タグを編集するには、ボタンの作成者としてログインする必要があります"),
			).not.toBeInTheDocument();
		});

		it("ログインユーザーなら誰でも編集権限がある", () => {
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					currentUserId="other-user-id"
					currentUserRole="member"
				/>,
			);

			expect(screen.getByText("編集")).toBeInTheDocument();
			expect(
				screen.queryByText("※ タグを編集するには、ボタンの作成者としてログインする必要があります"),
			).not.toBeInTheDocument();
		});
	});

	describe("タグ表示", () => {
		it("タグが存在しない場合の表示", () => {
			render(<AudioButtonTagEditorDetail {...defaultProps} currentUserId="creator-id" />);

			expect(
				screen.getByText("タグを追加して音声ボタンを見つけやすくしましょう"),
			).toBeInTheDocument();
			expect(screen.getByText("タグを追加")).toBeInTheDocument();
		});

		it("タグが存在しない場合の未認証ユーザー表示", () => {
			render(<AudioButtonTagEditorDetail {...defaultProps} />);

			expect(screen.getByText("タグはまだ設定されていません")).toBeInTheDocument();
			expect(screen.queryByText("タグを追加")).not.toBeInTheDocument();
		});

		it("既存のタグが表示される", () => {
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["React", "TypeScript", "音声ボタン"]}
					currentUserId="creator-id"
				/>,
			);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
			expect(screen.getByText("音声ボタン")).toBeInTheDocument();
			expect(screen.getByText("「編集」をクリックしてタグを変更できます")).toBeInTheDocument();
		});
	});

	describe("編集機能", () => {
		it("編集モードに入ることができる", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["既存タグ"]}
					currentUserId="creator-id"
				/>,
			);

			const editButton = screen.getByText("編集");
			await user.click(editButton);

			expect(
				screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)"),
			).toBeInTheDocument();
			expect(screen.getByText("保存")).toBeInTheDocument();
			expect(screen.getByText("キャンセル")).toBeInTheDocument();
			expect(screen.queryByText("編集")).not.toBeInTheDocument();
		});

		it("編集をキャンセルできる", async () => {
			const user = userEvent.setup();
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["既存タグ"]}
					currentUserId="creator-id"
				/>,
			);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを変更
			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "新しいタグ");

			// キャンセル
			const cancelButton = screen.getByText("キャンセル");
			await user.click(cancelButton);

			// 元の状態に戻る
			expect(screen.getByText("編集")).toBeInTheDocument();
			expect(screen.getByText("既存タグ")).toBeInTheDocument();
			expect(screen.queryByText("新しいタグ")).not.toBeInTheDocument();
		});

		it("タグを保存できる", async () => {
			const user = userEvent.setup();
			const { updateAudioButtonTags } = await import("@/app/buttons/actions");

			// モックの戻り値を設定
			vi.mocked(updateAudioButtonTags).mockResolvedValue({
				success: true,
			});

			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["既存タグ"]}
					currentUserId="creator-id"
				/>,
			);

			// 編集モードに入る
			const editButton = screen.getByText("編集");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			// 保存
			const saveButton = screen.getByText("保存");
			await user.click(saveButton);

			// updateAudioButtonTagsが呼ばれることを確認
			expect(updateAudioButtonTags).toHaveBeenCalledWith("test-button-id", [
				"既存タグ",
				"新しいタグ",
			]);

			// 編集モードを抜ける
			await waitFor(() => {
				expect(screen.getByText("編集")).toBeInTheDocument();
			});
		});

		it("保存エラーが処理される", async () => {
			const user = userEvent.setup();
			const { updateAudioButtonTags } = await import("@/app/buttons/actions");

			// モックの戻り値を設定（エラー）
			vi.mocked(updateAudioButtonTags).mockResolvedValue({
				success: false,
				error: "保存に失敗しました",
			});

			render(<AudioButtonTagEditorDetail {...defaultProps} tags={[]} currentUserId="creator-id" />);

			// 編集モードに入る
			const editButton = screen.getByText("タグを追加");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			// 保存
			const saveButton = screen.getByText("保存");
			await user.click(saveButton);

			// エラーメッセージが表示される
			await waitFor(() => {
				expect(screen.getByText("保存に失敗しました")).toBeInTheDocument();
			});

			// 編集モードのままである
			expect(screen.getByText("保存")).toBeInTheDocument();
		});

		it("保存中の状態が表示される", async () => {
			const user = userEvent.setup();
			const { updateAudioButtonTags } = await import("@/app/buttons/actions");

			// 保存が時間のかかる処理として設定
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			vi.mocked(updateAudioButtonTags).mockReturnValue(promise);

			render(<AudioButtonTagEditorDetail {...defaultProps} tags={[]} currentUserId="creator-id" />);

			// 編集モードに入る
			const editButton = screen.getByText("タグを追加");
			await user.click(editButton);

			// タグを追加
			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
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

	describe("アクセシビリティ", () => {
		it("適切なセクション構造を持つ", () => {
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["テストタグ"]}
					currentUserId="creator-id"
				/>,
			);

			expect(screen.getByText("タグ")).toBeInTheDocument();
		});

		it("編集ボタンが適切にラベル付けされている", () => {
			render(
				<AudioButtonTagEditorDetail
					{...defaultProps}
					tags={["テストタグ"]}
					currentUserId="creator-id"
				/>,
			);

			const editButton = screen.getByText("編集");
			expect(editButton).toBeInTheDocument();
		});
	});
});
