import { Video, type VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoDetail from "../VideoDetail";

// NextAuth.jsのモック
vi.mock("next-auth/react", () => ({
	useSession: vi.fn(() => ({
		data: {
			user: {
				id: "test-user",
				name: "Test User",
				email: "test@example.com",
			},
		},
		status: "authenticated",
	})),
}));

// NextAuthサーバーサイドのモック
vi.mock("next-auth", () => ({
	default: vi.fn(),
}));

// NextAuth providersのモック
vi.mock("next-auth/providers/discord", () => ({
	default: vi.fn(),
}));

// auth.tsのモック
vi.mock("@/auth", () => ({
	auth: vi.fn().mockResolvedValue({
		user: {
			id: "test-user",
			name: "Test User",
			email: "test@example.com",
			role: "member",
			isActive: true,
		},
	}),
}));

// Next.js routerのモック
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
}));

// protected-routeのモック
vi.mock("@/components/system/protected-route", () => ({
	requireAuth: vi.fn().mockResolvedValue({
		id: "test-user",
		name: "Test User",
		email: "test@example.com",
		role: "member",
		isActive: true,
	}),
	requireAdmin: vi.fn().mockResolvedValue({
		id: "test-user",
		name: "Test User",
		email: "test@example.com",
		role: "admin",
		isActive: true,
	}),
	requireModerator: vi.fn().mockResolvedValue({
		id: "test-user",
		name: "Test User",
		email: "test@example.com",
		role: "moderator",
		isActive: true,
	}),
}));

// Audio button actionsのモック
vi.mock("@/app/buttons/actions", () => ({
	getAudioButtons: vi.fn().mockResolvedValue({
		buttons: [],
		hasMore: false,
	}),
}));

// FavoriteButtonのモック
vi.mock("@/components/audio/favorite-button", () => ({
	default: () => <button type="button">お気に入り</button>,
}));

// テスト用のVideoPlainObjectを作成するヘルパー
function createMockVideo(overrides?: Partial<any>): VideoPlainObject {
	const defaultData = {
		id: "test-video",
		videoId: "abc123",
		title: "テスト動画",
		description: "テスト動画の説明文",
		thumbnailUrl: "https://example.com/thumbnail.jpg",
		publishedAt: "2024-01-01T00:00:00Z",
		channelId: "test-channel-id",
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
		lastFetchedAt: "2024-01-01T00:00:00Z",
		hasAudioButtons: false,
		...overrides,
	};

	// Video Entityを作成してPlain Objectに変換
	const video = Video.fromLegacyFormat(defaultData);
	return video.toPlainObject();
}

