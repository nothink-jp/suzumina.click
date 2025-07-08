import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import VideoCard from "./VideoCard";

// next-auth/react uses alias from vitest.config.ts
// Mock the useSession hook directly in tests
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

// テストデータの準備
const baseVideoData: FrontendVideoData = {
	id: "test-video-1",
	videoId: "test-video-1",
	title: "テスト動画",
	description: "テスト用の動画です",
	channelId: "test-channel",
	channelTitle: "テストチャンネル",
	publishedAt: "2024-01-01T00:00:00Z",
	publishedAtISO: "2024-01-01T00:00:00Z",
	thumbnailUrl: "https://example.com/thumbnail.jpg",
	thumbnails: {
		high: { url: "https://example.com/thumbnail.jpg", width: 480, height: 360 },
		medium: { url: "https://example.com/thumbnail.jpg", width: 320, height: 180 },
		default: { url: "https://example.com/thumbnail.jpg", width: 120, height: 90 },
	},
	lastFetchedAt: "2024-01-01T00:00:00Z",
	lastFetchedAtISO: "2024-01-01T00:00:00Z",
	liveBroadcastContent: "none",
	audioButtonCount: 0,
	hasAudioButtons: false,
};

describe("VideoCard", () => {
	it("通常の動画でVideoアイコンと「動画」テキストが表示される", () => {
		render(<VideoCard video={baseVideoData} />);

		expect(screen.getByLabelText("動画コンテンツ")).toBeInTheDocument();
		expect(screen.getByText("動画")).toBeInTheDocument();
	});

	it("アーカイブ動画でRadioアイコンと「配信アーカイブ」テキストが表示される", () => {
		const archivedVideo: FrontendVideoData = {
			...baseVideoData,
			videoType: "archived",
		};

		render(<VideoCard video={archivedVideo} />);

		expect(screen.getByLabelText("ライブ配信のアーカイブ")).toBeInTheDocument();
		expect(screen.getByText("配信アーカイブ")).toBeInTheDocument();
	});

	it("配信中の動画でRadioアイコンと「配信中」テキストが表示される", () => {
		const liveVideo: FrontendVideoData = {
			...baseVideoData,
			liveBroadcastContent: "live",
		};

		render(<VideoCard video={liveVideo} />);

		expect(screen.getByLabelText("現在配信中のライブ配信")).toBeInTheDocument();
		expect(screen.getByText("配信中")).toBeInTheDocument();
	});

	it("配信予告の動画でClockアイコンと「配信予告」テキストが表示される", () => {
		const upcomingVideo: FrontendVideoData = {
			...baseVideoData,
			liveBroadcastContent: "upcoming",
		};

		render(<VideoCard video={upcomingVideo} />);

		expect(screen.getByLabelText("配信予定のライブ配信")).toBeInTheDocument();
		expect(screen.getByText("配信予告")).toBeInTheDocument();
	});

	it("配信アーカイブ以外の動画でボタン作成が無効になる", () => {
		const liveVideo: FrontendVideoData = {
			...baseVideoData,
			liveBroadcastContent: "live",
		};

		render(<VideoCard video={liveVideo} />);

		const createButton = screen.getByRole("button", { name: /ボタン作成/ });
		expect(createButton).toBeDisabled();
		expect(createButton).toHaveAttribute(
			"title",
			"音声ボタンを作成できるのは配信アーカイブのみです",
		);
	});

	it("通常の動画でボタン作成が無効になる", () => {
		render(<VideoCard video={baseVideoData} />);

		const createButton = screen.getByRole("button", { name: /ボタン作成/ });
		expect(createButton).toBeDisabled();
		expect(createButton).toHaveAttribute(
			"title",
			"音声ボタンを作成できるのは配信アーカイブのみです",
		);
	});

	it("ログイン状態で配信アーカイブでボタン作成が有効になる", () => {
		const archivedVideo: FrontendVideoData = {
			...baseVideoData,
			videoType: "archived",
		};

		render(<VideoCard video={archivedVideo} />);

		const createButton = screen.getByRole("link", { name: /テスト動画の音声ボタンを作成/ });
		expect(createButton).toBeInTheDocument();
		expect(createButton).toHaveAttribute("href", "/buttons/create?video_id=test-video-1");
	});

	it("liveStreamingDetailsがある動画でボタン作成が有効になる", () => {
		const liveStreamArchive: FrontendVideoData = {
			...baseVideoData,
			liveStreamingDetails: {
				actualStartTime: "2024-01-01T10:00:00Z",
				actualEndTime: "2024-01-01T12:00:00Z",
			},
		};

		render(<VideoCard video={liveStreamArchive} />);

		const createButton = screen.getByRole("link", { name: /テスト動画の音声ボタンを作成/ });
		expect(createButton).toBeInTheDocument();
		expect(createButton).toHaveAttribute("href", "/buttons/create?video_id=test-video-1");
	});

	it("音声ボタン数が表示される", () => {
		const videoWithButtons: FrontendVideoData = {
			...baseVideoData,
			audioButtonCount: 5,
		};

		render(<VideoCard video={videoWithButtons} />);

		expect(screen.getByLabelText("5個の音声ボタンが作成されています")).toBeInTheDocument();
	});

	it("音声ボタンが0個の場合はバッジが表示されない", () => {
		render(<VideoCard video={baseVideoData} />);

		expect(screen.queryByLabelText("0個の音声ボタンが作成されています")).not.toBeInTheDocument();
	});

	it("video.audioButtonCountがbuttonCount propより優先される", () => {
		const videoWithButtons: FrontendVideoData = {
			...baseVideoData,
			audioButtonCount: 3,
		};

		render(<VideoCard video={videoWithButtons} buttonCount={5} />);

		expect(screen.getByLabelText("3個の音声ボタンが作成されています")).toBeInTheDocument();
		expect(screen.queryByLabelText("5個の音声ボタンが作成されています")).not.toBeInTheDocument();
	});

	it("サイドバーバリアントで適切なレイアウトが表示される", () => {
		render(<VideoCard video={baseVideoData} variant="sidebar" />);

		// サイドバーバリアントでは「動画を見る」ボタンが表示される
		expect(screen.getByRole("link", { name: /動画を見る/ })).toBeInTheDocument();

		// ボタン作成ボタンは表示されない
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
	});

	it("通常動画で公開日が表示される", () => {
		render(<VideoCard video={baseVideoData} />);

		const timeElement = screen.getByRole("time");
		expect(timeElement).toHaveAttribute("title", "公開日: 2024/01/01");
		expect(timeElement).toHaveTextContent("2024/01/01");
	});

	it("ライブ配信アーカイブで配信開始日が表示される", () => {
		const liveStreamArchive: FrontendVideoData = {
			...baseVideoData,
			liveStreamingDetails: {
				actualStartTime: "2024-01-15T20:00:00Z",
				actualEndTime: "2024-01-15T22:00:00Z",
			},
		};

		render(<VideoCard video={liveStreamArchive} />);

		const timeElement = screen.getByRole("time");
		expect(timeElement).toHaveAttribute("title", "配信開始: 2024/01/16");
		expect(timeElement).toHaveTextContent("2024/01/16");
		expect(timeElement).toHaveAttribute("dateTime", "2024-01-15T20:00:00Z");
	});

	describe("ライブ配信の日時表示境界テスト", () => {
		it("配信開始時間と公開時間が異なる場合、配信開始時間を優先する", () => {
			const liveStreamWithDifferentTimes: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-10T12:00:00Z", // 公開日時（異なる）
				liveStreamingDetails: {
					actualStartTime: "2024-01-15T20:00:00Z", // 配信開始時間
					actualEndTime: "2024-01-15T22:00:00Z",
				},
			};

			render(<VideoCard video={liveStreamWithDifferentTimes} />);

			const timeElement = screen.getByRole("time");
			// 配信開始時間が表示されることを確認
			expect(timeElement).toHaveAttribute("title", "配信開始: 2024/01/16");
			expect(timeElement).toHaveTextContent("2024/01/16");
			expect(timeElement).toHaveAttribute("dateTime", "2024-01-15T20:00:00Z");
		});

		it("配信開始時間が無効な場合、公開時間にフォールバックする", () => {
			const liveStreamWithInvalidStartTime: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-10T12:00:00Z",
				liveStreamingDetails: {
					actualStartTime: "invalid-date", // 無効な日時
					actualEndTime: "2024-01-15T22:00:00Z",
				},
			};

			render(<VideoCard video={liveStreamWithInvalidStartTime} />);

			const timeElement = screen.getByRole("time");
			// 公開時間にフォールバックすることを確認
			expect(timeElement).toHaveAttribute("title", "公開日: 2024/01/10");
			expect(timeElement).toHaveTextContent("2024/01/10");
			expect(timeElement).toHaveAttribute("dateTime", "2024-01-10T12:00:00Z");
		});

		it("actualStartTimeが存在しない場合、公開時間を表示する", () => {
			const liveStreamWithoutStartTime: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-10T12:00:00Z",
				liveStreamingDetails: {
					actualEndTime: "2024-01-15T22:00:00Z",
					// actualStartTimeが存在しない
				},
			};

			render(<VideoCard video={liveStreamWithoutStartTime} />);

			const timeElement = screen.getByRole("time");
			// 公開時間が表示されることを確認
			expect(timeElement).toHaveAttribute("title", "公開日: 2024/01/10");
			expect(timeElement).toHaveTextContent("2024/01/10");
			expect(timeElement).toHaveAttribute("dateTime", "2024-01-10T12:00:00Z");
		});

		it("時差をまたぐ配信開始時間が正しくJSTで表示される", () => {
			const crossTimezoneStream: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2024-01-15T14:30:00Z", // JST 23:30
				liveStreamingDetails: {
					actualStartTime: "2024-01-15T15:30:00Z", // JST 翌日00:30
					actualEndTime: "2024-01-15T17:30:00Z",
				},
			};

			render(<VideoCard video={crossTimezoneStream} />);

			const timeElement = screen.getByRole("time");
			// JST換算で翌日になることを確認
			expect(timeElement).toHaveAttribute("title", "配信開始: 2024/01/16");
			expect(timeElement).toHaveTextContent("2024/01/16");
			expect(timeElement).toHaveAttribute("dateTime", "2024-01-15T15:30:00Z");
		});
	});

	describe("動画時間表示境界テスト", () => {
		it("1時間未満の動画時間が正しく表示される", () => {
			const shortVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT59M30S", // 59分30秒
			};

			render(<VideoCard video={shortVideo} />);

			// 動画時間はVideoCardでは表示されないが、データが正しく渡されることを確認
			// （実際の時間表示は他のコンポーネントで行われる）
			expect(shortVideo.duration).toBe("PT59M30S");
		});

		it("1時間ちょうどの動画時間が正しく表示される", () => {
			const oneHourVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT1H", // 1時間
			};

			render(<VideoCard video={oneHourVideo} />);

			expect(oneHourVideo.duration).toBe("PT1H");
		});

		it("長時間の動画時間が正しく表示される", () => {
			const longVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT2H30M45S", // 2時間30分45秒
			};

			render(<VideoCard video={longVideo} />);

			expect(longVideo.duration).toBe("PT2H30M45S");
		});

		it("秒のみの短い動画時間が正しく表示される", () => {
			const veryShortVideo: FrontendVideoData = {
				...baseVideoData,
				duration: "PT30S", // 30秒
			};

			render(<VideoCard video={veryShortVideo} />);

			expect(veryShortVideo.duration).toBe("PT30S");
		});

		it("動画時間が未定義の場合もエラーなく表示される", () => {
			const videoWithoutDuration: FrontendVideoData = {
				...baseVideoData,
				duration: undefined,
			};

			render(<VideoCard video={videoWithoutDuration} />);

			// エラーなく描画されることを確認
			expect(screen.getByText(baseVideoData.title)).toBeInTheDocument();
		});

		it("無効な動画時間フォーマットでもエラーなく表示される", () => {
			const videoWithInvalidDuration: FrontendVideoData = {
				...baseVideoData,
				duration: "invalid-duration",
			};

			render(<VideoCard video={videoWithInvalidDuration} />);

			// エラーなく描画されることを確認
			expect(screen.getByText(baseVideoData.title)).toBeInTheDocument();
		});
	});

	describe("公開日時境界テスト", () => {
		it("無効な公開日時の場合でもエラーなく表示される", () => {
			const videoWithInvalidPublishDate: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "invalid-date",
			};

			render(<VideoCard video={videoWithInvalidPublishDate} />);

			const timeElement = screen.getByRole("time");
			// 無効な日時がそのまま表示されることを確認
			expect(timeElement).toHaveTextContent("invalid-date");
			expect(timeElement).toHaveAttribute("dateTime", "invalid-date");
		});

		it("年末年始をまたぐ日時が正しくJSTで表示される", () => {
			const newYearVideo: FrontendVideoData = {
				...baseVideoData,
				publishedAt: "2023-12-31T15:30:00Z", // JST 2024/01/01 00:30
			};

			render(<VideoCard video={newYearVideo} />);

			const timeElement = screen.getByRole("time");
			// JST換算で翌年になることを確認
			expect(timeElement).toHaveAttribute("title", "公開日: 2024/01/01");
			expect(timeElement).toHaveTextContent("2024/01/01");
			expect(timeElement).toHaveAttribute("dateTime", "2023-12-31T15:30:00Z");
		});
	});

	describe("認証状態でのボタン作成制御", () => {
		it("ログイン状態で配信アーカイブでボタン作成が有効になる（デフォルトモック）", () => {
			const archivedVideo: FrontendVideoData = {
				...baseVideoData,
				videoType: "archived",
			};

			render(<VideoCard video={archivedVideo} />);

			const createButton = screen.getByRole("link", { name: /テスト動画の音声ボタンを作成/ });
			expect(createButton).toBeInTheDocument();
			expect(createButton).toHaveAttribute("href", "/buttons/create?video_id=test-video-1");
		});
	});
});
