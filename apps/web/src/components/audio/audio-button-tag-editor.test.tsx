import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AudioButtonTagEditor } from "./audio-button-tag-editor";

describe("AudioButtonTagEditor", () => {
	const defaultProps = {
		tags: [],
		onTagsChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本機能", () => {
		it("初期状態で正しくレンダリングされる", () => {
			render(<AudioButtonTagEditor {...defaultProps} />);

			expect(
				screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)"),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "タグを追加" })).toBeInTheDocument();
		});

		it("既存のタグが表示される", () => {
			render(<AudioButtonTagEditor {...defaultProps} tags={["React", "TypeScript"]} />);

			expect(screen.getByText("React")).toBeInTheDocument();
			expect(screen.getByText("TypeScript")).toBeInTheDocument();
		});

		it("TagInputの設定が正しく適用される", () => {
			render(<AudioButtonTagEditor {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			expect(input).toHaveAttribute("maxlength", "30");
			expect(screen.getByText("0/10 タグ (各タグ最大30文字)")).toBeInTheDocument();
		});
	});

	describe("タグ操作", () => {
		it("新しいタグを追加できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(<AudioButtonTagEditor {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "新しいタグ");
			await user.keyboard("{Enter}");

			expect(onTagsChange).toHaveBeenCalledWith(["新しいタグ"]);
		});

		it("タグを削除できる", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor
					{...defaultProps}
					tags={["削除テスト"]}
					onTagsChange={onTagsChange}
				/>,
			);

			const deleteButton = screen.getByLabelText("削除テストを削除");
			await user.click(deleteButton);

			expect(onTagsChange).toHaveBeenCalledWith([]);
		});

		it("日本語IMEに対応している", async () => {
			const onTagsChange = vi.fn();
			render(<AudioButtonTagEditor {...defaultProps} onTagsChange={onTagsChange} />);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");

			// IME変換中をシミュレート
			fireEvent.change(input, { target: { value: "にほんご" } });
			fireEvent.compositionStart(input);
			fireEvent.keyDown(input, { key: "Enter" });

			// IME変換中はタグが追加されない
			expect(onTagsChange).not.toHaveBeenCalled();

			// IME変換終了後
			fireEvent.compositionEnd(input);
			fireEvent.keyDown(input, { key: "Enter", preventDefault: vi.fn() });

			// タグが追加される
			expect(onTagsChange).toHaveBeenCalledWith(["にほんご"]);
		});
	});

	describe("バリデーション", () => {
		it("最大10個のタグを許可する", () => {
			const tags = Array.from({ length: 10 }, (_, i) => `タグ${i + 1}`);
			render(<AudioButtonTagEditor {...defaultProps} tags={tags} />);

			expect(screen.getByText(`${tags.length}/10 タグ (各タグ最大30文字)`)).toBeInTheDocument();
		});

		it("30文字の最大長が設定される", () => {
			render(<AudioButtonTagEditor {...defaultProps} />);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			expect(input).toHaveAttribute("maxlength", "30");
		});
	});

	describe("props のパススルー", () => {
		it("disabledプロパティが正しく渡される", () => {
			render(<AudioButtonTagEditor {...defaultProps} disabled={true} />);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			const addButton = screen.getByRole("button", { name: "タグを追加" });

			expect(input).toBeDisabled();
			expect(addButton).toBeDisabled();
		});

		it("classNameプロパティが正しく渡される", () => {
			const { container } = render(
				<AudioButtonTagEditor {...defaultProps} className="test-class" />,
			);

			expect(container.firstChild).toHaveClass("test-class");
		});
	});
});
