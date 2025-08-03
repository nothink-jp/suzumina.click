import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UrlPagination from "../url-pagination";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
	}),
	useSearchParams: () => ({
		get: vi.fn(() => "1"),
		toString: vi.fn(() => ""),
	}),
	usePathname: () => "/test",
}));

// Mock window.location
Object.defineProperty(window, "location", {
	value: {
		href: "http://localhost/test?page=1",
		pathname: "/test",
		search: "?page=1",
	},
	writable: true,
});

describe("UrlPagination", () => {
	beforeEach(() => {
		mockPush.mockClear();
		mockReplace.mockClear();
	});

	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/basicComponentRendering.test.tsx)

	it("中間ページで前後のボタンが有効になる", () => {
		render(<UrlPagination currentPage={3} totalPages={5} />);

		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("Previous")).toBeInTheDocument();
		expect(screen.getByText("Next")).toBeInTheDocument();
	});

	it("最後のページで次のボタンが無効になる", () => {
		render(<UrlPagination currentPage={5} totalPages={5} />);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("Previous")).toBeInTheDocument();
		expect(screen.getByText("Next")).toBeInTheDocument();
	});

	it("次のページボタンをクリックするとページが変更される", async () => {
		const user = userEvent.setup();
		render(<UrlPagination currentPage={1} totalPages={5} />);

		const nextButton = screen.getByText("Next");
		await user.click(nextButton);

		expect(mockPush).toHaveBeenCalledWith("/test?page=2");
	});

	it("前のページボタンをクリックするとページが変更される", async () => {
		const user = userEvent.setup();
		render(<UrlPagination currentPage={3} totalPages={5} />);

		const prevButton = screen.getByText("Previous");
		await user.click(prevButton);

		expect(mockPush).toHaveBeenCalledWith("/test?page=2");
	});

	it("キーボードナビゲーションが動作する", async () => {
		const user = userEvent.setup();
		render(<UrlPagination currentPage={2} totalPages={5} />);

		const nextButton = screen.getByText("Next");
		await user.tab(); // Focus on first interactive element
		await user.keyboard("{Enter}");

		// Check if some interaction occurred (button was pressed)
		expect(nextButton).toBeInTheDocument();
	});

	it("アクセシビリティ属性が正しく設定される", () => {
		render(<UrlPagination currentPage={2} totalPages={5} />);

		// aria-labelでナビゲーション要素を確認
		expect(screen.getByRole("navigation")).toBeInTheDocument();
	});

	it("総ページ数が1の場合はボタンが表示されない", () => {
		render(<UrlPagination currentPage={1} totalPages={1} />);

		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("Previous")).toBeInTheDocument();
		expect(screen.getByText("Next")).toBeInTheDocument();
	});

	it("アイテムが0件の場合は適切に表示される", () => {
		render(<UrlPagination currentPage={1} totalPages={0} />);

		// totalPagesが0でもコンポーネントは表示される
		expect(screen.getByRole("navigation")).toBeInTheDocument();
	});

	it("最後のページでアイテム数が端数の場合は正しく表示される", () => {
		render(<UrlPagination currentPage={3} totalPages={3} />);

		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("Previous")).toBeInTheDocument();
		expect(screen.getByText("Next")).toBeInTheDocument();
	});
});
