/**
 * Circle page component のテストスイート
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js モック
vi.mock("next/navigation", () => ({
	notFound: vi.fn(),
}));

// Server Actions モック
vi.mock("../actions", () => ({
	getCircleInfo: vi.fn(),
	getCircleWorks: vi.fn(),
	getCircleWithWorks: vi.fn(),
	getCircleWithWorksWithPagination: vi.fn(),
}));

// コンポーネントモック
vi.mock("../components/CirclePageClient", () => ({
	CirclePageClient: ({ circle, initialData }: any) => (
		<div data-testid="circle-page-client">
			<h1>{circle.name}</h1>
			{circle.nameEn && <p>{circle.nameEn}</p>}
			<p>作品数: {circle.workCount}件</p>
			{initialData.map((work: any) => (
				<div key={work.id} data-testid="work-card">
					<h3>{work.title}</h3>
				</div>
			))}
		</div>
	),
}));

// shared-types モック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToFrontendWork: vi.fn((work: any) => work), // パススルー変換
}));

// テスト対象のインポート（モック設定後）
import * as actions from "../actions";
import CirclePage from "../page";

describe("CirclePage", () => {
	const mockCircleData = {
		id: "RG12345",
		circleId: "RG12345",
		name: "テストサークル",
		nameEn: "Test Circle",
		workCount: 10,
		url: "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG12345.html",
		isNew: false,
		isActive: true,
		hasWorks: true,
		createdAt: "2024-01-01T00:00:00.000Z",
		lastUpdated: "2025-01-01T00:00:00.000Z",
	};

	const mockWorks = [
		{
			id: "RJ111111",
			productId: "RJ111111",
			title: "作品1",
			circle: "テストサークル",
			circleId: "RG12345",
			priceInJPY: 1100,
			registDate: new Date("2025-01-15"),
			images: { main: "image1.jpg", list: "list1.jpg" },
			options: { genre: ["ボイス・ASMR"], aiUsed: false },
			tags: ["tag1", "tag2"],
			rating: { stars: 45, count: 5 },
			age: { category: "adult" },
			createdAt: "2025-01-15",
			lastModified: "2025-01-15",
			isDeleted: false,
			isSoldOnDlsite: true,
			options_explained: {},
		},
		{
			id: "RJ222222",
			productId: "RJ222222",
			title: "作品2",
			circle: "テストサークル",
			circleId: "RG12345",
			priceInJPY: 2200,
			registDate: new Date("2025-01-10"),
			images: { main: "image2.jpg", list: "list2.jpg" },
			options: { genre: ["音声作品"], aiUsed: true },
			tags: ["tag3"],
			rating: { stars: 40, count: 3 },
			age: { category: "general" },
			createdAt: "2025-01-10",
			lastModified: "2025-01-10",
			isDeleted: false,
			isSoldOnDlsite: true,
			options_explained: {},
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("サークル情報と作品一覧を正しく表示する", async () => {
		(actions.getCircleWithWorksWithPagination as any).mockResolvedValue({
			circle: mockCircleData,
			works: mockWorks,
			totalCount: 2,
		});

		// 非同期コンポーネントの実行を待つ
		const CirclePageComponent = await CirclePage({
			params: Promise.resolve({ circleId: "RG12345" }),
			searchParams: Promise.resolve({ page: "1" }),
		});

		// レンダリング
		render(CirclePageComponent);

		// サークル名の表示確認
		expect(screen.getByText("テストサークル")).toBeInTheDocument();

		// 英語名の表示
		expect(screen.getByText("Test Circle")).toBeInTheDocument();

		// 統計情報の表示（部分一致で検索）
		expect(screen.getByText(/作品数:.*10件/)).toBeInTheDocument();

		// 作品カードの表示
		const workCards = screen.getAllByTestId("work-card");
		expect(workCards).toHaveLength(2);
		expect(screen.getByText("作品1")).toBeInTheDocument();
		expect(screen.getByText("作品2")).toBeInTheDocument();
	});

	it("サークルが存在しない場合は404を表示する", async () => {
		const { notFound } = await import("next/navigation");
		(actions.getCircleWithWorksWithPagination as any).mockResolvedValue(null);

		// 非同期コンポーネントの実行を試みる
		try {
			await CirclePage({
				params: Promise.resolve({ circleId: "RG99999" }),
				searchParams: Promise.resolve({}),
			});
		} catch (_error) {
			// Next.jsのnotFound()が呼ばれる前にエラーが発生することを想定
			// これは期待される動作
		}

		// notFound が呼ばれることを確認
		expect(notFound).toHaveBeenCalled();
	});

	it("作品が存在しない場合も正しく表示する", async () => {
		(actions.getCircleWithWorksWithPagination as any).mockResolvedValue({
			circle: mockCircleData,
			works: [],
			totalCount: 0,
		});

		// 非同期コンポーネントの実行を待つ
		const CirclePageComponent = await CirclePage({
			params: Promise.resolve({ circleId: "RG12345" }),
			searchParams: Promise.resolve({}),
		});

		// レンダリング
		render(CirclePageComponent);

		// サークル名の表示確認
		expect(screen.getByText("テストサークル")).toBeInTheDocument();

		// 作品カードは表示されない
		const workCards = screen.queryAllByTestId("work-card");
		expect(workCards).toHaveLength(0);
	});

	it("英語名がない場合は日本語名のみ表示する", async () => {
		const circleWithoutEnName = {
			...mockCircleData,
			nameEn: undefined,
		};
		(actions.getCircleWithWorksWithPagination as any).mockResolvedValue({
			circle: circleWithoutEnName,
			works: [],
			totalCount: 0,
		});

		// 非同期コンポーネントの実行を待つ
		const CirclePageComponent = await CirclePage({
			params: Promise.resolve({ circleId: "RG12345" }),
			searchParams: Promise.resolve({}),
		});

		// レンダリング
		render(CirclePageComponent);

		// サークル名の表示確認
		expect(screen.getByText("テストサークル")).toBeInTheDocument();

		// 英語名は表示されない
		expect(screen.queryByText("Test Circle")).not.toBeInTheDocument();
	});

	it("メタデータが正しく生成される", async () => {
		(actions.getCircleInfo as any).mockResolvedValue(mockCircleData);

		// generateMetadata 関数を直接テスト
		const { generateMetadata } = await import("../page");
		const metadata = await generateMetadata({ params: Promise.resolve({ circleId: "RG12345" }) });

		expect(metadata).toEqual({
			title: "テストサークル - suzumina.click",
			description: "サークル「テストサークル」の作品一覧。総作品数: 10作品",
			openGraph: {
				title: "テストサークル - suzumina.click",
				description: "サークル「テストサークル」の作品一覧。総作品数: 10作品",
			},
		});
	});

	it("存在しないサークルのメタデータはデフォルト値を返す", async () => {
		(actions.getCircleInfo as any).mockResolvedValue(null);

		const { generateMetadata } = await import("../page");
		const metadata = await generateMetadata({ params: Promise.resolve({ circleId: "RG99999" }) });

		expect(metadata).toEqual({
			title: "サークル情報 - suzumina.click",
			description: "DLsiteサークルの作品一覧",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
