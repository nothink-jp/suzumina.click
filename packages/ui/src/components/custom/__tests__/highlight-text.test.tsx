import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightText } from "../highlight-text";

describe("HighlightText", () => {
	it("検索語がない場合、元のテキストをそのまま表示する", () => {
		render(<HighlightText text="Hello World" searchQuery="" />);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("検索語がnullの場合、元のテキストをそのまま表示する", () => {
		render(<HighlightText text="Hello World" searchQuery={null as unknown as string} />);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("検索語がundefinedの場合、元のテキストをそのまま表示する", () => {
		render(<HighlightText text="Hello World" searchQuery={undefined as unknown as string} />);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("大文字小文字を区別せずにハイライトする", () => {
		render(<HighlightText text="Hello World" searchQuery="HELLO" />);
		const highlighted = screen.getByText("Hello");
		expect(highlighted).toHaveClass("bg-yellow-200", "text-yellow-900");
		expect(screen.getByText("World")).toBeInTheDocument();
	});

	it("複数の一致する部分をハイライトする", () => {
		render(<HighlightText text="Hello Hello World" searchQuery="Hello" />);
		const highlightedElements = screen.getAllByText("Hello");
		expect(highlightedElements).toHaveLength(2);
		highlightedElements.forEach((element) => {
			expect(element).toHaveClass("bg-yellow-200", "text-yellow-900");
		});
	});

	it("日本語テキストでハイライトする", () => {
		render(<HighlightText text="こんにちは世界" searchQuery="世界" />);
		expect(screen.getByText("世界")).toHaveClass("bg-yellow-200", "text-yellow-900");
		expect(screen.getByText("こんにちは")).toBeInTheDocument();
	});

	it("部分一致でハイライトする", () => {
		render(<HighlightText text="Hello World" searchQuery="ell" />);
		expect(screen.getByText("ell")).toHaveClass("bg-yellow-200", "text-yellow-900");
		expect(screen.getByText("H")).toBeInTheDocument();
		expect(screen.getByText("o World")).toBeInTheDocument();
	});

	it("カスタムハイライトクラス名を適用する", () => {
		render(
			<HighlightText
				text="Hello World"
				searchQuery="Hello"
				highlightClassName="custom-highlight"
			/>,
		);
		expect(screen.getByText("Hello")).toHaveClass("custom-highlight");
	});

	it("検索語が見つからない場合、元のテキストを表示する", () => {
		render(<HighlightText text="Hello World" searchQuery="xyz" />);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});

	it("空文字列のテキストを処理する", () => {
		render(<HighlightText text="" searchQuery="test" />);
		expect(screen.queryByText("test")).not.toBeInTheDocument();
	});

	it("特殊文字を含む検索語でハイライトする", () => {
		render(<HighlightText text="Hello (World)" searchQuery="World" />);
		expect(screen.getByText("World")).toHaveClass("bg-yellow-200", "text-yellow-900");
	});

	it("検索語がテキスト全体と一致する場合", () => {
		render(<HighlightText text="Hello" searchQuery="Hello" />);
		expect(screen.getByText("Hello")).toHaveClass("bg-yellow-200", "text-yellow-900");
	});

	it("連続する一致部分を正しく処理する", () => {
		render(<HighlightText text="aaa" searchQuery="aa" />);
		const highlighted = screen.getByText("aa");
		expect(highlighted).toHaveClass("bg-yellow-200", "text-yellow-900");
		expect(screen.getByText("a")).toBeInTheDocument();
	});
});
