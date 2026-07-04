import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUseSession } from "@/test-utils/auth";
import VideoDetail from "../video-detail";

// 認証抽象のモック（既定はログイン済み。未ログインは各テストで mockUseSession(null)）
vi.mock("@/lib/auth/client");

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
	const firestoreData: any = {
		id: "test-video",
		videoId: "abc123",
		title: "テスト動画",
		description: "テスト動画の説明文",
		publishedAt: "2024-01-01T00:00:00Z",
		thumbnailUrl: "https://example.com/thumbnail.jpg",
		lastFetchedAt: "2024-01-01T00:00:00Z",
		channelId: "test-channel-id",
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

	// overridesを適用（undefinedも許可）
	if (overrides) {
		// _computed は全置換せずマージ（既定フィールドを保持し暗黙のフォールバック依存を避ける）
		if (overrides._computed !== undefined) {
			firestoreData._computed = { ...firestoreData._computed, ...overrides._computed };
		}
		Object.keys(overrides).forEach((key) => {
			if (key === "_computed") {
				return; // 上でマージ済み
			}
			if (key === "statistics" && overrides[key] !== undefined) {
				// statisticsが明示的に提供された場合はそれを使用
				firestoreData[key] = overrides[key];
			} else if (["viewCount", "likeCount", "commentCount"].includes(key)) {
				// 個別の統計値が提供された場合
				if (!overrides.statistics) {
					firestoreData.statistics[key] = overrides[key];
				}
			} else {
				// その他のフィールドは直接上書き（undefinedも含む）
				firestoreData[key] = overrides[key];
			}
		});
	}

	// Plain Objectを直接返す
	return firestoreData as VideoPlainObject;
}

