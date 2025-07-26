import { Video, type VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoCard from "../VideoCard";

// モックの設定
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/components/ui/thumbnail-image", () => ({
	// biome-ignore lint/performance/noImgElement: モックコンポーネントでは<img>の使用を許可
	default: ({ alt, src, ...props }: any) => <img alt={alt} src={src} {...props} />,
}));

// テスト用のVideoPlainObjectを作成するヘルパー
function createMockVideo(overrides?: Partial<any>): VideoPlainObject {
	const defaultData = {
		id: "video123",
		videoId: "abc123",
		title: "テスト動画タイトル",
		description: "テスト動画の説明文です",
		publishedAt: new Date("2024-01-01T00:00:00Z"),
		thumbnailUrl: "https://example.com/thumbnail.jpg",
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
		playlistTags: ["プレイリストタグ1"],
		userTags: ["ユーザータグ1"],
		audioButtonCount: 0,
	};

	// overridesを適用
	const firestoreData = { ...defaultData };
	if (overrides) {
		Object.assign(firestoreData, overrides);
		// statisticsの個別フィールドを処理
		if (overrides.viewCount !== undefined) firestoreData.statistics.viewCount = overrides.viewCount;
		if (overrides.likeCount !== undefined) firestoreData.statistics.likeCount = overrides.likeCount;
		if (overrides.commentCount !== undefined)
			firestoreData.statistics.commentCount = overrides.commentCount;
	}

	// Video Entityを作成してPlain Objectに変換
	const video = Video.fromFirestoreData(firestoreData);
	return video.toPlainObject();
}

describe("VideoCard", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("動画の基本情報が表示される", () => {
		const video = createMockVideo();
		render(<VideoCard video={video} />);

		expect(screen.getByText("テスト動画タイトル")).toBeInTheDocument();
		expect(screen.getByText("テスト動画の説明文です")).toBeInTheDocument();
		expect(screen.getByText("2024/01/01")).toBeInTheDocument();
	});

	it("サムネイル画像が正しく表示される", () => {
		const video = createMockVideo();
		render(<VideoCard video={video} />);

		const thumbnail = screen.getByAltText("テスト動画タイトルのサムネイル画像");
		expect(thumbnail).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/hqdefault.jpg");
	});

	it("通常動画のバッジが表示される", () => {
		const video = createMockVideo();
		render(<VideoCard video={video} />);

		expect(screen.getByLabelText("通常動画コンテンツ")).toBeInTheDocument();
		expect(screen.getByText("通常動画")).toBeInTheDocument();
	});

	it("配信アーカイブのバッジが表示される", () => {
		const video = createMockVideo({
			videoType: "archived",
			duration: "PT2H30M", // 2時間30分（15分以上）
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:30:00Z",
			},
		});
		render(<VideoCard video={video} />);

		expect(screen.getByLabelText("ライブ配信のアーカイブ")).toBeInTheDocument();
		expect(screen.getByText("配信アーカイブ")).toBeInTheDocument();
	});

	it("音声ボタン数が表示される", () => {
		const video = createMockVideo({ audioButtonCount: 5 });
		render(<VideoCard video={video} />);

		expect(screen.getByLabelText("5個の音声ボタンが作成されています")).toBeInTheDocument();
		expect(screen.getByText("5 ボタン")).toBeInTheDocument();
	});

	it("タグが表示される", () => {
		const video = createMockVideo();
		render(<VideoCard video={video} />);

		expect(screen.getByText("プレイリストタグ1")).toBeInTheDocument();
		expect(screen.getByText("ユーザータグ1")).toBeInTheDocument();
	});

	it("タグクリックで検索ページに遷移する", async () => {
		const user = userEvent.setup();
		const video = createMockVideo();
		render(<VideoCard video={video} />);

		const playlistTag = screen.getByText("プレイリストタグ1");
		await user.click(playlistTag);

		expect(mockPush).toHaveBeenCalledWith(
			"/search?q=%E3%83%97%E3%83%AC%E3%82%A4%E3%83%AA%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B01&type=videos&playlistTags=%E3%83%97%E3%83%AC%E3%82%A4%E3%83%AA%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B01",
		);
	});

	it("ログインしていない場合は音声ボタン作成ボタンが表示されない", () => {
		const video = createMockVideo({
			videoType: "archived",
			duration: "PT2H30M", // 2時間（30分（１５分以上）
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:30:00Z",
			},
		});
		render(<VideoCard video={video} />);

		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
		expect(screen.getByText("詳細を見る")).toBeInTheDocument();
	});

	it("ログインしていて配信アーカイブの場合は音声ボタン作成ボタンが表示される", () => {
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const video = createMockVideo({
			videoType: "archived",
			duration: "PT2H30M", // 2時間（30分（１５分以上）
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T00:00:00Z",
				actualEndTime: "2024-01-01T02:30:00Z",
			},
		});
		render(<VideoCard video={video} />);

		expect(screen.getByText("ボタン作成")).toBeInTheDocument();
	});

	describe("公開日時境界テスト", () => {
		it("年末年始をまたぐ日時が正しくJSTで表示される", () => {
			const video = createMockVideo({
				publishedAt: "2023-12-31T15:30:00Z", // UTC 2023/12/31 15:30 → JST 2024/01/01 00:30
			});
			render(<VideoCard video={video} />);

			// VideoCardでは日付のみ表示
			expect(screen.getByText("2024/01/01")).toBeInTheDocument();
		});
	});
});
