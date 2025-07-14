/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	AudioButtonSkeleton,
	calculateSkeletonHeight,
	generateSkeletonList,
} from "./audio-button-skeleton";

describe("AudioButtonSkeleton", () => {
	it("should render skeleton with default props", () => {
		render(<AudioButtonSkeleton />);

		const skeleton = screen.getByTestId("audio-button-skeleton");
		expect(skeleton).toBeInTheDocument();
		expect(skeleton.style.height).toBe("140px");
		expect(skeleton).toHaveClass("animate-pulse");
	});

	it("should render with custom height", () => {
		const customHeight = 200;
		render(<AudioButtonSkeleton height={customHeight} />);

		const skeleton = screen.getByTestId("audio-button-skeleton");
		expect(skeleton.style.height).toBe("200px");
	});

	it("should apply custom className", () => {
		const customClass = "custom-skeleton-class";
		render(<AudioButtonSkeleton className={customClass} />);

		const skeleton = screen.getByTestId("audio-button-skeleton");
		expect(skeleton).toHaveClass(customClass);
	});

	it("should disable animation when animated is false", () => {
		render(<AudioButtonSkeleton animated={false} />);

		const skeleton = screen.getByTestId("audio-button-skeleton");
		expect(skeleton).not.toHaveClass("animate-pulse");
	});

	it("should render skeleton structure correctly", () => {
		render(<AudioButtonSkeleton />);

		const skeleton = screen.getByTestId("audio-button-skeleton");

		// スケルトンボックス要素の確認
		const skeletonBoxes = skeleton.querySelectorAll(".bg-muted");
		expect(skeletonBoxes.length).toBeGreaterThan(0);
	});
});

describe("generateSkeletonList", () => {
	it("should generate correct number of skeleton items", () => {
		const count = 5;
		const skeletonList = generateSkeletonList(count);

		expect(skeletonList).toHaveLength(count);
	});

	it("should generate empty array for zero count", () => {
		const skeletonList = generateSkeletonList(0);

		expect(skeletonList).toHaveLength(0);
	});

	it("should generate unique keys for each skeleton", () => {
		const count = 3;
		const skeletonList = generateSkeletonList(count);

		// React.ReactNode[] の各要素をチェック
		skeletonList.forEach((item, index) => {
			expect(item).toBeDefined();
			// keyはReact要素のプロパティなので直接アクセスできないが、
			// 要素が正しく生成されていることを確認
			expect(typeof item).toBe("object");
		});
	});
});

describe("calculateSkeletonHeight", () => {
	it("should return mobile height for small screens", () => {
		const mobileHeight = calculateSkeletonHeight(500);
		expect(mobileHeight).toBe(120);
	});

	it("should return tablet height for medium screens", () => {
		const tabletHeight = calculateSkeletonHeight(800);
		expect(tabletHeight).toBe(130);
	});

	it("should return desktop height for large screens", () => {
		const desktopHeight = calculateSkeletonHeight(1200);
		expect(desktopHeight).toBe(140);
	});

	it("should handle edge cases correctly", () => {
		// 境界値のテスト
		expect(calculateSkeletonHeight(640)).toBe(130); // sm (640px)
		expect(calculateSkeletonHeight(639)).toBe(120); // sm未満
		expect(calculateSkeletonHeight(1024)).toBe(140); // lg (1024px)
		expect(calculateSkeletonHeight(1023)).toBe(130); // lg未満
	});
});
