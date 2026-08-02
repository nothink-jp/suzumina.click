import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { VideoTagDisplay } from "./three-layer-tag-display";

const meta: Meta<typeof VideoTagDisplay> = {
	title: "Custom/Utility/VideoTagDisplay",
	component: VideoTagDisplay,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"動画タグ表示コンポーネント。配信タイプ（自動分類）、みんなのタグ（ユーザー投稿）、ジャンル（YouTube分類）を統合表示します。",
			},
		},
	},
	argTypes: {
		playlistTags: {
			control: "object",
			description: "配信タイプタグ（自動分類）",
		},
		categoryId: {
			control: "text",
			description: "ジャンルID（YouTube分類）",
		},
		categoryName: {
			control: "text",
			description: "ジャンル表示名",
		},
		searchQuery: {
			control: "text",
			description: "検索クエリ（ハイライト機能用）",
		},
		size: {
			control: "select",
			options: ["sm", "default", "lg"],
			description: "表示サイズ",
		},
		maxTagsPerLayer: {
			control: "number",
			description: "各層の最大表示タグ数（0の場合は制限なし）",
		},
		showEmptyLayers: {
			control: "boolean",
			description: "空の層を表示するかどうか",
		},
		showCategory: {
			control: "boolean",
			description: "ジャンルを表示するかどうか",
		},
		compact: {
			control: "boolean",
			description: "一列表示モード（コンパクト表示）",
		},
		order: {
			control: "select",
			options: ["default", "detail"],
			description: "表示順序（default: playlist→user→category, detail: category→playlist→user）",
		},
		className: {
			control: "text",
			description: "コンテナのクラス名",
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
		playlistTags: ["配信", "雑談"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const ASMRStream: Story = {
	args: {
		playlistTags: ["ASMR", "バイノーラル"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const GameStream: Story = {
	args: {
		playlistTags: ["ゲーム実況", "アクション"],
		categoryId: "20",
		categoryName: "Gaming",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const ChatStream: Story = {
	args: {
		playlistTags: ["雑談", "フリートーク"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const SingingStream: Story = {
	args: {
		playlistTags: ["歌枠", "音楽"],
		categoryId: "10",
		categoryName: "Music",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const SmallSize: Story = {
	args: {
		playlistTags: ["配信", "雑談"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "sm",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const LargeSize: Story = {
	args: {
		playlistTags: ["配信", "雑談"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "lg",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const CompactMode: Story = {
	args: {
		playlistTags: ["配信", "雑談"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: true,
		order: "default",
	},
};

export const DetailPageOrder: Story = {
	args: {
		playlistTags: ["ASMR", "バイノーラル"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: false,
		order: "detail",
	},
};

export const WithSearchHighlight: Story = {
	args: {
		playlistTags: ["音楽配信", "歌枠"],
		categoryId: "10",
		categoryName: "Music",
		searchQuery: "音",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const MaxTagsLimit: Story = {
	args: {
		playlistTags: ["配信", "雑談", "フリートーク", "質問回答"],
		categoryId: "22",
		categoryName: "People & Blogs",
		maxTagsPerLayer: 3,
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const CompactWithMaxTags: Story = {
	args: {
		playlistTags: ["配信", "雑談", "フリートーク"],
		categoryId: "22",
		categoryName: "People & Blogs",
		maxTagsPerLayer: 5,
		size: "default",
		showCategory: true,
		compact: true,
		order: "default",
	},
};

export const ShowEmptyLayers: Story = {
	args: {
		playlistTags: [],
		categoryId: "22",
		categoryName: "People & Blogs",
		showEmptyLayers: true,
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const NoCategory: Story = {
	args: {
		playlistTags: ["配信", "雑談"],
		showCategory: false,
		size: "default",
		compact: false,
		order: "default",
	},
};

export const OnlyPlaylistTags: Story = {
	args: {
		playlistTags: ["ASMR", "バイノーラル", "耳かき"],
		showCategory: false,
		size: "default",
		compact: false,
		order: "default",
	},
};

export const OnlyCategory: Story = {
	args: {
		playlistTags: [],
		categoryId: "10",
		categoryName: "Music",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
	},
};

export const AllEmpty: Story = {
	args: {
		playlistTags: [],
		showCategory: false,
		showEmptyLayers: false,
		size: "default",
		compact: false,
		order: "default",
	},
};

export const ClickableInteraction: Story = {
	args: {
		playlistTags: ["配信", "雑談"],
		categoryId: "22",
		categoryName: "People & Blogs",
		size: "default",
		showCategory: true,
		compact: false,
		order: "default",
		onTagClick: fn((tag, layer) => alert(`Clicked: ${tag} (${layer})`)),
	},
};
