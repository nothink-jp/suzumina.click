import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import { render, screen } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import VideoList from "./VideoList";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}));

// Mock VideoCard component
vi.mock("./VideoCard", () => ({
	default: vi.fn(({ video }) => <div data-testid={`video-${video.id}`}>{video.title}</div>),
}));

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

const mockVideoListData: VideoListResult = {
	videos: [
		{
			id: "video1",
			videoId: "video1",
			title: "テスト動画1",
			description: "テスト説明1",
			publishedAt: "2024-01-01T00:00:00Z",
			publishedAtISO: "2024-01-01T00:00:00Z",
			thumbnailUrl: "https://example.com/thumb1.jpg",
			thumbnails: {
				high: { url: "https://example.com/thumb1.jpg" },
				medium: { url: "https://example.com/thumb1.jpg" },
				default: { url: "https://example.com/thumb1.jpg" },
			},
			channelId: "test-channel",
			channelTitle: "テストチャンネル",
			lastFetchedAt: "2024-01-01T00:00:00Z",
			lastFetchedAtISO: "2024-01-01T00:00:00Z",
			liveBroadcastContent: "none",
			audioButtonCount: 0,
			hasAudioButtons: false,
			categoryId: "24", // エンターテインメント
		},
	],
	hasMore: false,
};

describe("VideoList", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue({
			push: mockPush,
		} as any);

		vi.mocked(useSearchParams).mockReturnValue(mockSearchParams);
		mockPush.mockClear();
	});

	it("カテゴリーフィルタが正しく表示される", () => {
		render(<VideoList data={mockVideoListData} totalCount={1} currentPage={1} />);

		// カテゴリーフィルタのトリガーボタンが存在することを確認
		expect(screen.getByText("すべてのカテゴリ")).toBeInTheDocument();
	});

	it("年代フィルタが正しく表示される", () => {
		render(<VideoList data={mockVideoListData} totalCount={1} currentPage={1} />);

		// 年代フィルタのトリガーボタンが存在することを確認
		expect(screen.getByText("すべての年代")).toBeInTheDocument();
	});

	it("動画が正しく表示される", () => {
		render(<VideoList data={mockVideoListData} totalCount={1} currentPage={1} />);

		// モックされたVideoCardが表示されることを確認
		expect(screen.getByTestId("video-video1")).toBeInTheDocument();
		expect(screen.getByText("テスト動画1")).toBeInTheDocument();
	});

	it("動画が0件の場合は空状態が表示される", () => {
		const emptyData: VideoListResult = {
			videos: [],
			hasMore: false,
		};

		render(<VideoList data={emptyData} totalCount={0} currentPage={1} />);

		expect(screen.getByText("動画が見つかりませんでした")).toBeInTheDocument();
	});

	it("カテゴリーフィルタが設定されている場合のURLパラメータが正しく表示される", () => {
		// categoryNames URLパラメータを設定
		const mockSearchParamsWithCategory = new URLSearchParams();
		mockSearchParamsWithCategory.set("categoryNames", "エンターテインメント");

		vi.mocked(useSearchParams).mockReturnValue(mockSearchParamsWithCategory);

		render(<VideoList data={mockVideoListData} totalCount={1} currentPage={1} />);

		// カテゴリーフィルタのトリガーボタンでエンターテインメントが選択されていることを確認
		expect(screen.getByText("エンターテインメント")).toBeInTheDocument();
	});
});
