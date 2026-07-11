import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionPillRow } from "./action-pill-row";

const meta: Meta<typeof ActionPillRow> = {
	title: "Custom/Audio/ActionPillRow",
	component: ActionPillRow,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"アクションピル行（ボタン画面刷新の共通部品）。お気に入り/高評価/Xで共有の見た目のみを持ち、状態解決は呼び出し側の client island の責務。低評価 UI は製品判断により持たない。",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: { type: "radio" },
			options: ["default", "sm"],
			description: "default=詳細ページ用 / sm=モーダル用",
		},
	},
};

export default meta;
type Story = StoryObj<typeof ActionPillRow>;

export const Default: Story = {
	args: {
		size: "default",
		isFavorite: false,
		isLiked: false,
		likeCount: 2,
		shareUrl: "https://x.com/intent/post?text=test",
	},
};

export const FavoritedAndLiked: Story = {
	args: {
		size: "default",
		isFavorite: true,
		isLiked: true,
		likeCount: 3,
		shareUrl: "https://x.com/intent/post?text=test",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		isFavorite: false,
		isLiked: false,
		likeCount: 2,
		shareUrl: "https://x.com/intent/post?text=test",
	},
};
