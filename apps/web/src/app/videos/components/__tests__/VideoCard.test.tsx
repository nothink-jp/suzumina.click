import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoCard from "../VideoCard";

// モックの設定（認証ゲートは VideoCardActions client island が useSession を使う）
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
		publishedAt: "2024-01-01T00:00:00Z",
		thumbnailUrl: "https://example.com/thumbnail.jpg",
		lastFetchedAt: "2024-01-01T00:00:00Z",
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
		_computed: {
			isArchived: false,
			isPremiere: false,
			isLive: false,
			isUpcoming: false,
			canCreateButton: false,
			videoType: "normal",
			thumbnailUrl: "https://example.com/thumbnail.jpg",
			youtubeUrl: "https://youtube.com/watch?v=abc123",
		},
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

	// Plain Objectを直接返す
	return firestoreData as VideoPlainObject;
}

describe("VideoCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		const video = createMockVideo({
			_computed: {
				...createMockVideo()._computed,
				thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
			},
		});
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
			_computed: {
				...createMockVideo()._computed,
				videoType: "archived",
				isArchived: true,
				canCreateButton: true,
			},
		});
		render(<VideoCard video={video} />);

		expect(screen.getByLabelText("ライブ配信のアーカイブ")).toBeInTheDocument();
		expect(screen.getByText("配信アーカイブ")).toBeInTheDocument();
	});

	it("音声ボタン数バッジが一覧ページへのリンクになっている", () => {
		const video = createMockVideo({ audioButtonCount: 5 });
		render(<VideoCard video={video} />);

		const badgeLink = screen.getByText("5 ボタン").closest("a");
		expect(badgeLink).toHaveAttribute("href", "/buttons?videoId=video123");
	});

	it("タグが表示される", () => {
		const video = createMockVideo({
			tags: {
				playlistTags: ["プレイリストタグ1"],
				userTags: ["ユーザータグ1"],
				contentTags: [],
			},
		});
		render(<VideoCard video={video} />);

		expect(screen.getByText("プレイリストタグ1")).toBeInTheDocument();
		expect(screen.getByText("ユーザータグ1")).toBeInTheDocument();
	});

	it("タグが検索ページへのリンクになっている", () => {
		const video = createMockVideo({
			tags: {
				playlistTags: ["プレイリストタグ1"],
				userTags: ["ユーザータグ1"],
				contentTags: [],
			},
		});
		render(<VideoCard video={video} />);

		const playlistTagLink = screen.getByText("プレイリストタグ1").closest("a");
		expect(playlistTagLink).toHaveAttribute(
			"href",
			"/videos?playlistTags=%E3%83%97%E3%83%AC%E3%82%A4%E3%83%AA%E3%82%B9%E3%83%88%E3%82%BF%E3%82%B01",
		);
	});

	it("searchQuery 指定時にタイトルのマッチ語をハイライトする", () => {
		const video = createMockVideo();
		const { container } = render(<VideoCard video={video} searchQuery="動画" />);

		const marks = [...container.querySelectorAll("mark")];
		expect(marks.some((m) => m.textContent === "動画")).toBe(true);
		// ハイライトはタイトル（video-title）内に存在する
		const titleHeading = container.querySelector('[id^="video-title-"]');
		expect(titleHeading?.querySelector("mark")).not.toBeNull();
	});

	it("searchQuery 未指定時はタイトルをハイライトしない", () => {
		const video = createMockVideo();
		const { container } = render(<VideoCard video={video} />);
		expect(container.querySelector("mark")).toBeNull();
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
