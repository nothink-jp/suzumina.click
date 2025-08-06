/**
 * Creator page component のテストスイート
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next.js モック
vi.mock("next/navigation", () => ({
	notFound: vi.fn(),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		refresh: vi.fn(),
	})),
	useSearchParams: vi.fn(() => ({
		get: vi.fn(() => null),
	})),
}));

// Server Actions モック
vi.mock("../actions", () => ({
	getCreatorInfo: vi.fn(),
	getCreatorWorks: vi.fn(),
	getCreatorWithWorks: vi.fn(),
	getCreatorWithWorksWithPagination: vi.fn(),
	getCreatorWorksList: vi.fn(),
}));

// コンポーネントモック
vi.mock("../components/CreatorWorksList", () => ({
	default: vi.fn(() => <div data-testid="creator-works-list">CreatorWorksList</div>),
}));

vi.mock("@/app/components/BackButton", () => ({
	BackButton: () => <button type="button">戻る</button>,
}));

vi.mock("@/app/works/components/WorkCard", () => ({
	default: ({ work }: any) => (
		<div data-testid="work-card">
			<h3>{work.title}</h3>
			<p>{work.circle}</p>
		</div>
	),
}));

// shared-types モック
vi.mock("@suzumina.click/shared-types", () => ({
	getCreatorTypeLabel: vi.fn((types: string[]) => {
		const labels: Record<string, string> = {
			voice: "声優",
			illustration: "イラスト",
			scenario: "シナリオ",
			music: "音楽",
			other: "その他",
		};
		return types.map((t) => labels[t] || t).join(" / ");
	}),
	convertToFrontendWork: vi.fn((work: any) => work), // パススルー変換
	convertToWorkPlainObject: vi.fn((work: any) => work), // パススルー変換
}));

// テスト対象のインポート（モック設定後）
import * as actions from "../actions";
import CreatorPage from "../page";

describe("CreatorPage", () => {
	const mockCreatorInfo = {
		id: "creator123",
		name: "テストクリエイター",
		types: ["voice", "illustration"],
		workCount: 5,
	};

	const mockWorks = [
		{
			id: "RJ111111",
			productId: "RJ111111",
			title: "作品1",
			circle: "サークルA",
			circleId: "RG11111",
			priceInJPY: 1100,
			registDate: new Date("2025-01-15"),
			images: { main: "image1.jpg", list: "list1.jpg" },
			options: { genre: ["ボイス・ASMR"], aiUsed: false },
			tags: ["tag1"],
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
			circle: "サークルB",
			circleId: "RG22222",
			priceInJPY: 2200,
			registDate: new Date("2025-01-10"),
			images: { main: "image2.jpg", list: "list2.jpg" },
			options: { genre: ["音声作品"], aiUsed: true },
			tags: ["tag2"],
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

	it("クリエイター情報と作品一覧を正しく表示する", async () => {
		(actions.getCreatorInfo as any).mockResolvedValue(mockCreatorInfo);
		(actions.getCreatorWorksList as any).mockResolvedValue({
			works: mockWorks,
			totalCount: 2,
		});

		// 非同期コンポーネントの実行を待つ
		const CreatorPageComponent = await CreatorPage({
			params: Promise.resolve({ creatorId: "creator123" }),
			searchParams: Promise.resolve({ page: "1" }),
		});

		// レンダリング
		render(CreatorPageComponent);

		// 役割の表示
		expect(screen.getByText(/声優 \/ イラスト/)).toBeInTheDocument();

		// 統計情報の表示（部分一致で検索）
		expect(screen.getByText(/参加作品数:.*5件/)).toBeInTheDocument();

		// CreatorWorksListコンポーネントが表示される
		expect(screen.getByTestId("creator-works-list")).toBeInTheDocument();
	});

	it("クリエイターが存在しない場合は404を表示する", async () => {
		const { notFound } = await import("next/navigation");
		(actions.getCreatorInfo as any).mockResolvedValue(null);

		// 非同期コンポーネントの実行を試みる
		try {
			await CreatorPage({
				params: Promise.resolve({ creatorId: "nonexistent" }),
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
		(actions.getCreatorInfo as any).mockResolvedValue(mockCreatorInfo);
		(actions.getCreatorWorksList as any).mockResolvedValue({
			works: [],
			totalCount: 0,
		});

		// 非同期コンポーネントの実行を待つ
		const CreatorPageComponent = await CreatorPage({
			params: Promise.resolve({ creatorId: "creator123" }),
			searchParams: Promise.resolve({ page: "1" }),
		});

		// レンダリング
		render(CreatorPageComponent);

		// クリエイター名の表示確認
		expect(screen.getByText("テストクリエイター")).toBeInTheDocument();

		// CreatorWorksListコンポーネントが表示される（空でも）
		expect(screen.getByTestId("creator-works-list")).toBeInTheDocument();
	});

	it("単一の役割の場合も正しく表示する", async () => {
		const singleTypeCreator = {
			...mockCreatorInfo,
			types: ["voice"],
		};
		(actions.getCreatorInfo as any).mockResolvedValue(singleTypeCreator);
		(actions.getCreatorWorksList as any).mockResolvedValue({
			works: [],
			totalCount: 0,
		});

		// 非同期コンポーネントの実行を待つ
		const CreatorPageComponent = await CreatorPage({
			params: Promise.resolve({ creatorId: "creator123" }),
			searchParams: Promise.resolve({ page: "1" }),
		});

		// レンダリング
		render(CreatorPageComponent);

		// クリエイター名の表示確認
		expect(screen.getByText("テストクリエイター")).toBeInTheDocument();
		expect(screen.getByText(/声優/)).toBeInTheDocument();
	});

	it("メタデータが正しく生成される", async () => {
		(actions.getCreatorInfo as any).mockResolvedValue(mockCreatorInfo);

		// generateMetadata 関数を直接テスト
		const { generateMetadata } = await import("../page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ creatorId: "creator123" }),
		});

		expect(metadata).toEqual({
			title: "テストクリエイター - suzumina.click",
			description:
				"クリエイター「テストクリエイター」（声優 / イラスト）の参加作品一覧。総作品数: 5作品",
			openGraph: {
				title: "テストクリエイター - suzumina.click",
				description:
					"クリエイター「テストクリエイター」（声優 / イラスト）の参加作品一覧。総作品数: 5作品",
			},
		});
	});

	it("存在しないクリエイターのメタデータはデフォルト値を返す", async () => {
		(actions.getCreatorInfo as any).mockResolvedValue(null);

		const { generateMetadata } = await import("../page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ creatorId: "nonexistent" }),
		});

		expect(metadata).toEqual({
			title: "クリエイター情報 - suzumina.click",
			description: "DLsite作品のクリエイター参加作品一覧",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
