import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VideosPage from "../page";

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
	fetchVideosForConfigurableList: vi.fn().mockResolvedValue({
		items: [
			{
				id: "video-1",
				title: "テスト動画1",
				description: "説明1",
				channelTitle: "チャンネル1",
				publishedAt: "2024-01-01T00:00:00Z",
				duration: { seconds: 300, formatted: "5:00" },
				thumbnailUrl: "https://example.com/thumb1.jpg",
				viewCount: 100,
				likeCount: 10,
				commentCount: 5,
				hasAudioButtons: true,
			},
			{
				id: "video-2",
				title: "テスト動画2",
				description: "説明2",
				channelTitle: "チャンネル2",
				publishedAt: "2024-01-02T00:00:00Z",
				duration: { seconds: 600, formatted: "10:00" },
				thumbnailUrl: "https://example.com/thumb2.jpg",
				viewCount: 200,
				likeCount: 20,
				commentCount: 10,
				hasAudioButtons: false,
			},
		],
		totalCount: 2,
		filteredCount: 2,
	}),
}));

// Mock VideoList component
vi.mock("../components/VideoList", () => ({
	default: ({ initialData }: any) => (
		<div data-testid="video-list">
			{initialData.items.map((video: any) => (
				<div key={video.id} data-testid={`video-${video.id}`}>
					<h3>{video.title}</h3>
					<p>{video.channelTitle}</p>
				</div>
			))}
		</div>
	),
}));

// Mock the custom list components
vi.mock("@suzumina.click/ui/components/custom/list", () => ({
	ConfigurableList: vi.fn(() => null),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: vi.fn(() => null),
	}),
}));

describe("VideosPage", () => {
	it("基本的なレンダリングが動作する", async () => {
		const searchParams = { page: "1", q: "", category: "", sort: "newest" };

		render(await VideosPage({ searchParams }));

		const list = screen.getByTestId("video-list");
		expect(list).toBeInTheDocument();
		expect(screen.getByTestId("video-video-1")).toBeInTheDocument();
		expect(screen.getByTestId("video-video-2")).toBeInTheDocument();
	});

	it("検索パラメータがServer Actionに正しく渡される", async () => {
		const { fetchVideosForConfigurableList } = await import("../actions");
		const searchParams = {
			page: "2",
			q: "テスト検索",
			categoryNames: "音楽",
			year: "2024",
			videoType: "regular",
			sort: "oldest",
		};

		render(await VideosPage({ searchParams }));

		expect(fetchVideosForConfigurableList).toHaveBeenCalledWith(
			expect.objectContaining({
				page: 2,
				limit: 12,
				search: "テスト検索",
				sort: "oldest",
				filters: expect.objectContaining({
					categoryNames: "音楽",
					year: "2024",
					videoType: "regular",
				}),
			}),
		);
	});

	it("qパラメータが正しく処理される", async () => {
		const { fetchVideosForConfigurableList } = await import("../actions");
		const searchParams = { q: "検索キーワード" };

		render(await VideosPage({ searchParams }));

		// searchパラメータとして渡される
		expect(fetchVideosForConfigurableList).toHaveBeenCalledWith(
			expect.objectContaining({
				search: "検索キーワード",
			}),
		);
	});
});
