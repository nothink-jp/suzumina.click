import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { expect, fn, screen, userEvent, within } from "storybook/test";
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

const mockAudioButton: AudioButtonType = {
	id: "1",
	buttonText: "おはよう！",
	description: "朝の挨拶音声",
	tags: ["挨拶", "朝"],
	videoId: "dQw4w9WgXcQ",
	videoTitle: "涼花みなせ 朝配信 2024/06/26",
	videoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 120,
	endTime: 123,
	duration: 3,
	creatorId: "user123",
	creatorName: "テストユーザー",
	isPublic: true,
	stats: {
		playCount: 1234,
		likeCount: 567,
		dislikeCount: 0,
		favoriteCount: 0,
		engagementRate: 0.46,
	},
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	_computed: {
		isPopular: true,
		engagementRate: 0.46,
		engagementRatePercentage: 46,
		popularityScore: 1801,
		searchableText: "おはよう！ 朝の挨拶音声 挨拶 朝",
		durationText: "3秒",
		relativeTimeText: "1日前",
	},
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
			buttonText: "おはよう！今日もがんばって",
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
			buttonText: "これはとても長いタイトルのボタンです。レイアウトがどうなるか確認しています。",
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
		isAuthenticated: true,
	},
};

// お気に入りピルは詳細 popover(ActionPillRow)内にあるため、まず「詳細を表示」を開いてから取得する。
// radix popover は portal 描画なので within(canvasElement) では拾えず、screen(document.body) で探す。
export const FavoriteToggleInteraction: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		isFavorite: false,
		onFavoriteToggle: fn(),
		onLikeToggle: fn(),
		isAuthenticated: true,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "詳細を表示" }));
		const favoriteBtn = await screen.findByRole("button", { name: "お気に入り" });
		await userEvent.click(favoriteBtn);
		await expect(args.onFavoriteToggle).toHaveBeenCalledOnce();
	},
};

// 同上。未認証時は disabled にせず注記行を表示し、クリックは呼び出し元（ログイン誘導のtoast等）に委ねる。
export const UnauthenticatedShowsLoginNote: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		isFavorite: false,
		onFavoriteToggle: fn(),
		onLikeToggle: fn(),
		isAuthenticated: false,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "詳細を表示" }));
		await expect(
			await screen.findByText("お気に入り・評価にはログインが必要です"),
		).toBeInTheDocument();
		const favoriteBtn = await screen.findByRole("button", { name: "お気に入り" });
		await expect(favoriteBtn).not.toBeDisabled();
		await userEvent.click(favoriteBtn);
		await expect(args.onFavoriteToggle).toHaveBeenCalledOnce();
	},
};
