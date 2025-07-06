import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoDetail from "./VideoDetail";

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

// Next.js routerのモック
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
}));

// Audio button actionsのモック
vi.mock("@/app/buttons/actions", () => ({
	getAudioButtons: vi.fn().mockResolvedValue({
		success: true,
		data: { audioButtons: [] },
	}),
	getAudioButtonCount: vi.fn().mockResolvedValue(0),
}));

// AudioButtonWithFavoriteClientのモック（NextAuth依存回避）
vi.mock("@/components/AudioButtonWithFavoriteClient", () => ({
	AudioButtonWithFavoriteClient: ({ audioButton }: { audioButton: any }) => {
		return <div data-testid="audio-button-mock">{audioButton.title}</div>;
	},
}));

// Base video data for testing
const baseVideoData: FrontendVideoData = {
	id: "test-video-id",
	videoId: "test-video-id",
	title: "テスト動画",
	description: "これはテスト用の動画です",
	channelId: "test-channel-id",
	channelTitle: "テストチャンネル",
	publishedAt: "2024-01-01T00:00:00Z",
	thumbnailUrl: "https://example.com/thumbnail.jpg",
	lastFetchedAt: "2024-01-01T00:00:00Z",
	videoType: "video",
	liveBroadcastContent: "none",
	audioButtonCount: 0,
	hasAudioButtons: false,
};