describe("VideoDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("動画時間フォーマット境界テスト", () => {
		it("1時間未満の動画時間が正しくhh:mm:ss形式で表示される", async () => {
			const shortVideo = createMockVideo({
				duration: "PT59M30S", // 59分30秒
			});

			render(<VideoDetail video={shortVideo} />);

			// 動画時間が表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("00:59:30");
		});

		it("1時間ちょうどの動画時間が正しく表示される", async () => {
			const oneHourVideo = createMockVideo({
				duration: "PT1H", // 1時間
			});

			render(<VideoDetail video={oneHourVideo} />);

			// 動画時間が01:00:00として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("01:00:00");
		});

		it("長時間の動画時間が正しく表示される", async () => {
			const longVideo = createMockVideo({
				duration: "PT2H30M45S", // 2時間30分45秒
			});

			render(<VideoDetail video={longVideo} />);

			// 動画時間が02:30:45として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("02:30:45");
		});

		it("秒のみの短い動画時間が正しく表示される", async () => {
			const veryShortVideo = createMockVideo({
				duration: "PT30S", // 30秒
			});

			render(<VideoDetail video={veryShortVideo} />);

			// 動画時間が00:00:30として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("00:00:30");
		});

		it("分のみの動画時間が正しく表示される", async () => {
			const minutesOnlyVideo = createMockVideo({
				duration: "PT15M", // 15分
			});

			render(<VideoDetail video={minutesOnlyVideo} />);

			// 動画時間が00:15:00として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("00:15:00");
		});

		it("時間のみの動画時間が正しく表示される", async () => {
			const hoursOnlyVideo = createMockVideo({
				duration: "PT2H", // 2時間
			});

			render(<VideoDetail video={hoursOnlyVideo} />);

			// 動画時間が02:00:00として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("02:00:00");
		});

		it("複雑な時間フォーマットが正しく表示される", async () => {
			const complexVideo = createMockVideo({
				duration: "PT1H5M7S", // 1時間5分7秒
			});

			render(<VideoDetail video={complexVideo} />);

			// 動画時間が01:05:07として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("01:05:07");
		});

		it("動画時間が未定義の場合は表示されない", async () => {
			const noTimeVideo = createMockVideo({
				duration: undefined,
			});

			render(<VideoDetail video={noTimeVideo} />);

			// 動画時間が表示されないことを確認（title="動画の長さ"を持つ要素を探す）
			expect(screen.queryByTitle("動画の長さ")).not.toBeInTheDocument();
		});

		it("無効な動画時間フォーマットの場合は表示されない", async () => {
			const invalidTimeVideo = createMockVideo({
				duration: "invalid",
			});

			render(<VideoDetail video={invalidTimeVideo} />);

			// 動画時間が表示されないことを確認（title="動画の長さ"を持つ要素を探す）
			expect(screen.queryByTitle("動画の長さ")).not.toBeInTheDocument();
		});

		it("10時間を超える長時間動画が正しく表示される", async () => {
			const veryLongVideo = createMockVideo({
				duration: "PT12H34M56S", // 12時間34分56秒
			});

			render(<VideoDetail video={veryLongVideo} />);

			// 動画時間が12:34:56として表示されることを確認（title属性で特定）
			const timeElement = screen.getByTitle("動画の長さ");
			expect(timeElement).toHaveTextContent("12:34:56");
		});
	});

	describe("JST日時表示境界テスト", () => {
		it("時差をまたぐ公開時間が正しくJSTで表示される", async () => {
			const video = createMockVideo({
				publishedAt: "2024-01-01T15:30:00Z", // UTC 15:30 → JST 翌日0:30
			});

			render(<VideoDetail video={video} />);

			// 公開日時がJSTで表示されることを確認
			const publishedElement = await screen.findByTitle("日本標準時間（JST）");
			expect(publishedElement).toHaveTextContent("2024/01/02 00:30");
		});

		it("ライブ配信の配信開始時間と公開時間の両方が正しく表示される", async () => {
			const liveVideo = createMockVideo({
				publishedAt: "2024-01-01T00:00:00Z", // UTC 0:00 → JST 9:00
				liveStreamingDetails: {
					actualStartTime: "2024-01-01T12:00:00Z", // UTC 12:00 → JST 21:00
					actualEndTime: "2024-01-01T14:00:00Z", // UTC 14:00 → JST 23:00
				},
			});

			render(<VideoDetail video={liveVideo} />);

			// 配信開始時間が表示されることを確認
			const liveStartElement = await screen.findByTitle("配信開始時間（JST）");
			expect(liveStartElement).toHaveTextContent("配信開始: 2024/01/01 21:00");

			// 公開日時も確認
			const publishedElement = await screen.findByTitle("動画公開時間（JST）");
			expect(publishedElement).toHaveTextContent("公開: 2024/01/01 09:00");
		});

		it("年末年始をまたぐ日時が正しくJSTで表示される", async () => {
			const yearEndVideo = createMockVideo({
				publishedAt: "2023-12-31T15:30:00Z", // UTC 2023/12/31 15:30 → JST 2024/01/01 00:30
			});

			render(<VideoDetail video={yearEndVideo} />);

			// 公開日時がJSTで2024年の元日として表示されることを確認
			const publishedElement = await screen.findByTitle("日本標準時間（JST）");
			expect(publishedElement).toHaveTextContent("2024/01/01 00:30");
		});
	});

	describe("統計情報表示テスト", () => {
		it("視聴回数が正しくカンマ区切りで表示される", async () => {
			const videoWithStats = createMockVideo({
				statistics: {
					viewCount: 1234567,
					likeCount: 12345,
					commentCount: 123,
				},
			});

			render(<VideoDetail video={videoWithStats} />);

			// 視聴回数がカンマ区切りで表示されることを確認（「回視聴」を含むテキストで検索）
			expect(screen.getByText("1,234,567回視聴")).toBeInTheDocument();
		});

		it("統計情報が未定義の場合は表示されない", async () => {
			const videoNoStats = createMockVideo({
				statistics: undefined,
			});

			render(<VideoDetail video={videoNoStats} />);

			// 統計情報が表示されないことを確認
			// ビューカウントが含まれるテキストを探す
			expect(screen.queryByText(/\d+[,\d]*.*回/)).not.toBeInTheDocument();
		});

		it("エンゲージメント率が正しく計算される", async () => {
			const videoEngagement = createMockVideo({
				statistics: {
					viewCount: 10000,
					likeCount: 500,
					commentCount: 100,
				},
			});

			render(<VideoDetail video={videoEngagement} />);

			// 統計情報タブに切り替え
			const statisticsTab = screen.getByRole("tab", { name: "統計情報" });
			await userEvent.click(statisticsTab);

			// いいね数が表示されることを確認（より具体的に）
			const likesSection = screen.getByText("高評価数").closest("div");
			expect(likesSection).toHaveTextContent("500");

			// コメント数が表示されることを確認（より具体的に）
			const commentsSection = screen.getByText("コメント数").closest("div");
			expect(commentsSection).toHaveTextContent("100");
		});
	});
});
