import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BasicInfoPanel } from "./basic-info-panel";

// Mock AudioButtonTagEditor
vi.mock("./audio-button-tag-editor", () => ({
	AudioButtonTagEditor: ({ tags, onTagsChange, disabled }: any) => (
		<div data-testid="tag-editor">
			<input
				data-testid="tag-input"
				placeholder="タグを入力してEnter (2文字以上で候補表示)"
				disabled={disabled}
				onChange={(e) => {
					// Simple mock implementation for testing
					if (e.target.value.endsWith("Enter")) {
						const newTag = e.target.value.replace("Enter", "");
						onTagsChange([...tags, newTag]);
					}
				}}
			/>
			{tags.map((tag: string, index: number) => (
				<span key={tag} data-testid={`tag-${index}`}>
					{tag}
				</span>
			))}
		</div>
	),
}));

describe("BasicInfoPanel", () => {
	const defaultProps = {
		title: "",
		description: "",
		tags: [],
		onTitleChange: vi.fn(),
		onDescriptionChange: vi.fn(),
		onTagsChange: vi.fn(),
		disabled: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("コンポーネントが正常にレンダリングされる", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			expect(screen.getByText("基本情報")).toBeInTheDocument();
			expect(screen.getByLabelText(/ボタンタイトル/)).toBeInTheDocument();
			expect(screen.getByLabelText(/説明（任意）/)).toBeInTheDocument();
			expect(screen.getByTestId("tag-editor")).toBeInTheDocument();
		});

		it("必須マークが正しく表示される", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			// Find the label that contains the required asterisk
			const titleLabel = screen.getByText(/ボタンタイトル/);
			expect(titleLabel).toHaveTextContent("*");
		});

		it("入力フィールドが適切な属性を持つ", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");

			expect(titleInput).toHaveAttribute("maxLength", "100");
			expect(descriptionInput).toHaveAttribute("maxLength", "500");
			expect(descriptionInput).toHaveAttribute("rows", "3");
		});
	});

	describe("Title Input", () => {
		it("タイトル入力が正常に動作する", async () => {
			const user = userEvent.setup();
			const onTitleChange = vi.fn();
			const props = { ...defaultProps, onTitleChange };

			render(<BasicInfoPanel {...props} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "テストタイトル");

			const inputText = "テストタイトル";
			expect(onTitleChange).toHaveBeenCalledTimes(inputText.length);
			// Verify that onChange has been called (function is working)
			expect(onTitleChange).toHaveBeenCalled();
			// Since this is a controlled component, we need to check the callback arguments
			expect(onTitleChange).toHaveBeenCalledWith("テ");
			expect(onTitleChange).toHaveBeenCalledWith("タ");
			expect(onTitleChange).toHaveBeenCalledWith("ル");
		});

		it("タイトルの現在値が正しく表示される", () => {
			const props = { ...defaultProps, title: "既存のタイトル" };
			render(<BasicInfoPanel {...props} />);

			const titleInput = screen.getByDisplayValue("既存のタイトル");
			expect(titleInput).toBeInTheDocument();
		});

		it("文字数カウンターが正しく表示される", () => {
			const props = { ...defaultProps, title: "テスト" };
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByText("3/100")).toBeInTheDocument();
		});

		it("タイトル入力が無効化状態を反映する", () => {
			const props = { ...defaultProps, disabled: true };
			render(<BasicInfoPanel {...props} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toBeDisabled();
		});
	});

	describe("Description Input", () => {
		it("説明文入力が正常に動作する", async () => {
			const user = userEvent.setup();
			const onDescriptionChange = vi.fn();
			const props = { ...defaultProps, onDescriptionChange };

			render(<BasicInfoPanel {...props} />);

			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");
			await user.type(descriptionInput, "テスト説明文");

			const inputText = "テスト説明文";
			expect(onDescriptionChange).toHaveBeenCalledTimes(inputText.length);
			// Verify that onChange has been called (function is working)
			expect(onDescriptionChange).toHaveBeenCalled();
			// Since this is a controlled component, we need to check the callback arguments
			expect(onDescriptionChange).toHaveBeenCalledWith("テ");
			expect(onDescriptionChange).toHaveBeenCalledWith("説");
			expect(onDescriptionChange).toHaveBeenCalledWith("文");
		});

		it("説明文の現在値が正しく表示される", () => {
			const props = { ...defaultProps, description: "既存の説明文" };
			render(<BasicInfoPanel {...props} />);

			const descriptionInput = screen.getByDisplayValue("既存の説明文");
			expect(descriptionInput).toBeInTheDocument();
		});

		it("説明文の文字数カウンターが正しく表示される", () => {
			const props = { ...defaultProps, description: "テスト説明" };
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByText("5/500")).toBeInTheDocument();
		});

		it("説明文入力が無効化状態を反映する", () => {
			const props = { ...defaultProps, disabled: true };
			render(<BasicInfoPanel {...props} />);

			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");
			expect(descriptionInput).toBeDisabled();
		});

		it("テキストエリアのリサイズが無効化されている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");
			expect(descriptionInput).toHaveClass("resize-none");
		});
	});

	describe("Tag Editor Integration", () => {
		it("AudioButtonTagEditorが適切なpropsで呼び出される", () => {
			const props = {
				...defaultProps,
				tags: ["タグ1", "タグ2"],
				disabled: true,
			};
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByTestId("tag-editor")).toBeInTheDocument();
			expect(screen.getByTestId("tag-0")).toHaveTextContent("タグ1");
			expect(screen.getByTestId("tag-1")).toHaveTextContent("タグ2");

			const tagInput = screen.getByTestId("tag-input");
			expect(tagInput).toBeDisabled();
		});

		it("タグ変更のコールバックが正常に動作する", async () => {
			const user = userEvent.setup();
			const onTagsChange = vi.fn();
			const props = { ...defaultProps, onTagsChange };

			render(<BasicInfoPanel {...props} />);

			const tagInput = screen.getByTestId("tag-input");
			await user.type(tagInput, "新しいタグEnter");

			expect(onTagsChange).toHaveBeenCalledWith(["新しいタグ"]);
		});
	});

	describe("Form Validation", () => {
		it("タイトルの最大文字数制限が適用される", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toHaveAttribute("maxLength", "100");
		});

		it("説明文の最大文字数制限が適用される", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");
			expect(descriptionInput).toHaveAttribute("maxLength", "500");
		});

		it("長いタイトルでも文字数カウンターが正しく動作する", () => {
			const longTitle = "a".repeat(95);
			const props = { ...defaultProps, title: longTitle };
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByText("95/100")).toBeInTheDocument();
		});

		it("長い説明文でも文字数カウンターが正しく動作する", () => {
			const longDescription = "a".repeat(495);
			const props = { ...defaultProps, description: longDescription };
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByText("495/500")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("ラベルとフィールドが適切に関連付けられている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleInput = screen.getByLabelText(/ボタンタイトル/);
			const descriptionInput = screen.getByLabelText(/説明（任意）/);

			expect(titleInput).toBeInTheDocument();
			expect(descriptionInput).toBeInTheDocument();
		});

		it("適切なフォームラベルが設定されている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			expect(screen.getByText("ボタンタイトル")).toBeInTheDocument();
			expect(screen.getByText("説明（任意）")).toBeInTheDocument();
		});

		it("適切なIDが設定されている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");

			expect(titleInput).toHaveAttribute("id");
			expect(descriptionInput).toHaveAttribute("id", "description-input");
		});
	});

	describe("Responsive Design", () => {
		it("レスポンシブテキストクラスが適用されている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");

			expect(titleInput).toHaveClass("text-base", "min-h-[44px]");
			expect(descriptionInput).toHaveClass("text-base");
		});

		it("レスポンシブラベルクラスが適用されている", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			const titleLabel = screen.getByText("ボタンタイトル").closest("label");
			const descriptionLabel = screen.getByText("説明（任意）").closest("label");

			expect(titleLabel).toHaveClass("text-sm", "sm:text-base");
			expect(descriptionLabel).toHaveClass("text-sm", "sm:text-base");
		});

		it("文字数カウンターがレスポンシブである", () => {
			const props = { ...defaultProps, title: "テスト", description: "説明" };
			render(<BasicInfoPanel {...props} />);

			const counters = screen.getAllByText(/\/\d+$/);
			counters.forEach((counter) => {
				expect(counter).toHaveClass("text-xs", "sm:text-sm");
			});
		});
	});

	describe("Edge Cases", () => {
		it("空文字での文字数カウンターが正しく動作する", () => {
			render(<BasicInfoPanel {...defaultProps} />);

			expect(screen.getByText("0/100")).toBeInTheDocument();
			expect(screen.getByText("0/500")).toBeInTheDocument();
		});

		it("非ASCII文字での文字数カウントが正しく動作する", () => {
			const props = {
				...defaultProps,
				title: "こんにちは",
				description: "これは日本語の説明文です。",
			};
			render(<BasicInfoPanel {...props} />);

			expect(screen.getByText("5/100")).toBeInTheDocument();
			expect(screen.getByText("13/500")).toBeInTheDocument();
		});

		it("undefined値でもエラーにならない", () => {
			const props = {
				...defaultProps,
				title: undefined as any,
				description: undefined as any,
				tags: undefined as any,
			};

			expect(() => render(<BasicInfoPanel {...props} />)).not.toThrow();
		});

		it("null値でもエラーにならない", () => {
			const props = {
				...defaultProps,
				title: null as any,
				description: null as any,
				tags: null as any,
			};

			expect(() => render(<BasicInfoPanel {...props} />)).not.toThrow();
		});

		it("最大文字数まで入力できる", async () => {
			const user = userEvent.setup();
			const onTitleChange = vi.fn();
			const props = { ...defaultProps, onTitleChange };

			render(<BasicInfoPanel {...props} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const maxLengthTitle = "a".repeat(100);

			// Focus and directly type the content
			await user.click(titleInput);
			await user.keyboard(maxLengthTitle);

			// Check that onChange was called
			expect(onTitleChange).toHaveBeenCalled();
			// Verify the maxLength attribute prevents exceeding 100 characters
			expect(titleInput).toHaveAttribute("maxLength", "100");
		});
	});

	describe("Performance", () => {
		it("大量の文字入力でもパフォーマンスが保たれる", async () => {
			const user = userEvent.setup();
			const onTitleChange = vi.fn();
			const props = { ...defaultProps, onTitleChange };

			render(<BasicInfoPanel {...props} />);

			const startTime = performance.now();

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			await user.type(titleInput, "a".repeat(50));

			const endTime = performance.now();
			const duration = endTime - startTime;

			expect(duration).toBeLessThan(1000);
			expect(onTitleChange).toHaveBeenCalledTimes(50);
		});

		it("連続的な入力変更でも正常に動作する", async () => {
			const user = userEvent.setup();
			const onTitleChange = vi.fn();
			const onDescriptionChange = vi.fn();
			const props = { ...defaultProps, onTitleChange, onDescriptionChange };

			render(<BasicInfoPanel {...props} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const descriptionInput = screen.getByPlaceholderText("音声ボタンの詳細説明を入力（任意）");

			// Rapid input changes
			await user.type(titleInput, "タイトル");
			await user.type(descriptionInput, "説明文");

			expect(onTitleChange).toHaveBeenCalledTimes(4);
			expect(onDescriptionChange).toHaveBeenCalledTimes(3);
		});
	});
});
