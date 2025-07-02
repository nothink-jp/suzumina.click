import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import VideoCard from "./VideoCard";

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

	it("配信アーカイブでボタン作成が有効になる", () => {
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
});