describe("VideoDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("動画時間フォーマット境界テスト", () => {
		it("1時間未満の動画時間が正しくhh:mm:ss形式で表示される", async () => {
			const shortVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT59M30S", // 59分30秒
			};

			render(<VideoDetail video={shortVideo} />);

			// 動画時間が00:59:30として表示されることを確認（Timerアイコンと一緒に表示される部分）
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("00:59:30");
		});

		it("1時間ちょうどの動画時間が正しく表示される", async () => {
			const oneHourVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT1H", // 1時間
			};

			render(<VideoDetail video={oneHourVideo} />);

			// 動画時間が01:00:00として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("01:00:00");
		});

		it("長時間の動画時間が正しく表示される", async () => {
			const longVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT2H30M45S", // 2時間30分45秒
			};

			render(<VideoDetail video={longVideo} />);

			// 動画時間が02:30:45として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("02:30:45");
		});

		it("秒のみの短い動画時間が正しく表示される", async () => {
			const veryShortVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT30S", // 30秒
			};

			render(<VideoDetail video={veryShortVideo} />);

			// 動画時間が00:00:30として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("00:00:30");
		});

		it("分のみの動画時間が正しく表示される", async () => {
			const minutesOnlyVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT15M", // 15分
			};

			render(<VideoDetail video={minutesOnlyVideo} />);

			// 動画時間が00:15:00として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("00:15:00");
		});

		it("時間のみの動画時間が正しく表示される", async () => {
			const hoursOnlyVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT3H", // 3時間
			};

			render(<VideoDetail video={hoursOnlyVideo} />);

			// 動画時間が03:00:00として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("03:00:00");
		});

		it("複雑な時間フォーマットが正しく表示される", async () => {
			const complexVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT1H23M45S", // 1時間23分45秒
			};

			render(<VideoDetail video={complexVideo} />);

			// 動画時間が01:23:45として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("01:23:45");
		});

		it("動画時間が未定義の場合は表示されない", async () => {
			const videoWithoutDuration: FrontendVideoData = {
				...baseVideoData,
				duration: undefined,
			};

			render(<VideoDetail video={videoWithoutDuration} />);

			// Timer アイコンの親要素が存在しないことを確認
			const timerElements = screen.queryAllByTitle("動画の長さ");
			expect(timerElements).toHaveLength(0);
		});

		it("無効な動画時間フォーマットの場合は表示されない", async () => {
			const videoWithInvalidDuration: FrontendVideoData = {
				...baseVideoData,
				duration: "invalid-duration",
			};

			render(<VideoDetail video={videoWithInvalidDuration} />);

			// Timer アイコンの親要素が存在しないことを確認
			const timerElements = screen.queryAllByTitle("動画の長さ");
			expect(timerElements).toHaveLength(0);
		});

		it("10時間を超える長時間動画が正しく表示される", async () => {
			const veryLongVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT12H34M56S", // 12時間34分56秒
			};

			render(<VideoDetail video={veryLongVideo} />);

			// 動画時間が12:34:56として表示されることを確認
			const timerElement = await screen.findByTitle("動画の長さ");
			expect(timerElement).toHaveTextContent("12:34:56");
		});
	});

	describe("JST日時表示境界テスト", () => {
		it("時差をまたぐ公開時間が正しくJSTで表示される", async () => {
			const crossTimezoneVideo: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-15T15:30:00Z", // JST 翌日00:30
			};

			render(<VideoDetail video={crossTimezoneVideo} />);

			// JST換算で翌日になることを確認
			expect(await screen.findByText("2024/01/16 00:30:00")).toBeInTheDocument();
		});

		it("ライブ配信の配信開始時間と公開時間の両方が正しく表示される", async () => {
			const liveStreamVideo: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-10T12:00:00Z", // 公開時間
				liveStreamingDetails: {
					actualStartTime: "2024-01-15T20:00:00Z", // 配信開始時間（JST 翌日05:00）
					actualEndTime: "2024-01-15T22:00:00Z",
				},
			};

			render(<VideoDetail video={liveStreamVideo} />);

			// 配信開始時間が主として表示される
			expect(await screen.findByText("配信開始: 2024/01/16 05:00:00")).toBeInTheDocument();
			// 公開時間も付加情報として表示される
			expect(await screen.findByText("公開: 2024/01/10 21:00:00")).toBeInTheDocument();
		});

		it("年末年始をまたぐ日時が正しくJSTで表示される", async () => {
			const newYearVideo: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2023-12-31T15:30:00Z", // JST 2024/01/01 00:30
			};

			render(<VideoDetail video={newYearVideo} />);

			// JST換算で翌年になることを確認
			expect(await screen.findByText("2024/01/01 00:30:00")).toBeInTheDocument();
		});
	});

	describe("統計情報表示テスト", () => {
		it("視聴回数が正しくカンマ区切りで表示される", async () => {
			const videoWithStats: FrontendVideoData = {
				...baseVideoData,
				statistics: {
					viewCount: 1234567,
					likeCount: 89012,
					commentCount: 3456,
				},
			};

			render(<VideoDetail video={videoWithStats} />);

			// 統計情報タブに切り替えて確認
			const user = userEvent.setup();
			const statsTab = await screen.findByRole("tab", { name: "統計情報" });
			await user.click(statsTab);

			// 統計情報タブのコンテンツが表示されるのを待つ
			await screen.findByText("視聴回数");

			// 視聴回数がカンマ区切りで表示されることを確認
			expect(await screen.findByText("1,234,567")).toBeInTheDocument();
			expect(await screen.findByText("89,012")).toBeInTheDocument();
			expect(await screen.findByText("3,456")).toBeInTheDocument();
		});

		it("統計情報が未定義の場合は「データなし」が表示される", async () => {
			const videoWithoutStats: FrontendVideoData = {
				...baseVideoData,
				statistics: undefined,
			};

			render(<VideoDetail video={videoWithoutStats} />);

			// 統計情報タブに切り替えて確認
			const user = userEvent.setup();
			const statsTab = await screen.findByRole("tab", { name: "統計情報" });
			await user.click(statsTab);

			// 統計情報タブのコンテンツが表示されるのを待つ
			await screen.findByText("視聴回数");

			// データなしが表示されることを確認
			const dataNotFoundElements = await screen.findAllByText("データなし");
			expect(dataNotFoundElements.length).toBeGreaterThan(0);
		});

		it("エンゲージメント率が正しく計算される", async () => {
			const videoWithEngagement: FrontendVideoData = {
				...baseVideoData,
				statistics: {
					viewCount: 1000,
					likeCount: 50, // 5%のエンゲージメント率
					commentCount: 25,
				},
			};

			render(<VideoDetail video={videoWithEngagement} />);

			// 統計情報タブに切り替えて確認
			const user = userEvent.setup();
			const statsTab = await screen.findByRole("tab", { name: "統計情報" });
			await user.click(statsTab);

			// 統計情報タブのコンテンツが表示されるのを待つ
			await screen.findByText("視聴回数");

			// エンゲージメント率が5.00%として表示されることを確認
			expect(await screen.findByText("5.00%")).toBeInTheDocument();
		});
	});
});
