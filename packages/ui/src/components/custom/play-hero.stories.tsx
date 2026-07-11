import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AudioButton } from "@suzumina.click/shared-types";
import { PlayHero } from "./play-hero";

const sampleAudioButton: AudioButton = {
	id: "story-play-hero",
	buttonText: "よわよわ〜",
	tags: ["龍が如く極"],
	videoId: "dQw4w9WgXcQ",
	videoTitle: "サンプル動画",
	startTime: 10,
	endTime: 13.4,
	duration: 3.4,
	creatorId: "creator-1",
	creatorName: "がこんがこん",
	isPublic: true,
	stats: { playCount: 7, likeCount: 2, dislikeCount: 0, favoriteCount: 1, engagementRate: 0.3 },
	createdAt: "2026-06-26T00:00:00.000Z",
	updatedAt: "2026-06-26T00:00:00.000Z",
	_computed: {
		isPopular: false,
		engagementRate: 0.3,
		engagementRatePercentage: 30,
		popularityScore: 10,
		searchableText: "よわよわ〜",
		durationText: "3.4秒",
		relativeTimeText: "1日前",
	},
} as AudioButton;

const meta: Meta<typeof PlayHero> = {
	title: "Custom/Audio/PlayHero",
	component: PlayHero,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"再生ヒーロー（ボタン画面刷新の中核部品）。「押すことが主役」の大型再生ボタンで、YouTube pool 再生まで内包する。L=詳細ページ用（再生中パルスリング付き）/ M=モーダル用。",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: { type: "radio" },
			options: ["L", "M"],
			description: "L=詳細ページ用 / M=モーダル用",
		},
	},
};

export default meta;
type Story = StoryObj<typeof PlayHero>;

export const SizeL: Story = {
	args: { audioButton: sampleAudioButton, size: "L" },
};

export const SizeM: Story = {
	args: { audioButton: sampleAudioButton, size: "M" },
};

export const LongText: Story = {
	args: {
		audioButton: {
			...sampleAudioButton,
			buttonText: "なんで誕生日にこんな思いせなあかんねん",
		} as AudioButton,
		size: "L",
	},
};
