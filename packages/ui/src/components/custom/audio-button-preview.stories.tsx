import type { Meta, StoryObj } from "@storybook/react";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { fn } from "storybook/test";
import { AudioButtonPreview } from "./audio-button-preview";

const meta = {
	title: "Custom/Audio/AudioButtonPreview",
	component: AudioButtonPreview,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AudioButtonPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockAudioButton: FrontendAudioButtonData = {
	id: "1",
	title: "おはよう！",
	description: "朝の挨拶音声",
	tags: ["挨拶", "朝", "ポジティブ"],
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
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
	},
};

export const Favorited: Story = {
	args: {
		audioButton: mockAudioButton,
		initialIsFavorited: true,
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
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
		searchQuery: "がんばって",
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
	},
};

export const LongTitle: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "これはとても長いタイトルの音声ボタンです。レイアウトがどうなるか確認しています。",
			description:
				"長い説明文です。この説明文もとても長くて、2行以上になることを想定しています。省略機能が正しく動作するかをテストするための文章です。",
		},
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
	},
};

export const ManyTags: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			tags: ["挨拶", "朝", "ポジティブ", "元気", "かわいい", "応援", "日常"],
		},
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
	},
};

export const NoDescription: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			description: "",
		},
		onFavoriteToggle: fn(),
		onUpgrade: fn(),
	},
};

export const PreviewGrid: Story = {
	render: () => (
		<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
			<AudioButtonPreview audioButton={mockAudioButton} onFavoriteToggle={fn()} onUpgrade={fn()} />
			<AudioButtonPreview
				audioButton={{
					...mockAudioButton,
					id: "2",
					title: "ありがとう",
					tags: ["感謝", "お礼"],
				}}
				initialIsFavorited={true}
				onFavoriteToggle={fn()}
				onUpgrade={fn()}
			/>
			<AudioButtonPreview
				audioButton={{
					...mockAudioButton,
					id: "3",
					title: "がんばって！",
					description: "応援音声です",
					tags: ["応援", "励まし", "元気"],
				}}
				onFavoriteToggle={fn()}
				onUpgrade={fn()}
			/>
		</div>
	),
};
