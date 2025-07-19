import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { VirtualizedAudioButtonList } from "./virtualized-audio-button-list";

const meta: Meta<typeof VirtualizedAudioButtonList> = {
	title: "Custom/Audio/VirtualizedAudioButtonList",
	component: VirtualizedAudioButtonList,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"仮想化音声ボタンリスト。react-windowによる仮想化により大量データ（200+件）に対応し、パフォーマンスを最適化したリストコンポーネントです。",
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
		autoPlayNext: {
			control: "boolean",
			description: "自動次再生（プレイリスト用）",
		},
		showDetailLink: {
			control: "boolean",
			description: "詳細リンク表示",
		},
		isAuthenticated: {
			control: "boolean",
			description: "認証状態",
		},
		overscanCount: {
			control: "number",
			description: "オーバースキャン数（パフォーマンス調整用）",
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
		id: `virtual-audio-${index + 1}`,
		title: `仮想化音声ボタン ${index + 1}`,
		description: `これは${index + 1}番目の仮想化音声ボタンです。大量データ表示のテスト用です。`,
		tags: [
			"仮想化",
			"パフォーマンス",
			`セクション${Math.floor(index / 10) + 1}`,
			...(index % 4 === 0 ? ["人気"] : []),
			...(index % 8 === 0 ? ["おすすめ"] : []),
		],
		sourceVideoId: `virtual-video-${index + 1}`,
		sourceVideoTitle: `涼花みなせ 仮想化テスト ${index + 1}`,
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/virtual-video-${index + 1}/maxresdefault.jpg`,
		startTime: Math.floor(Math.random() * 300) + 10,
		endTime: Math.floor(Math.random() * 300) + 50,
		createdBy: `vuser-${Math.floor(index / 15) + 1}`,
		createdByName: `仮想ユーザー${Math.floor(index / 15) + 1}`,
		isPublic: true,
		playCount: Math.floor(Math.random() * 2000),
		likeCount: Math.floor(Math.random() * 200),
		dislikeCount: 0,
		favoriteCount: Math.floor(Math.random() * 100),
		createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
		durationText: `${Math.floor(Math.random() * 120) + 1}秒`,
		relativeTimeText: `${Math.floor(Math.random() * 60) + 1}日前`,
	}));
};

const smallMockData = generateMockAudioButtons(25);
const mediumMockData = generateMockAudioButtons(100);
const largeMockData = generateMockAudioButtons(250);

export const Default: Story = {
	args: {
		audioButtons: smallMockData,
		height: 600,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const SmallDataset: Story = {
	args: {
		audioButtons: smallMockData.slice(0, 10),
		height: 400,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 3,
	},
};

export const MediumDataset: Story = {
	args: {
		audioButtons: mediumMockData,
		height: 700,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 8,
	},
};

export const LargeDataset: Story = {
	args: {
		audioButtons: largeMockData,
		height: 800,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 10,
	},
};

export const WithSearch: Story = {
	args: {
		audioButtons: mediumMockData,
		height: 600,
		searchQuery: "仮想化",
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const EmptyState: Story = {
	args: {
		audioButtons: [],
		height: 400,
		emptyMessage: "仮想化音声ボタンが見つかりませんでした",
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const UnauthenticatedUser: Story = {
	args: {
		audioButtons: smallMockData,
		height: 600,
		showDetailLink: true,
		isAuthenticated: false,
		overscanCount: 5,
	},
};

export const WithFavorites: Story = {
	args: {
		audioButtons: smallMockData,
		height: 600,
		favoriteStates: new Map([
			["virtual-audio-2", true],
			["virtual-audio-5", true],
			["virtual-audio-12", true],
			["virtual-audio-18", true],
		]),
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const CurrentlyPlaying: Story = {
	args: {
		audioButtons: smallMockData,
		height: 600,
		currentPlayingId: "virtual-audio-8",
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const PlaylistMode: Story = {
	args: {
		audioButtons: mediumMockData,
		height: 650,
		autoPlayNext: true,
		currentPlayingId: "virtual-audio-15",
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 7,
	},
};

export const CompactHeight: Story = {
	args: {
		audioButtons: smallMockData,
		height: 300,
		itemSize: 120,
		showDetailLink: false,
		isAuthenticated: true,
		overscanCount: 3,
	},
};

export const LargeItemHeight: Story = {
	args: {
		audioButtons: smallMockData,
		height: 700,
		itemSize: 200,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 4,
	},
};

export const HighPerformance: Story = {
	args: {
		audioButtons: largeMockData,
		height: 800,
		itemSize: 140,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 15,
	},
	parameters: {
		docs: {
			description: {
				story:
					"250件の大量データでの高パフォーマンステスト。オーバースキャン数を多めに設定してスムーズなスクロールを実現。",
			},
		},
	},
};

export const LowPerformance: Story = {
	args: {
		audioButtons: largeMockData,
		height: 600,
		itemSize: 160,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 2,
	},
	parameters: {
		docs: {
			description: {
				story: "低性能デバイス向け設定。オーバースキャン数を最小限に抑えてメモリ使用量を削減。",
			},
		},
	},
};

export const DetailLinksDisabled: Story = {
	args: {
		audioButtons: smallMockData,
		height: 600,
		showDetailLink: false,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const CustomStyling: Story = {
	args: {
		audioButtons: smallMockData.slice(0, 15),
		height: 500,
		className: "border-2 border-dashed border-secondary rounded-lg bg-muted/20",
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 5,
	},
};

export const ScrollableContent: Story = {
	args: {
		audioButtons: mediumMockData,
		height: 400,
		itemSize: 150,
		showDetailLink: true,
		isAuthenticated: true,
		overscanCount: 6,
	},
	parameters: {
		docs: {
			description: {
				story: "スクロール可能なコンテンツのテスト。リストが指定された高さを超える場合の表示確認。",
			},
		},
	},
};
