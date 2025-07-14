import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSkeleton } from "./loading-skeleton";

describe("LoadingSkeleton", () => {
	it("カルーセルバリアントが正しくレンダリングされる", () => {
		render(<LoadingSkeleton variant="carousel" />);
		const skeleton = screen.getByTestId("loading-skeleton-carousel");
		expect(skeleton).toHaveClass("animate-pulse");
		expect(skeleton.querySelectorAll(".flex-shrink-0")).toHaveLength(4);
	});

	it("フォームバリアントが正しくレンダリングされる", () => {
		render(<LoadingSkeleton variant="form" />);
		const skeleton = screen.getByTestId("loading-skeleton-form");
		expect(skeleton).toHaveClass("animate-pulse");
		expect(skeleton.querySelectorAll(".bg-gray-200")).toHaveLength(2);
	});

	it("メニューバリアントが正しくレンダリングされる", () => {
		render(<LoadingSkeleton variant="menu" />);
		const skeleton = screen.getByTestId("loading-skeleton-menu");
		expect(skeleton).toHaveClass("animate-pulse");
		expect(skeleton.querySelector(".bg-gray-200")).toBeInTheDocument();
	});

	it("カードバリアントが正しくレンダリングされる", () => {
		render(<LoadingSkeleton variant="card" />);
		const skeleton = screen.getByTestId("loading-skeleton-card");
		expect(skeleton).toHaveClass("animate-pulse");
		expect(skeleton.querySelectorAll(".bg-gray-300")).toHaveLength(3);
	});

	it("カスタムの高さが適用される", () => {
		render(<LoadingSkeleton variant="card" height={300} />);
		const cardContainer = screen.getByTestId("loading-skeleton-card");
		const innerCard = cardContainer.firstElementChild as HTMLElement;
		expect(innerCard.style.height).toBe("300px");
	});

	it("カスタムクラスが適用される", () => {
		render(<LoadingSkeleton variant="carousel" className="custom-class" />);
		const skeleton = screen.getByTestId("loading-skeleton-carousel");
		expect(skeleton).toHaveClass("custom-class");
	});

	it("デフォルト値が正しく設定される", () => {
		render(<LoadingSkeleton />);
		const skeleton = screen.getByTestId("loading-skeleton-carousel");
		expect(skeleton).toBeInTheDocument();
	});
});