describe("VideoDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession({ discordId: "test-user", displayName: "Test User" });
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

	// SPR-186: 詳細ページのバッジ判定も card と同じ _computed.videoType を正本にする。
	describe("動画タイプバッジ（_computed.videoType が正本）", () => {
		it("videoType=live はライブ配信バッジを表示する", () => {
			render(<VideoDetail video={createMockVideo({ _computed: { videoType: "live" } })} />);
			expect(screen.getByLabelText("現在配信中のライブ配信")).toBeInTheDocument();
		});

		it("videoType=upcoming は配信予定バッジを表示する", () => {
			render(<VideoDetail video={createMockVideo({ _computed: { videoType: "upcoming" } })} />);
			expect(screen.getByLabelText("配信予定のライブ配信")).toBeInTheDocument();
		});

		it("videoType=archived は配信アーカイブバッジを表示する", () => {
			render(<VideoDetail video={createMockVideo({ _computed: { videoType: "archived" } })} />);
			expect(screen.getByLabelText("ライブ配信のアーカイブ")).toBeInTheDocument();
		});

		it("videoType=premiere はプレミア公開バッジを表示する", () => {
			render(<VideoDetail video={createMockVideo({ _computed: { videoType: "premiere" } })} />);
			expect(screen.getByLabelText("プレミア公開動画")).toBeInTheDocument();
		});

		it("liveStreamingDetails があっても _computed.videoType=normal なら通常動画（正本は _computed）", () => {
			render(
				<VideoDetail
					video={createMockVideo({
						_computed: { videoType: "normal" },
						liveStreamingDetails: {
							actualStartTime: "2024-01-01T12:00:00Z",
							actualEndTime: "2024-01-01T14:00:00Z",
						},
					})}
				/>,
			);
			expect(screen.getByLabelText("通常動画コンテンツ")).toBeInTheDocument();
		});

		it("通常動画は通常動画バッジを表示する", () => {
			render(<VideoDetail video={createMockVideo()} />);
			expect(screen.getByLabelText("通常動画コンテンツ")).toBeInTheDocument();
		});
	});

	describe("音声ボタン作成可否（getCanCreateButtonData）", () => {
		it("未ログインは作成ボタンが無効でログイン理由が title に出る", () => {
			mockUseSession(null);
			render(<VideoDetail video={createMockVideo()} />);

			const createButton = screen.getByText("ボタンを作成").closest("button");
			expect(createButton).toBeDisabled();
			expect(createButton).toHaveAttribute("title", expect.stringMatching(/ログインが必要/));
		});

		it("埋め込み制限（embeddable=false）は作成不可で理由が title に出る", () => {
			mockUseSession({ discordId: "1" });
			// embeddable=false は canCreateAudioButton より先に判定されるため _computed は不要
			render(<VideoDetail video={createMockVideo({ status: { embeddable: false } })} />);

			const createButton = screen.getByText("ボタンを作成").closest("button");
			expect(createButton).toBeDisabled();
			expect(createButton).toHaveAttribute("title", expect.stringMatching(/埋め込みが制限/));
		});

		it("作成可能な動画はボタンが Link になり、サイドバーに新規作成リンクが出る", () => {
			mockUseSession({ discordId: "1" });
			render(<VideoDetail video={createMockVideo({ _computed: { canCreateButton: true } })} />);

			const createLink = screen.getByText("ボタンを作成").closest("a");
			expect(createLink).toHaveAttribute("href", "/buttons/create?video_id=abc123");
			expect(screen.getByRole("link", { name: "新規作成" })).toHaveAttribute(
				"href",
				"/buttons/create?video_id=abc123",
			);
		});
	});

	describe("概要タブの説明・タグ", () => {
		it("説明文が無い場合は代替テキストを表示する", () => {
			render(<VideoDetail video={createMockVideo({ description: "" })} />);
			expect(screen.getByText("説明文はありません")).toBeInTheDocument();
		});

		it("タグがある場合は概要タブにタグバッジを表示する", () => {
			render(<VideoDetail video={createMockVideo({ tags: { userTags: ["独自タグ"] } })} />);
			expect(screen.getByText("独自タグ")).toBeInTheDocument();
		});
	});

	describe("詳細情報タブ", () => {
		const richVideo = () =>
			createMockVideo({
				categoryId: "10", // 音楽（対応カテゴリ）
				topicDetails: {
					topicCategories: [
						"https://en.wikipedia.org/wiki/Music",
						"Music",
						`https://example.com/${"a".repeat(70)}`, // 60字超 → 省略表示
					],
				},
				recordingDetails: {
					locationDescription: "東京スタジオ",
					recordingDate: "2024-01-01T00:00:00Z",
				},
				regionRestriction: { allowed: ["JP", "US"], blocked: ["CN"] },
				liveStreamingDetails: {
					scheduledStartTime: "2024-01-01T10:00:00Z",
					actualStartTime: "2024-01-01T12:00:00Z",
					actualEndTime: "2024-01-01T14:00:00Z",
					scheduledEndTime: "2024-01-01T13:00:00Z",
					concurrentViewers: 1500,
				},
			});

		it("対応カテゴリ・トピック・撮影・地域制限・ライブ配信詳細を表示する", async () => {
			render(<VideoDetail video={richVideo()} />);
			await userEvent.click(screen.getByRole("tab", { name: "詳細情報" }));

			// カテゴリ（対応カテゴリ名）
			expect(screen.getByText("音楽")).toBeInTheDocument();
			// トピック: URL はリンク、非 URL は span
			expect(screen.getByText("https://en.wikipedia.org/wiki/Music").closest("a")).toHaveAttribute(
				"href",
				"https://en.wikipedia.org/wiki/Music",
			);
			expect(screen.getByText("Music")).toBeInTheDocument();
			// 撮影詳細
			expect(screen.getByText("東京スタジオ")).toBeInTheDocument();
			// 地域制限
			expect(screen.getByText("JP, US")).toBeInTheDocument();
			expect(screen.getByText("CN")).toBeInTheDocument();
			// ライブ配信詳細
			expect(screen.getByText("予定開始時刻")).toBeInTheDocument();
			expect(screen.getByText("実際の開始時刻")).toBeInTheDocument();
			expect(screen.getByText("実際の終了時刻")).toBeInTheDocument();
			expect(screen.getByText("予定終了時刻")).toBeInTheDocument();
			expect(screen.getByText("最大同時視聴者数")).toBeInTheDocument();
			// 配信時間: 12:00Z〜14:00Z = 2時間0分
			expect(screen.getByText("2時間0分")).toBeInTheDocument();
		});

		it("未対応カテゴリは『(未対応カテゴリ)』を表示する", async () => {
			render(<VideoDetail video={createMockVideo({ categoryId: "99999" })} />);
			await userEvent.click(screen.getByRole("tab", { name: "詳細情報" }));
			expect(screen.getByText("(未対応カテゴリ)")).toBeInTheDocument();
		});
	});

	describe("技術仕様タブ", () => {
		it("HD・3D・字幕対応・ライセンス済み・公開・埋め込み許可などを表示する", async () => {
			const video = createMockVideo({
				definition: "hd",
				dimension: "3d",
				caption: true,
				licensedContent: true,
				status: {
					privacyStatus: "public",
					commentStatus: "enabled",
					embeddable: true,
					uploadStatus: "processed",
				},
				contentRating: { ytRating: "ytAgeRestricted" },
				player: { embedWidth: 1280, embedHeight: 720, embedHtml: "<iframe></iframe>" },
			});
			render(<VideoDetail video={video} />);
			await userEvent.click(screen.getByRole("tab", { name: "技術仕様" }));

			expect(screen.getByText("高解像度 (HD)")).toBeInTheDocument();
			expect(screen.getByText("3D")).toBeInTheDocument();
			expect(screen.getByText("対応")).toBeInTheDocument();
			expect(screen.getByText("ライセンス済み")).toBeInTheDocument();
			expect(screen.getByText("公開")).toBeInTheDocument();
			expect(screen.getByText("許可")).toBeInTheDocument();
			expect(screen.getByText("processed")).toBeInTheDocument();
			expect(screen.getByText("ytRating:")).toBeInTheDocument();
			expect(screen.getByText("1280px")).toBeInTheDocument();
			expect(screen.getByText("720px")).toBeInTheDocument();
		});

		it("SD・2D・字幕非対応・標準ライセンス・限定公開・埋め込み無効の分岐を表示する", async () => {
			const video = createMockVideo({
				definition: "sd",
				dimension: "2d",
				caption: false,
				licensedContent: false,
				status: { privacyStatus: "unlisted", commentStatus: "", embeddable: false },
			});
			render(<VideoDetail video={video} />);
			await userEvent.click(screen.getByRole("tab", { name: "技術仕様" }));

			expect(screen.getByText("標準解像度 (SD)")).toBeInTheDocument();
			expect(screen.getByText("2D")).toBeInTheDocument();
			expect(screen.getByText("非対応")).toBeInTheDocument();
			expect(screen.getByText("標準")).toBeInTheDocument();
			expect(screen.getByText("限定公開")).toBeInTheDocument();
			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("privacyStatus=private は『非公開』を表示する", async () => {
			render(<VideoDetail video={createMockVideo({ status: { privacyStatus: "private" } })} />);
			await userEvent.click(screen.getByRole("tab", { name: "技術仕様" }));
			expect(screen.getByText("非公開")).toBeInTheDocument();
		});
	});
});
