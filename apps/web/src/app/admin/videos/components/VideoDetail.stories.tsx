import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import VideoDetail from "./VideoDetail";

// 完全な動画データのモック
const mockVideoDataComplete: FrontendVideoData = {
	id: "dQw4w9WgXcQ",
	videoId: "dQw4w9WgXcQ",
	title: "【ASMR】優しい声でお話ししながら耳かき - 涼花みなせ",
	description: `皆さんお疲れ様です！今日も一日お疲れ様でした。

ゆっくりと耳かきをしながらお話しします。
リラックスしてお聞きください。

【今回のお話内容】
・今日あった出来事
・最近読んだ本について
・おすすめのお茶の話
・明日の予定

【耳かきタイムライン】
0:00 - 挨拶
2:30 - 右耳の耳かき開始
15:00 - 左耳の耳かき開始
27:30 - 綿棒でのお掃除
35:00 - おやすみの挨拶

※イヤホン・ヘッドホンでのご視聴を推奨します
※ASMRが苦手な方はご注意ください`,
	channelTitle: "涼花みなせ Ch.",
	publishedAt: "2024-01-15T19:00:00Z",
	thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
	channelId: "UCexample123456",
	lastFetchedAt: "2024-01-15T20:00:00Z",
	thumbnails: {
		default: {
			url: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
			width: 120,
			height: 90,
		},
		medium: {
			url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
			width: 320,
			height: 180,
		},
		high: {
			url: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
			width: 480,
			height: 360,
		},
	},
	videoType: "all",
	liveBroadcastContent: "none",
	publishedAtISO: "2024-01-15T19:00:00Z",
	lastFetchedAtISO: "2024-01-15T20:00:00Z",
};

// 最小限のデータ
const mockVideoDataMinimal: FrontendVideoData = {
	id: "abc123def456",
	videoId: "abc123def456",
	title: "【雑談】今日のできごと報告会",
	description: "",
	channelTitle: "涼花みなせ Ch.",
	publishedAt: "2024-01-20T12:00:00Z",
	thumbnailUrl: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
	channelId: "UCexample123456",
	lastFetchedAt: "2024-01-20T13:00:00Z",
	thumbnails: {
		default: {
			url: "https://img.youtube.com/vi/abc123def456/default.jpg",
			width: 120,
			height: 90,
		},
		medium: {
			url: "https://img.youtube.com/vi/abc123def456/mqdefault.jpg",
			width: 320,
			height: 180,
		},
		high: {
			url: "https://img.youtube.com/vi/abc123def456/hqdefault.jpg",
			width: 480,
			height: 360,
		},
	},
	videoType: "all",
	liveBroadcastContent: "none",
	publishedAtISO: "2024-01-20T12:00:00Z",
	lastFetchedAtISO: "2024-01-20T13:00:00Z",
};

// ライブ配信のデータ
const mockVideoDataLive: FrontendVideoData = {
	id: "live123stream",
	videoId: "live123stream",
	title: "【LIVE】朝の雑談配信 - みなさんおはようございます！",
	description: `朝の雑談配信です！
コーヒー片手にゆるゆるお話ししましょう。

【配信予定内容】
・昨日の振り返り
・今日の予定
・最近ハマっているもの
・皆さんからのコメント返し

気軽にコメントしてくださいね♪`,
	channelTitle: "涼花みなせ Ch.",
	publishedAt: "2024-01-22T08:00:00Z",
	thumbnailUrl: "https://img.youtube.com/vi/live123stream/mqdefault.jpg",
	channelId: "UCexample123456",
	lastFetchedAt: "2024-01-22T08:30:00Z",
	thumbnails: {
		default: {
			url: "https://img.youtube.com/vi/live123stream/default.jpg",
			width: 120,
			height: 90,
		},
		medium: {
			url: "https://img.youtube.com/vi/live123stream/mqdefault.jpg",
			width: 320,
			height: 180,
		},
		high: {
			url: "https://img.youtube.com/vi/live123stream/hqdefault.jpg",
			width: 480,
			height: 360,
		},
	},
	videoType: "all",
	liveBroadcastContent: "live",
	publishedAtISO: "2024-01-22T08:00:00Z",
	lastFetchedAtISO: "2024-01-22T08:30:00Z",
};

// アーカイブ動画
const mockVideoDataArchived: FrontendVideoData = {
	id: "archive789old",
	videoId: "archive789old",
	title: "【アーカイブ】過去の配信録画 - 懐かしい思い出話",
	description: "以前行った配信のアーカイブです。懐かしい思い出話をたくさんしました。",
	channelTitle: "涼花みなせ Ch.",
	publishedAt: "2023-12-01T20:00:00Z",
	thumbnailUrl: "https://img.youtube.com/vi/archive789old/mqdefault.jpg",
	channelId: "UCexample123456",
	lastFetchedAt: "2024-01-10T15:00:00Z",
	thumbnails: {
		default: {
			url: "https://img.youtube.com/vi/archive789old/default.jpg",
			width: 120,
			height: 90,
		},
		medium: {
			url: "https://img.youtube.com/vi/archive789old/mqdefault.jpg",
			width: 320,
			height: 180,
		},
		high: {
			url: "https://img.youtube.com/vi/archive789old/hqdefault.jpg",
			width: 480,
			height: 360,
		},
	},
	videoType: "archived",
	liveBroadcastContent: "none",
	publishedAtISO: "2023-12-01T20:00:00Z",
	lastFetchedAtISO: "2024-01-10T15:00:00Z",
};

const meta = {
	title: "Web/VideoDetail",
	component: VideoDetail,
	parameters: {
		layout: "fullscreen",
		nextjs: {
			appDirectory: true,
			navigation: {
				pathname: "/admin/videos/dQw4w9WgXcQ",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		video: {
			control: { type: "object" },
		},
	},
} satisfies Meta<typeof VideoDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

// ストーリーの定義
export const CompleteVideo: Story = {
	args: {
		video: mockVideoDataComplete,
	},
};

export const MinimalVideo: Story = {
	args: {
		video: mockVideoDataMinimal,
	},
};

export const LiveVideo: Story = {
	args: {
		video: mockVideoDataLive,
	},
};

export const ArchivedVideo: Story = {
	args: {
		video: mockVideoDataArchived,
	},
};

export const LongTitle: Story = {
	args: {
		video: {
			...mockVideoDataComplete,
			title:
				"【超長いタイトル】これは非常に長いタイトルのテストケースで、動画詳細ページでのタイトル表示がどのように処理されるかを確認するためのものです - 涼花みなせ Ch. 特別版",
		},
	},
};

export const NoThumbnails: Story = {
	args: {
		video: {
			...mockVideoDataMinimal,
			thumbnails: {
				default: {
					url: "https://img.youtube.com/vi/abc123def456/default.jpg",
					width: 120,
					height: 90,
				},
				medium: {
					url: "",
					width: 0,
					height: 0,
				},
				high: {
					url: "",
					width: 0,
					height: 0,
				},
			},
		},
	},
};
