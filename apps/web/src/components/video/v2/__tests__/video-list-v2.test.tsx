import { Video as VideoV2 } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";
import VideoListV2 from "../video-list-v2";

// モックの設定
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/components/ui/thumbnail-image", () => ({
	default: ({ alt, src, ...props }: any) => <img alt={alt} src={src} {...props} />,
}));

// テスト用のVideoV2エンティティを作成するヘルパー
function createMockVideoV2(id: string, title: string): VideoV2 {
	return VideoV2.fromLegacyFormat({
		id,
		videoId: `video_${id}`,
		title,
		description: `${title}の説明文`,
		thumbnailUrl: `https://example.com/thumbnail_${id}.jpg`,
		publishedAt: "2024-01-01T00:00:00Z",
		channelId: "channel123",
		channelTitle: "テストチャンネル",
		categoryId: "22",
		duration: "PT10M30S",
		viewCount: 1000,
		likeCount: 100,
		commentCount: 10,
		liveBroadcastContent: "none",
		liveStreamingDetails: null,
		videoType: "normal",
		playlistTags: [],
		userTags: [],
		audioButtonCount: 0,
	});
}

describe("VideoListV2", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("動画リストが正しく表示される", () => {
		const videos = [
			createMockVideoV2("1", "動画1"),
			createMockVideoV2("2", "動画2"),
			createMockVideoV2("3", "動画3"),
		];

		render(<VideoListV2 videos={videos} />);

		expect(screen.getByText("動画1")).toBeInTheDocument();
		expect(screen.getByText("動画2")).toBeInTheDocument();
		expect(screen.getByText("動画3")).toBeInTheDocument();
	});

	it("音声ボタン数が正しく表示される", () => {
		const videos = [createMockVideoV2("1", "動画1"), createMockVideoV2("2", "動画2")];
		const audioButtonCounts = {
			video_1: 5,
			video_2: 10,
		};

		render(<VideoListV2 videos={videos} audioButtonCounts={audioButtonCounts} />);

		expect(screen.getByText("5 ボタン")).toBeInTheDocument();
		expect(screen.getByText("10 ボタン")).toBeInTheDocument();
	});

	it("ローディング状態が表示される", () => {
		render(<VideoListV2 videos={[]} loading={true} />);

		// LoadingSkeletonコンポーネントが表示されることを確認
		expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
	});

	it("エラー状態が表示される", () => {
		render(<VideoListV2 videos={[]} error="ネットワークエラーが発生しました" />);

		expect(screen.getByText("動画の読み込みに失敗しました")).toBeInTheDocument();
		expect(screen.getByText("ネットワークエラーが発生しました")).toBeInTheDocument();
	});

	it("動画がない場合のメッセージが表示される", () => {
		render(<VideoListV2 videos={[]} />);

		expect(screen.getByText("動画が見つかりませんでした")).toBeInTheDocument();
	});

	it("グリッド表示で正しいクラスが適用される", () => {
		const videos = [createMockVideoV2("1", "動画1")];
		const { container } = render(<VideoListV2 videos={videos} variant="grid" />);

		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
		expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4");
	});

	it("リスト表示で正しいクラスが適用される", () => {
		const videos = [createMockVideoV2("1", "動画1")];
		const { container } = render(<VideoListV2 videos={videos} variant="list" />);

		const list = container.querySelector(".space-y-4");
		expect(list).toBeInTheDocument();
	});

	it("最初の4つの動画にpriorityが設定される（グリッド表示）", () => {
		const videos = Array.from({ length: 6 }, (_, i) =>
			createMockVideoV2(String(i + 1), `動画${i + 1}`),
		);

		render(<VideoListV2 videos={videos} variant="grid" />);

		const images = screen.getAllByRole("img");
		// 最初の4つはeagerローディング
		expect(images[0]).toHaveAttribute("loading", "eager");
		expect(images[1]).toHaveAttribute("loading", "eager");
		expect(images[2]).toHaveAttribute("loading", "eager");
		expect(images[3]).toHaveAttribute("loading", "eager");
		// 5つ目以降はlazyローディング
		expect(images[4]).toHaveAttribute("loading", "lazy");
		expect(images[5]).toHaveAttribute("loading", "lazy");
	});

	it("最初の2つの動画にpriorityが設定される（リスト表示）", () => {
		const videos = Array.from({ length: 4 }, (_, i) =>
			createMockVideoV2(String(i + 1), `動画${i + 1}`),
		);

		render(<VideoListV2 videos={videos} variant="list" />);

		const images = screen.getAllByRole("img");
		// 最初の2つはeagerローディング
		expect(images[0]).toHaveAttribute("loading", "eager");
		expect(images[1]).toHaveAttribute("loading", "eager");
		// 3つ目以降はlazyローディング
		expect(images[2]).toHaveAttribute("loading", "lazy");
		expect(images[3]).toHaveAttribute("loading", "lazy");
	});
});
