import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightText } from "../HighlightText";

describe("HighlightText", () => {
	it("検索クエリが空の場合、元のテキストをそのまま表示する", () => {
		render(<HighlightText text="テストテキスト" searchQuery="" />);

		expect(screen.getByText("テストテキスト")).toBeInTheDocument();
		expect(screen.queryByTestId("highlight-match")).not.toBeInTheDocument();
	});

	it("単一の一致する単語をハイライトする", () => {
		render(<HighlightText text="これはテストです" searchQuery="テスト" />);

		expect(screen.getByText("これは")).toBeInTheDocument();
		expect(screen.getByText("です")).toBeInTheDocument();

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toBeInTheDocument();
		expect(highlighted).toHaveTextContent("テスト");
	});

	it("複数の一致をハイライトする", () => {
		render(<HighlightText text="テストはテストです" searchQuery="テスト" />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted).toHaveLength(2);
		highlighted.forEach((element) => {
			expect(element).toHaveTextContent("テスト");
		});
	});

	it("複数のキーワードでハイライトする", () => {
		render(<HighlightText text="これはテストの例です" searchQuery="テスト 例" />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted).toHaveLength(2);
		expect(highlighted[0]).toHaveTextContent("テスト");
		expect(highlighted[1]).toHaveTextContent("例");
	});

	it("大文字小文字を区別しない（デフォルト）", () => {
		render(<HighlightText text="Test Text" searchQuery="test" />);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveTextContent("Test");
	});

	it("大文字小文字を区別する設定", () => {
		render(<HighlightText text="Test test" searchQuery="test" caseSensitive={true} />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted).toHaveLength(1);
		expect(highlighted[0]).toHaveTextContent("test");
	});

	it("日本語の部分一致をハイライトする", () => {
		render(<HighlightText text="こんにちは世界" searchQuery="にち" />);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveTextContent("にち");
	});

	it("カスタムハイライトクラスを適用する", () => {
		render(
			<HighlightText
				text="テストテキスト"
				searchQuery="テスト"
				highlightClassName="custom-highlight-class"
			/>,
		);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveClass("custom-highlight-class");
		expect(highlighted).toHaveClass("mark-reset");
	});

	it("カスタムクラス名を適用する", () => {
		render(
			<HighlightText
				text="テストテキスト"
				searchQuery="テスト"
				className="custom-container-class"
			/>,
		);

		// Text is split across elements, so find the container by class
		const container = document.querySelector(".custom-container-class");
		expect(container).toBeInTheDocument();
		expect(container).toHaveClass("custom-container-class");
	});

	it("特殊文字を含む検索クエリを適切にエスケープする", () => {
		render(<HighlightText text="価格は$100です" searchQuery="$100" />);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveTextContent("$100");
	});

	it("正規表現の特殊文字をエスケープする", () => {
		render(<HighlightText text="質問は(何)ですか?" searchQuery="(何)" />);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveTextContent("(何)");
	});

	it("空白を含む検索クエリを正しく処理する", () => {
		render(<HighlightText text="Hello World Test" searchQuery="Hello World" />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted).toHaveLength(2);
		expect(highlighted[0]).toHaveTextContent("Hello");
		expect(highlighted[1]).toHaveTextContent("World");
	});

	it("一致しない検索クエリでは何もハイライトしない", () => {
		render(<HighlightText text="これはテストです" searchQuery="存在しない" />);

		expect(screen.getByText("これはテストです")).toBeInTheDocument();
		expect(screen.queryByTestId("highlight-match")).not.toBeInTheDocument();
	});

	it("無効な正規表現を含む検索クエリでエラーが発生しない", () => {
		// コンソールエラーを無効化
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<HighlightText text="テストテキスト" searchQuery="[invalid-regex" />);

		expect(screen.getByText("テストテキスト")).toBeInTheDocument();
		expect(screen.queryByTestId("highlight-match")).not.toBeInTheDocument();

		consoleSpy.mockRestore();
	});

	it("長いテキストでパフォーマンスが問題ないか", () => {
		const longText = "テスト".repeat(1000);

		render(<HighlightText text={longText} searchQuery="テスト" />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted.length).toBeGreaterThan(0);
	});

	it("複数の空白を含む検索クエリを正しく処理する", () => {
		render(<HighlightText text="Hello  World  Test" searchQuery="Hello   World" />);

		const highlighted = screen.getAllByTestId("highlight-match");
		expect(highlighted).toHaveLength(2);
		expect(highlighted[0]).toHaveTextContent("Hello");
		expect(highlighted[1]).toHaveTextContent("World");
	});

	it("前後に空白がある検索クエリを正しく処理する", () => {
		render(<HighlightText text="これはテストです" searchQuery="  テスト  " />);

		const highlighted = screen.getByTestId("highlight-match");
		expect(highlighted).toHaveTextContent("テスト");
	});
});
