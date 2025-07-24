import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "../tag-input";

describe("TagInput", () => {
	const defaultProps = {
		tags: [],
		onTagsChange: vi.fn(),
		maxTags: 10,
		maxTagLength: 30,
		placeholder: "タグを入力...",
		disabled: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本機能", () => {
		it("初期状態で正しくレンダリングされる", () => {
			render(<TagInput {...defaultProps} />);

			expect(screen.getByPlaceholderText("タグを入力...")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "タグを追加" })).toBeInTheDocument();
			expect(screen.getByText("0/10 タグ (各タグ最大30文字)")).toBeInTheDocument();
		});

		it("既存のタグが表示される", () => {
			render(<TagInput {...defaultProps} tags={["React", "TypeScript"]} />);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
			expect(screen.getByText("2/10 タグ (各タグ最大30文字)")).toBeInTheDocument();
		});

		it("プレースホルダーがカスタマイズできる", () => {
			render(<TagInput {...defaultProps} placeholder="カスタムプレースホルダー" />);

			expect(screen.getByPlaceholderText("カスタムプレースホルダー")).toBeInTheDocument();
		});
	});

	describe("タグ追加機能", () => {
		it("Plusボタンでタグを追加できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			const addButton = screen.getByRole("button", { name: "タグを追加" });

			await user.type(input, "新しいタグ");
			await user.click(addButton);

			expect(onTagsChange).toHaveBeenCalledWith(["新しいタグ"]);
		});

		it("Enterキーでタグを追加できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			expect(onTagsChange).toHaveBeenCalledWith(["新しいタグ"]);
		});

		it("空の入力でタグ追加ボタンが無効になる", () => {
			render(<TagInput {...defaultProps} />);

			const addButton = screen.getByRole("button", { name: "タグを追加" });
			expect(addButton).toBeDisabled();
		});

		it("空白のみの入力でEnterキーを押すとエラーメッセージが表示される", async () => {
			const user = userEvent.setup();
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			expect(screen.getByText("タグを入力してください")).toBeInTheDocument();
		});

		it("タグ追加後に入力フィールドがクリアされる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			await user.type(input, "テストタグ");
			await user.keyboard("{Enter}");

			expect(input).toHaveValue("");
		});

		it("先頭と末尾の空白が自動で除去される", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			await user.type(input, "  トリミングテスト  ");
			await user.keyboard("{Enter}");

			expect(onTagsChange).toHaveBeenCalledWith(["トリミングテスト"]);
		});
	});

	describe("タグ削除機能", () => {
		it("×ボタンでタグを削除できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} tags={["削除テスト"]} onTagsChange={onTagsChange} />);

			const deleteButton = screen.getByLabelText("削除テストを削除");
			await user.click(deleteButton);

			expect(onTagsChange).toHaveBeenCalledWith([]);
		});

		it("複数のタグから特定のタグを削除できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<TagInput
					{...defaultProps}
					tags={["タグ1", "タグ2", "タグ3"]}
					onTagsChange={onTagsChange}
				/>,
			);

			const deleteButton = screen.getByLabelText("タグ2を削除");
			await user.click(deleteButton);

			expect(onTagsChange).toHaveBeenCalledWith(["タグ1", "タグ3"]);
		});

		it("disabledの時は削除ボタンが表示されない", () => {
			render(<TagInput {...defaultProps} tags={["タグ1"]} disabled={true} />);

			expect(screen.queryByLabelText("タグ1を削除")).not.toBeInTheDocument();
		});
	});

	describe("バリデーション", () => {
		it("最大文字数が設定される", () => {
			render(<TagInput {...defaultProps} maxTagLength={5} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			expect(input).toHaveAttribute("maxlength", "5");
		});

		it("最大タグ数に達すると入力とボタンが無効になる", () => {
			const maxTags = 2;
			render(<TagInput {...defaultProps} tags={["タグ1", "タグ2"]} maxTags={maxTags} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			const addButton = screen.getByRole("button", { name: "タグを追加" });

			expect(input).toBeDisabled();
			expect(addButton).toBeDisabled();
		});

		it("重複するタグを追加しようとするとエラーメッセージが表示される", async () => {
			const user = userEvent.setup();
			render(<TagInput {...defaultProps} tags={["既存タグ"]} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			await user.type(input, "既存タグ");
			await user.keyboard("{Enter}");

			expect(screen.getByText("このタグは既に追加されています")).toBeInTheDocument();
		});

		it("最大タグ数に達すると入力フィールドが無効になる", () => {
			const maxTags = 2;
			render(<TagInput {...defaultProps} tags={["タグ1", "タグ2"]} maxTags={maxTags} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			expect(input).toBeDisabled();
		});

		it("最大タグ数に達するとAddボタンが無効になる", () => {
			const maxTags = 2;
			render(<TagInput {...defaultProps} tags={["タグ1", "タグ2"]} maxTags={maxTags} />);

			const addButton = screen.getByRole("button", { name: "タグを追加" });
			expect(addButton).toBeDisabled();
		});
	});

	describe("日本語IME対応", () => {
		it("compositionStart時はIME変換中状態になる", () => {
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			fireEvent.compositionStart(input);

			// IME変換中は内部状態が変更されるが、UIに直接の変化はない
			// この状態はEnterキーハンドリングで確認される
		});

		it("compositionEnd時はIME変換終了状態になる", () => {
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			fireEvent.compositionStart(input);
			fireEvent.compositionEnd(input);

			// IME変換終了後は通常のEnterキー処理が有効になる
		});

		it("IME変換中はEnterキーでタグが追加されない", async () => {
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 日本語入力をシミュレート
			fireEvent.change(input, { target: { value: "にほんご" } });
			fireEvent.compositionStart(input);

			// IME変換中のEnterキー
			fireEvent.keyDown(input, { key: "Enter" });

			// タグが追加されないことを確認
			expect(onTagsChange).not.toHaveBeenCalled();
		});

		it("IME変換終了後のEnterキーでタグが追加される", async () => {
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 日本語入力をシミュレート
			fireEvent.change(input, { target: { value: "日本語" } });
			fireEvent.compositionStart(input);
			fireEvent.compositionEnd(input);

			// IME変換終了後のEnterキー
			fireEvent.keyDown(input, { key: "Enter", preventDefault: vi.fn() });

			// タグが追加されることを確認
			expect(onTagsChange).toHaveBeenCalledWith(["日本語"]);
		});

		it("英数字入力時は即座にEnterキーでタグが追加される", async () => {
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 英数字入力（IMEを使わない）
			fireEvent.change(input, { target: { value: "English" } });

			// Enterキー
			fireEvent.keyDown(input, { key: "Enter", preventDefault: vi.fn() });

			// 即座にタグが追加されることを確認
			expect(onTagsChange).toHaveBeenCalledWith(["English"]);
		});

		it("IME変換中でもPlusボタンは機能する", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			const addButton = screen.getByRole("button", { name: "タグを追加" });

			// IME変換中をシミュレート
			fireEvent.change(input, { target: { value: "にほんご" } });
			fireEvent.compositionStart(input);

			// Plusボタンクリック
			await user.click(addButton);

			// タグが追加されることを確認
			expect(onTagsChange).toHaveBeenCalledWith(["にほんご"]);
		});
	});

	describe("アクセシビリティ", () => {
		it("適切なaria属性が設定されている", () => {
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			expect(input).toHaveAttribute("aria-invalid", "false");
		});

		it("エラー時にaria-invalidが適切に設定される", async () => {
			const user = userEvent.setup();
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 空白のみの入力でエラーを発生させる
			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			expect(input).toHaveAttribute("aria-invalid", "true");
			expect(input).toHaveAttribute("aria-describedby", "tag-input-error");
		});

		it("削除ボタンに適切なaria-labelが設定されている", () => {
			render(<TagInput {...defaultProps} tags={["テストタグ"]} />);

			const deleteButton = screen.getByLabelText("テストタグを削除");
			expect(deleteButton).toBeInTheDocument();
		});
	});

	describe("disabled状態", () => {
		it("disabled時は入力フィールドが無効になる", () => {
			render(<TagInput {...defaultProps} disabled={true} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			expect(input).toBeDisabled();
		});

		it("disabled時はAddボタンが無効になる", () => {
			render(<TagInput {...defaultProps} disabled={true} />);

			const addButton = screen.getByRole("button", { name: "タグを追加" });
			expect(addButton).toBeDisabled();
		});

		it("disabled時は削除ボタンが表示されない", () => {
			render(<TagInput {...defaultProps} tags={["タグ1"]} disabled={true} />);

			expect(screen.queryByLabelText("タグ1を削除")).not.toBeInTheDocument();
		});
	});

	describe("エラー処理", () => {
		it("入力値変更時にエラーがクリアされる", async () => {
			const user = userEvent.setup();
			render(<TagInput {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 空白のみの入力でエラーを発生させる
			await user.type(input, "   ");
			await user.keyboard("{Enter}");
			expect(screen.getByText("タグを入力してください")).toBeInTheDocument();

			// 入力値をクリアして新しい値を入力
			await user.clear(input);
			await user.type(input, "新しい値");

			// エラーがクリアされることを確認
			expect(screen.queryByText("タグを入力してください")).not.toBeInTheDocument();
		});

		it("タグ削除時にエラーがクリアされる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<TagInput {...defaultProps} tags={["既存タグ"]} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力...");

			// 重複エラーを発生させる
			await user.type(input, "既存タグ");
			await user.keyboard("{Enter}");
			expect(screen.getByText("このタグは既に追加されています")).toBeInTheDocument();

			// タグを削除
			const deleteButton = screen.getByLabelText("既存タグを削除");
			await user.click(deleteButton);

			// エラーがクリアされることを確認
			await waitFor(() => {
				expect(screen.queryByText("このタグは既に追加されています")).not.toBeInTheDocument();
			});
		});
	});

	describe("カスタム設定", () => {
		it("maxTagLengthが正しく適用される", () => {
			render(<TagInput {...defaultProps} maxTagLength={10} />);

			const input = screen.getByPlaceholderText("タグを入力...");
			expect(input).toHaveAttribute("maxlength", "10");
			expect(screen.getByText("0/10 タグ (各タグ最大10文字)")).toBeInTheDocument();
		});

		it("maxTagsが正しく適用される", () => {
			render(<TagInput {...defaultProps} maxTags={5} />);

			expect(screen.getByText("0/5 タグ (各タグ最大30文字)")).toBeInTheDocument();
		});

		it("カスタムクラス名が適用される", () => {
			const { container } = render(<TagInput {...defaultProps} className="custom-class" />);

			expect(container.firstChild).toHaveClass("custom-class");
		});
	});
});
