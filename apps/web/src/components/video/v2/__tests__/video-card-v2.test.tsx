import { Video as VideoV2 } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";
import VideoCardV2 from "../video-card-v2";

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
function createMockVideoV2(overrides?: Partial<any>): VideoV2 {
	const defaultData = {
		id: "video123",
		videoId: "abc123",
		title: "テスト動画タイトル",
		description: "テスト動画の説明文です",
		thumbnailUrl: "https://example.com/thumbnail.jpg",
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
		playlistTags: ["プレイリストタグ1"],
		userTags: ["ユーザータグ1"],
		audioButtonCount: 0,
		...overrides,
	};

	// fromLegacyFormatメソッドを使用してVideoV2を作成
	return VideoV2.fromLegacyFormat(defaultData);
}

describe("VideoCardV2", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("動画の基本情報が表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		expect(screen.getByText("テスト動画タイトル")).toBeInTheDocument();
		expect(screen.getByText("テスト動画の説明文です")).toBeInTheDocument();
		expect(screen.getByText("2024/01/01")).toBeInTheDocument();
	});

	it("サムネイル画像が正しく表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		const thumbnail = screen.getByAltText("テスト動画タイトルのサムネイル画像");
		expect(thumbnail).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/hqdefault.jpg");
	});

	it("通常動画のバッジが表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		expect(screen.getByLabelText("通常動画コンテンツ")).toBeInTheDocument();
		expect(screen.getByText("通常動画")).toBeInTheDocument();
	});

	it("配信アーカイブのバッジが表示される", () => {
		const video = createMockVideoV2({
			videoType: "archived",
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:00:00Z",
			},
		});
		render(<VideoCardV2 video={video} />);

		expect(screen.getByLabelText("ライブ配信のアーカイブ")).toBeInTheDocument();
		expect(screen.getByText("配信アーカイブ")).toBeInTheDocument();
	});

	it("音声ボタン数が表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} audioButtonCount={5} />);

		expect(screen.getByLabelText("5個の音声ボタンが作成されています")).toBeInTheDocument();
		expect(screen.getByText("5 ボタン")).toBeInTheDocument();
	});

	it("タグが表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		expect(screen.getByText("プレイリストタグ1")).toBeInTheDocument();
		expect(screen.getByText("ユーザータグ1")).toBeInTheDocument();
	});

	it("タグクリックで検索ページに遷移する", async () => {
		const user = userEvent.setup();
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		const playlistTag = screen.getByText("プレイリストタグ1");
		await user.click(playlistTag);

		expect(mockPush).toHaveBeenCalledWith(
			"/search?q=%E3%83%97%E3%83%AC%E3%82%A4%E3%83%AA%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B01&type=videos&playlistTags=%E3%83%97%E3%83%AC%E3%82%A4%E3%83%AA%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B01",
		);
	});

	it("ログインしていない場合は音声ボタン作成ボタンが表示されない", () => {
		const video = createMockVideoV2({ videoType: "archived" });
		render(<VideoCardV2 video={video} />);

		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
		expect(
			screen.getByText(
				"音声ボタンを作成するにはすずみなふぁみりーメンバーとしてログインが必要です",
			),
		).toBeInTheDocument();
	});

	it("ログインしていて配信アーカイブの場合は音声ボタン作成ボタンが表示される", () => {
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const video = createMockVideoV2({
			videoType: "archived",
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:00:00Z",
			},
		});
		render(<VideoCardV2 video={video} />);

		expect(screen.getByText("ボタン作成")).toBeInTheDocument();
		expect(screen.getByLabelText("テスト動画タイトルの音声ボタンを作成")).toBeInTheDocument();
	});

	it("ログインしていても通常動画の場合は音声ボタン作成ボタンが表示されない", () => {
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const video = createMockVideoV2({ videoType: "normal" });
		render(<VideoCardV2 video={video} />);

		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
		expect(
			screen.getByText("音声ボタンを作成できるのは配信アーカイブのみです"),
		).toBeInTheDocument();
	});

	it("サイドバーバリアントでは異なるレイアウトで表示される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} variant="sidebar" />);

		expect(screen.getByText("動画を見る")).toBeInTheDocument();
		expect(screen.queryByText("詳細を見る")).not.toBeInTheDocument();
	});

	it("priority propがtrueの場合、画像がeagerローディングされる", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} priority />);

		const thumbnail = screen.getByAltText("テスト動画タイトルのサムネイル画像");
		expect(thumbnail).toHaveAttribute("loading", "eager");
	});

	it("動画詳細ページへのリンクが正しく設定される", () => {
		const video = createMockVideoV2();
		render(<VideoCardV2 video={video} />);

		const titleLink = screen.getByRole("link", { name: "テスト動画タイトル" });
		expect(titleLink).toHaveAttribute("href", "/videos/abc123");
	});
});
