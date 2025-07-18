import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioButton } from "./audio-button";

const meta = {
	title: "Custom/Audio/AudioButton",
	component: AudioButton,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AudioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockAudioButton: FrontendAudioButtonData = {
	id: "1",
	title: "おはよう！",
	description: "朝の挨拶音声",
	tags: ["挨拶", "朝"],
	sourceVideoId: "dQw4w9WgXcQ",
	sourceVideoTitle: "涼花みなせ 朝配信 2024/06/26",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 120,
	endTime: 123,
	createdBy: "user123",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 1234,
	likeCount: 567,
	dislikeCount: 0,
	favoriteCount: 0,
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	durationText: "3秒",
	relativeTimeText: "1日前",
};

export const Default: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
	},
};

export const WithFavorite: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		isFavorite: true,
		onFavoriteToggle: fn(),
		isAuthenticated: true,
	},
};

export const WithDetailLink: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		showDetailLink: true,
		onDetailClick: fn(),
		isAuthenticated: true,
	},
};

export const WithSearchHighlight: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "おはよう！今日もがんばって",
			description: "朝の挨拶音声です。がんばって",
			tags: ["挨拶", "朝", "がんばって"],
		},
		onPlay: fn(),
		searchQuery: "がんばって",
		isAuthenticated: true,
	},
};

export const LongTitle: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "これはとても長いタイトルのボタンです。レイアウトがどうなるか確認しています。",
		},
		onPlay: fn(),
		isAuthenticated: true,
	},
};

export const NotAuthenticated: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		isFavorite: false,
		onFavoriteToggle: fn(),
		isLiked: false,
		onLikeToggle: fn(),
		isDisliked: false,
		onDislikeToggle: fn(),
		isAuthenticated: false,
	},
};

export const AuthenticatedWithLikes: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		isFavorite: true,
		onFavoriteToggle: fn(),
		isLiked: true,
		onLikeToggle: fn(),
		isDisliked: false,
		onDislikeToggle: fn(),
		isAuthenticated: true,
	},
};
