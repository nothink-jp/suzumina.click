import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { ProgressiveAudioButtonList } from "./progressive-audio-button-list";

const meta: Meta<typeof ProgressiveAudioButtonList> = {
	title: "Custom/Audio/ProgressiveAudioButtonList",
	component: ProgressiveAudioButtonList,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"プログレッシブローディング機能付き音声ボタンリスト。スケルトン→プレビュー→完全版の段階的ローディングと仮想化を組み合わせた最適化パフォーマンスを提供します。",
			},
		},
	},
	argTypes: {
		audioButtons: {
			control: "object",
			description: "表示する音声ボタンデータ",
		},
		height: {
			control: "number",
			description: "リストの高さ",
		},
		itemSize: {
			control: "number",
			description: "アイテムの高さ",
		},
		searchQuery: {
			control: "text",
			description: "検索クエリ（ハイライト用）",
		},
		showDetailLink: {
			control: "boolean",
			description: "詳細リンク表示",
		},
		isAuthenticated: {
			control: "boolean",
			description: "認証状態",
		},
		isLoading: {
			control: "boolean",
			description: "初期ローディング状態",
		},
		previewBufferSize: {
			control: "number",
			description: "プレビュー表示範囲",
		},
		autoUpgrade: {
			control: "boolean",
			description: "自動アップグレード有効化",
		},
		emptyMessage: {
			control: "text",
			description: "空状態メッセージ",
		},
		className: {
			control: "text",
			description: "追加CSSクラス",
		},
		onPlay: {
			description: "再生イベントハンドラー",
		},
		onFavoriteToggle: {
			description: "お気に入り切り替えハンドラー",
		},
		onItemClick: {
			description: "アイテムクリックハンドラー",
		},
	},
	args: {
		onPlay: fn(),
		onFavoriteToggle: fn(),
		onItemClick: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// モックデータ生成ヘルパー
const generateMockAudioButtons = (count: number): FrontendAudioButtonData[] => {
	return Array.from({ length: count }, (_, index) => ({
		id: `audio-${index + 1}`,
		title: `音声ボタン ${index + 1}`,
		description: `これは${index + 1}番目の音声ボタンです。プログレッシブローディングのテスト用データです。`,
		tags: [
			"ASMR",
			"ボイスドラマ",
			`カテゴリ${Math.floor(index / 5) + 1}`,
			...(index % 3 === 0 ? ["人気"] : []),
			...(index % 7 === 0 ? ["新着"] : []),
		],
		sourceVideoId: `video-${index + 1}`,
		sourceVideoTitle: `涼花みなせ 配信 ${index + 1}`,
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/video-${index + 1}/maxresdefault.jpg`,
		startTime: Math.floor(Math.random() * 300) + 10,
		endTime: Math.floor(Math.random() * 300) + 50,
		createdBy: `user-${Math.floor(index / 10) + 1}`,
		createdByName: `ユーザー${Math.floor(index / 10) + 1}`,
		isPublic: true,
		playCount: Math.floor(Math.random() * 1000),
		likeCount: Math.floor(Math.random() * 100),
		dislikeCount: 0,
		favoriteCount: Math.floor(Math.random() * 50),
		createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
		durationText: `${Math.floor(Math.random() * 60) + 1}秒`,
		relativeTimeText: `${Math.floor(Math.random() * 30) + 1}日前`,
	}));
};

const mockAudioButtons = generateMockAudioButtons(20);
const largeMockAudioButtons = generateMockAudioButtons(96);

export const Default: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const SmallDataset: Story = {
	args: {
		audioButtons: mockAudioButtons.slice(0, 5),
		height: 400,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 5,
		autoUpgrade: false,
	},
};

export const LargeDataset: Story = {
	args: {
		audioButtons: largeMockAudioButtons,
		height: 800,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 15,
		autoUpgrade: false,
	},
};

export const WithSearch: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		searchQuery: "音声",
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const LoadingState: Story = {
	args: {
		audioButtons: [],
		height: 600,
		isLoading: true,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const EmptyState: Story = {
	args: {
		audioButtons: [],
		height: 400,
		emptyMessage: "音声ボタンが見つかりませんでした",
		showDetailLink: true,
		isAuthenticated: true,
		isLoading: false,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const UnauthenticatedUser: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		showDetailLink: true,
		isAuthenticated: false,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const WithFavorites: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		favoriteStates: new Map([
			["audio-1", true],
			["audio-3", true],
			["audio-7", true],
		]),
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const CurrentlyPlaying: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		currentPlayingId: "audio-5",
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const CompactHeight: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 300,
		itemSize: 120,
		showDetailLink: false,
		isAuthenticated: true,
		previewBufferSize: 8,
		autoUpgrade: false,
	},
};

export const LargeItemHeight: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		itemSize: 200,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: false,
	},
};

export const AutoUpgradeEnabled: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 5,
		autoUpgrade: true,
	},
};

export const LargePreviewBuffer: Story = {
	args: {
		audioButtons: largeMockAudioButtons,
		height: 800,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 25,
		autoUpgrade: false,
	},
};

export const MinimalPreviewBuffer: Story = {
	args: {
		audioButtons: mockAudioButtons,
		height: 600,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 3,
		autoUpgrade: false,
	},
};

export const CustomStyling: Story = {
	args: {
		audioButtons: mockAudioButtons.slice(0, 10),
		height: 500,
		className: "border-2 border-dashed border-primary rounded-lg",
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 8,
		autoUpgrade: false,
	},
};

export const PerformanceTest: Story = {
	args: {
		audioButtons: largeMockAudioButtons,
		height: 800,
		showDetailLink: true,
		isAuthenticated: true,
		previewBufferSize: 10,
		autoUpgrade: true,
		overscanCount: 5,
	},
	parameters: {
		docs: {
			description: {
				story:
					"96件の大量データでのパフォーマンステスト。プログレッシブローディングと自動アップグレードが有効です。",
			},
		},
	},
};
