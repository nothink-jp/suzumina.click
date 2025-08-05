import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgeVerificationProvider } from "@/contexts/age-verification-context";
import WorksPage from "../page";

// Mock next/server to avoid import errors
vi.mock("next/server", () => ({
	cookies: vi.fn(() => ({
		get: vi.fn(),
		set: vi.fn(),
	})),
	headers: vi.fn(() => new Map()),
}));

// Mock auth.ts to avoid NextAuth module resolution issues
vi.mock("@/auth", () => ({
	auth: () => Promise.resolve(null),
}));

// Mock the server actions
vi.mock("../actions", () => ({
	getWorks: vi.fn().mockResolvedValue({
		works: [
			{
				id: "RJ001",
				productId: "RJ001",
				title: "テスト作品1",
				description: "説明1",
				circle: "サークル1",
				category: "SOU",
				ageRating: "全年齢",
				price: { current: 1000, currency: "JPY" },
				rating: { stars: 4.5, count: 100 },
				releaseDate: "2024-01-01",
				highResImageUrl: "https://example.com/image1.jpg",
			},
			{
				id: "RJ002",
				productId: "RJ002",
				title: "テスト作品2",
				description: "説明2",
				circle: "サークル2",
				category: "SOU",
				ageRating: "R18",
				price: { current: 2000, currency: "JPY" },
				rating: { stars: 4.0, count: 50 },
				releaseDate: "2024-01-02",
				highResImageUrl: "https://example.com/image2.jpg",
			},
		],
		hasMore: false,
		totalCount: 2,
		filteredCount: 2,
	}),
}));

// Mock WorksListGeneric component
vi.mock("../components/WorksListGeneric", () => ({
	default: ({ initialData }: any) => (
		<div data-testid="works-list">
			{initialData?.works?.map((work: any) => (
				<div key={work.id} data-testid={`work-${work.id}`}>
					<h3>{work.title}</h3>
					<p>{work.circle}</p>
				</div>
			))}
		</div>
	),
}));

// Mock Metadata component
vi.mock("../components/WorksMetadata", () => ({
	generateWorksMetadata: vi.fn().mockReturnValue({
		title: "DLsite作品一覧",
		description: "作品一覧ページ",
	}),
}));

// Mock AgeVerificationDialog
vi.mock("@/components/system/age-verification-dialog", () => ({
	AgeVerificationDialog: () => null,
}));

// Mock WorksPageClient
vi.mock("@/components/content/works-page-client", () => ({
	WorksPageClient: ({ initialData }: any) => (
		<div data-testid="works-list">
			{initialData?.works?.map((work: any) => (
				<div key={work.id} data-testid={`work-${work.id}`}>
					<h3>{work.title}</h3>
					<p>{work.circle}</p>
				</div>
			))}
		</div>
	),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: vi.fn(() => null),
	}),
}));

describe("WorksPage", () => {
	it("基本的なレンダリングが動作する", async () => {
		const searchParams = { page: "1", q: "", category: "", sort: "newest" };

		render(<AgeVerificationProvider>{await WorksPage({ searchParams })}</AgeVerificationProvider>);

		const list = screen.getByTestId("works-list");
		expect(list).toBeInTheDocument();
		expect(screen.getByTestId("work-RJ001")).toBeInTheDocument();
		expect(screen.getByTestId("work-RJ002")).toBeInTheDocument();
	});

	it("検索パラメータがServer Actionに正しく渡される", async () => {
		const { getWorks } = await import("../actions");
		const searchParams = {
			page: "2",
			q: "テスト検索",
			category: "SOU",
			language: "ja",
			showR18: "false",
			sort: "price_low",
		};

		render(<AgeVerificationProvider>{await WorksPage({ searchParams })}</AgeVerificationProvider>);

		expect(getWorks).toHaveBeenCalledWith(
			expect.objectContaining({
				page: 2,
				search: "テスト検索",
				category: "SOU",
				language: "ja",
				showR18: false,
				sort: "price_low",
			}),
		);
	});

	it("showR18パラメータのデフォルト値が正しく処理される", async () => {
		const { getWorks } = await import("../actions");

		// showR18パラメータなしの場合
		const searchParams = { page: "1", q: "宮村" };

		render(<AgeVerificationProvider>{await WorksPage({ searchParams })}</AgeVerificationProvider>);

		// showR18がundefinedで渡される（デフォルトで全作品表示）
		expect(getWorks).toHaveBeenCalledWith(
			expect.objectContaining({
				search: "宮村",
				showR18: undefined,
			}),
		);
	});
});
