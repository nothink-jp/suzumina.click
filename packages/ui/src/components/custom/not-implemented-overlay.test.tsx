import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotImplementedOverlay from "./not-implemented-overlay";

describe("NotImplementedOverlay", () => {
	it("デフォルトのタイトルとメッセージが表示される", () => {
		render(<NotImplementedOverlay />);
		expect(screen.getByText("この機能は準備中です")).toBeInTheDocument();
		expect(screen.getByText("現在開発中のため、もうしばらくお待ちください。")).toBeInTheDocument();
	});

	it("カスタムタイトルが表示される", () => {
		render(<NotImplementedOverlay title="カスタムタイトル" />);
		expect(screen.getByText("カスタムタイトル")).toBeInTheDocument();
	});

	it("カスタム説明が表示される", () => {
		render(<NotImplementedOverlay description="カスタム説明文" />);
		expect(screen.getByText("カスタム説明文")).toBeInTheDocument();
	});

	it("カスタムクラス名が適用される", () => {
		render(<NotImplementedOverlay className="custom-class" />);
		const overlay = screen.getByText("この機能は準備中です").closest(".absolute");
		expect(overlay).toHaveClass("custom-class");
	});

	it("アイコンが表示される", () => {
		const { container } = render(<NotImplementedOverlay />);
		// Check for Construction and AlertCircle icons by their data-testid or role
		const icons = container.querySelectorAll("svg");
		expect(icons.length).toBeGreaterThanOrEqual(2);
	});

	it("オーバーレイスタイルが適用される", () => {
		render(<NotImplementedOverlay />);
		const overlay = screen.getByText("この機能は準備中です").closest(".absolute");
		expect(overlay).toHaveClass("inset-0", "bg-gray-500/50", "backdrop-blur-sm", "z-10");
	});

	it("コンテンツボックスのスタイルが適用される", () => {
		render(<NotImplementedOverlay />);
		const contentBox = screen.getByText("この機能は準備中です").closest(".bg-white");
		expect(contentBox).toHaveClass(
			"rounded-lg",
			"p-6",
			"shadow-lg",
			"max-w-md",
			"mx-4",
			"text-center",
		);
	});
});
