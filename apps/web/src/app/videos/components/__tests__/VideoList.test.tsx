import { Video, type VideoListResult, type VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoList from "../VideoList";

// モックの設定
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/components/ui/thumbnail-image", () => ({
	// biome-ignore lint/performance/noImgElement: モックコンポーネントでは<img>の使用を許可
	default: ({ alt, src, ...props }: any) => <img alt={alt} src={src} {...props} />,
}));

vi.mock("../VideoCard", () => ({
	default: ({ video }: { video: VideoPlainObject }) => (
		<div data-testid="video-card">
			<h3>{video.title}</h3>
		</div>
	),
}));

// テスト用のVideoPlainObjectを作成するヘルパー
function createMockVideo(id: string, title: string): VideoPlainObject {
	const firestoreData = {
		id,
		videoId: `video_${id}`,
		title,
		description: `${title}の説明文`,
		publishedAt: new Date("2024-01-01T00:00:00Z"),
		thumbnailUrl: `https://example.com/thumbnail_${id}.jpg`,
		lastFetchedAt: new Date("2024-01-01T00:00:00Z"),
		channelId: "channel123",
		channelTitle: "テストチャンネル",
		categoryId: "22",
		duration: "PT10M30S",
		statistics: {
			viewCount: 1000,
			likeCount: 100,
			commentCount: 10,
		},
		liveBroadcastContent: "none",
		liveStreamingDetails: null,
		videoType: "normal",
		playlistTags: [],
		userTags: [],
		audioButtonCount: 0,
	};

	const video = Video.fromFirestoreData(firestoreData);
	return video.toPlainObject();
}

describe("VideoList", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };
	const mockSearchParams = new URLSearchParams();

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSearchParams as any).mockReturnValue(mockSearchParams);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("動画リストが表示される", () => {
		const mockData: VideoListResult = {
			items: [
				createMockVideo("1", "動画1"),
				createMockVideo("2", "動画2"),
				createMockVideo("3", "動画3"),
			],
			videos: [
				createMockVideo("1", "動画1"),
				createMockVideo("2", "動画2"),
				createMockVideo("3", "動画3"),
			],
			total: 3,
			page: 1,
			pageSize: 3,
			hasMore: false,
		};

		render(<VideoList data={mockData} totalCount={100} filteredCount={3} currentPage={1} />);

		expect(screen.getByText("動画1")).toBeInTheDocument();
		expect(screen.getByText("動画2")).toBeInTheDocument();
		expect(screen.getByText("動画3")).toBeInTheDocument();
	});

	it("フィルタ適用時の件数が正しく表示される", () => {
		// モックのsearchParamsを設定（年フィルタが適用されている状態）
		(useSearchParams as any).mockReturnValue(new URLSearchParams("year=2024"));

		const mockData: VideoListResult = {
			items: [createMockVideo("1", "動画1")],
			videos: [createMockVideo("1", "動画1")],
			total: 1,
			page: 1,
			pageSize: 1,
			hasMore: false,
		};

		render(<VideoList data={mockData} totalCount={100} filteredCount={1} currentPage={1} />);

		// タイトルを探して確認
		const titleElement = screen.getByRole("heading", { level: 2 });
		expect(titleElement).toHaveTextContent("動画一覧");
		// フィルタ適用時の件数表示を確認
		expect(titleElement).toHaveTextContent("(1件 / 全100件)");
	});

	it("動画がない場合は空の状態が表示される", () => {
		const mockData: VideoListResult = {
			items: [],
			videos: [],
			total: 0,
			page: 1,
			pageSize: 0,
			hasMore: false,
		};

		render(<VideoList data={mockData} totalCount={0} currentPage={1} />);

		expect(screen.getByText("動画が見つかりませんでした")).toBeInTheDocument();
	});

	it("検索フィルタが動作する", async () => {
		const user = userEvent.setup();
		const mockData: VideoListResult = {
			items: [],
			videos: [],
			total: 0,
			page: 1,
			pageSize: 0,
			hasMore: false,
		};

		render(<VideoList data={mockData} totalCount={0} currentPage={1} />);

		const searchInput = screen.getByPlaceholderText("動画タイトルで検索...");
		await user.type(searchInput, "テスト検索");

		const searchButton = screen.getByText("検索");
		await user.click(searchButton);

		expect(mockPush).toHaveBeenCalledWith(
			expect.stringContaining("search=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2"),
		);
	});
});
