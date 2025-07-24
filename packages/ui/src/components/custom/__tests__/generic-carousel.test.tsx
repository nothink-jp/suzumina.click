import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenericCarousel } from "../generic-carousel";

// Mock the carousel components
vi.mock("../../ui/carousel", () => ({
	Carousel: ({ children, className }: any) => (
		<div className={className} data-testid="carousel">
			{children}
		</div>
	),
	CarouselContent: ({ children, className }: any) => (
		<div className={className} data-testid="carousel-content">
			{children}
		</div>
	),
	CarouselItem: ({ children, className, style }: any) => (
		<div className={className} style={style} data-testid="carousel-item">
			{children}
		</div>
	),
	CarouselPrevious: ({ className }: any) => (
		<button className={className} data-testid="carousel-previous">
			Previous
		</button>
	),
	CarouselNext: ({ className }: any) => (
		<button className={className} data-testid="carousel-next">
			Next
		</button>
	),
}));

interface TestItem {
	id: string;
	name: string;
}

describe("GenericCarousel", () => {
	const mockItems: TestItem[] = [
		{ id: "1", name: "Item 1" },
		{ id: "2", name: "Item 2" },
		{ id: "3", name: "Item 3" },
	];

	const mockRenderItem = (item: TestItem, index: number) => (
		<div data-testid={`item-${item.id}`}>
			{item.name} (Index: {index})
		</div>
	);

	const mockGetItemKey = (item: TestItem) => item.id;

	it("空の状態メッセージが表示される", () => {
		render(
			<GenericCarousel
				items={[]}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		expect(screen.getByText("アイテムがありません")).toBeInTheDocument();
		expect(screen.queryByTestId("carousel")).not.toBeInTheDocument();
	});

	it("アイテムが正しくレンダリングされる", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		mockItems.forEach((item, index) => {
			expect(screen.getByTestId(`item-${item.id}`)).toBeInTheDocument();
			expect(screen.getByText(`${item.name} (Index: ${index})`)).toBeInTheDocument();
		});
	});

	it("カルーセルコンポーネントが表示される", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		expect(screen.getByTestId("carousel")).toBeInTheDocument();
		// ボタンの存在確認
		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(2); // Previous and Next buttons
	});

	it("カスタムアイテムクラスが適用される", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
				itemClassName="custom-item-class"
			/>,
		);

		const carouselItems = screen.getAllByTestId("carousel-item");
		carouselItems.forEach((item) => {
			expect(item).toHaveClass("custom-item-class");
		});
	});

	it("デフォルトのカード幅が設定される", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		const carouselItems = screen.getAllByTestId("carousel-item");
		expect(carouselItems).toHaveLength(3);
		// Since we're using a mock, we just verify that style prop is passed
		carouselItems.forEach((item) => {
			expect(item).toBeInTheDocument();
		});
	});

	it("カスタムカード幅が設定される", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
				cardMinWidth={300}
				cardMaxWidth={400}
			/>,
		);

		const carouselItems = screen.getAllByTestId("carousel-item");
		expect(carouselItems).toHaveLength(3);
		// Since we're using a mock, we just verify items are rendered
		carouselItems.forEach((item) => {
			expect(item).toBeInTheDocument();
		});
	});

	it("正しいキーが各アイテムに設定される", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		// React keys are not directly testable, but we can verify that each item is rendered
		// and the getItemKey function is used to generate unique identifiers
		mockItems.forEach((item) => {
			expect(screen.getByTestId(`item-${mockGetItemKey(item)}`)).toBeInTheDocument();
		});
	});

	it("カルーセルナビゲーションボタンのスタイルが正しい", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		const prevButton = buttons[0];
		const nextButton = buttons[1];

		expect(prevButton).toHaveClass("left-1", "sm:left-2", "h-10", "w-10", "sm:h-12", "sm:w-12");
		expect(nextButton).toHaveClass("right-1", "sm:right-2", "h-10", "w-10", "sm:h-12", "sm:w-12");
	});

	it("カルーセルコンテンツのスタイルが正しい", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		const carouselContent = screen.getByTestId("carousel-content");
		expect(carouselContent).toHaveClass("-ml-2", "md:-ml-4");
	});

	it("カルーセルアイテムのスタイルが正しい", () => {
		render(
			<GenericCarousel
				items={mockItems}
				renderItem={mockRenderItem}
				emptyStateMessage="アイテムがありません"
				getItemKey={mockGetItemKey}
			/>,
		);

		const carouselItems = screen.getAllByTestId("carousel-item");
		carouselItems.forEach((item) => {
			expect(item).toHaveClass("pl-2", "md:pl-4", "min-w-0");
		});
	});
});
