import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { TagList } from "./tag-list";

const meta: Meta<typeof TagList> = {
	title: "Custom/Utility/TagList",
	component: TagList,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"統一されたタグ表示コンポーネント。音声ボタン、動画詳細、作品詳細など様々な箇所でタグを表示するために使用されます。",
			},
		},
	},
	argTypes: {
		tags: {
			control: "object",
			description: "表示するタグの配列",
		},
		variant: {
			control: "select",
			options: ["default", "destructive", "outline", "secondary"],
			description: "Badgeのバリアント",
		},
		showIcon: {
			control: "boolean",
			description: "タグアイコンを表示するかどうか",
		},
		maxTags: {
			control: "number",
			description: "表示する最大タグ数（0の場合は制限なし）",
		},
		searchQuery: {
			control: "text",
			description: "検索クエリ（ハイライト機能用）",
		},
		size: {
			control: "select",
			options: ["sm", "default", "lg"],
			description: "タグの表示サイズ",
		},
		className: {
			control: "text",
			description: "コンテナのクラス名",
		},
		tagClassName: {
			control: "text",
			description: "個別タグのクラス名",
		},
		onTagClick: {
			description: "タグクリック時のコールバック",
		},
	},
	args: {
		onTagClick: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		tags: ["React", "TypeScript", "Storybook"],
		variant: "outline",
		showIcon: true,
		size: "default",
	},
};

export const AudioButtonTags: Story = {
	args: {
		tags: ["ASMR", "ボイスドラマ", "涼花みなせ", "耳かき", "癒し"],
		variant: "outline",
		showIcon: true,
		size: "default",
	},
};

export const VideoTags: Story = {
	args: {
		tags: ["配信", "雑談", "ASMR", "歌枠", "ゲーム実況"],
		variant: "secondary",
		showIcon: true,
		size: "default",
	},
};

export const WorkTags: Story = {
	args: {
		tags: ["ボイス・ASMR", "バイノーラル", "KU100", "シチュエーション", "ロールプレイ"],
		variant: "outline",
		showIcon: true,
		size: "default",
	},
};

export const SmallSize: Story = {
	args: {
		tags: ["小さなタグ", "サイズ", "テスト"],
		variant: "outline",
		showIcon: true,
		size: "sm",
	},
};

export const LargeSize: Story = {
	args: {
		tags: ["大きなタグ", "サイズ", "テスト"],
		variant: "outline",
		showIcon: true,
		size: "lg",
	},
};

export const NoIcon: Story = {
	args: {
		tags: ["アイコンなし", "シンプル", "テキストのみ"],
		variant: "outline",
		showIcon: false,
		size: "default",
	},
};

export const MaxTagsLimit: Story = {
	args: {
		tags: ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5", "タグ6", "タグ7", "タグ8"],
		variant: "outline",
		showIcon: true,
		maxTags: 5,
		size: "default",
	},
};

export const WithHighlight: Story = {
	args: {
		tags: ["ASMR音声", "ボイスドラマ", "音楽配信", "歌声"],
		variant: "outline",
		showIcon: true,
		searchQuery: "音",
		size: "default",
	},
};

export const Clickable: Story = {
	args: {
		tags: ["クリック可能", "インタラクティブ", "フィルタリング"],
		variant: "outline",
		showIcon: true,
		size: "default",
		onTagClick: fn((tag) => alert(`Clicked: ${tag}`)),
	},
};

export const SecondaryVariant: Story = {
	args: {
		tags: ["セカンダリ", "バリアント", "背景色付き"],
		variant: "secondary",
		showIcon: true,
		size: "default",
	},
};

export const DestructiveVariant: Story = {
	args: {
		tags: ["警告", "削除", "注意"],
		variant: "destructive",
		showIcon: true,
		size: "default",
	},
};

export const ManyTags: Story = {
	args: {
		tags: [
			"多数のタグ",
			"レスポンシブ",
			"フレックスラップ",
			"自動折り返し",
			"UI/UX",
			"デザイン",
			"レイアウト",
			"表示テスト",
			"音声ボタン",
			"動画",
			"作品",
			"検索",
			"フィルター",
		],
		variant: "outline",
		showIcon: true,
		size: "default",
	},
};

export const EmptyTags: Story = {
	args: {
		tags: [],
		variant: "outline",
		showIcon: true,
		size: "default",
	},
};

export const CustomStyling: Story = {
	args: {
		tags: ["カスタム", "スタイリング", "テスト"],
		variant: "outline",
		showIcon: true,
		size: "default",
		className: "bg-slate-50 p-4 rounded-lg border",
		tagClassName: "border-dashed border-2",
	},
};
