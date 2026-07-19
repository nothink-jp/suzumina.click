import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonTagEditor } from "../audio-button-tag-editor";

// モック
vi.mock("@/actions/autocomplete", () => ({
	getAutocompleteSuggestions: vi.fn().mockResolvedValue({
		success: true,
		data: { suggestions: [] },
	}),
}));

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

	describe("用途タグのプリセットチップ（SPR-269）", () => {
		it("公式語彙9カテゴリのチップが表示される", () => {
			render(<AudioButtonTagEditor {...defaultProps} />);

			for (const usageTag of [
				"あいさつ",
				"返事・リアクション",
				"笑い",
				"擬音・音ネタ",
				"うた",
				"ツッコミ・煽り",
				"応援・褒め",
				"あまあま",
				"名言・迷言",
			]) {
				expect(screen.getByRole("button", { name: usageTag })).toBeInTheDocument();
			}
		});

		it("チップをタップすると用途タグが追加される（既存の自由タグは維持）", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor
					{...defaultProps}
					tags={["龍が如く極"]}
					onTagsChange={onTagsChange}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "あいさつ" }));

			expect(onTagsChange).toHaveBeenCalledWith(["龍が如く極", "あいさつ"]);
		});

		it("付与済みチップは aria-pressed=true になり、タップで解除される", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor {...defaultProps} tags={["あいさつ"]} onTagsChange={onTagsChange} />,
			);

			const chip = screen.getByRole("button", { name: "あいさつ" });
			expect(chip).toHaveAttribute("aria-pressed", "true");

			await user.click(chip);
			expect(onTagsChange).toHaveBeenCalledWith([]);
		});

		it("別の用途タグをタップすると入れ替わる（1ボタン1つの運用）", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor
					{...defaultProps}
					tags={["龍が如く極", "笑い"]}
					onTagsChange={onTagsChange}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "名言・迷言" }));

			expect(onTagsChange).toHaveBeenCalledWith(["龍が如く極", "名言・迷言"]);
		});

		it("上限いっぱい（用途タグなしで10個）のときは追加されない", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			const fullTags = Array.from({ length: 10 }, (_, i) => `タグ${i + 1}`);
			render(
				<AudioButtonTagEditor {...defaultProps} tags={fullTags} onTagsChange={onTagsChange} />,
			);

			await user.click(screen.getByRole("button", { name: "あいさつ" }));

			expect(onTagsChange).not.toHaveBeenCalled();
		});

		it("disabled 時はチップも無効になる", () => {
			render(<AudioButtonTagEditor {...defaultProps} disabled={true} />);

			expect(screen.getByRole("button", { name: "あいさつ" })).toBeDisabled();
		});

		it("フリー入力で2つ目の用途タグを入れても後勝ちで置換される（AIレビュー対応）", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor
					{...defaultProps}
					tags={["龍が如く極", "笑い"]}
					onTagsChange={onTagsChange}
				/>,
			);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "あいさつ");
			await user.keyboard("{Enter}");

			// TagInput からは ["龍が如く極", "笑い", "あいさつ"] が来るが、用途タグ1つの不変条件で後勝ちに置換される
			expect(onTagsChange).toHaveBeenCalledWith(["龍が如く極", "あいさつ"]);
		});

		it("フリー入力による自由タグの追加は素通しする", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			render(
				<AudioButtonTagEditor {...defaultProps} tags={["笑い"]} onTagsChange={onTagsChange} />,
			);

			const input = screen.getByPlaceholderText("タグを入力してEnter (2文字以上で候補表示)");
			await user.type(input, "おひょ");
			await user.keyboard("{Enter}");

			expect(onTagsChange).toHaveBeenCalledWith(["笑い", "おひょ"]);
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
