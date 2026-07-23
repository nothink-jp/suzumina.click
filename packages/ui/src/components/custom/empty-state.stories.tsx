import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heart, ImageOff, Inbox, SearchX } from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState } from "./empty-state";

const meta = {
	title: "Custom/Layout/EmptyState",
	component: EmptyState,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"空状態（データなし・検索結果なし）の共通表示。ADR-012 に基づき ReUI 由来の IconStack（packages/ui/src/components/ui/icon-stack.tsx）を装飾に使い、散在していたインライン空表示を統一する。",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "データがありません",
	},
};

export const WithDescription: Story = {
	args: {
		icon: <Inbox className="h-full w-full" />,
		title: "検索結果が見つかりません",
		description: "検索条件を変更するか、フィルターをリセットしてください。",
	},
};

/** 一覧ページの検索結果ゼロ・「まだ何もない」系の主役となる空表示（illustrated） */
export const Illustrated: Story = {
	args: {
		icon: <Heart className="h-6 w-6" />,
		title: "お気に入りがまだありません",
		description: "音声ボタンをお気に入りに追加すると、ここに表示されます",
		illustrated: true,
		action: <Button size="sm">音声ボタン一覧を見る</Button>,
	},
};

export const WithAction: Story = {
	args: {
		icon: <SearchX className="h-full w-full" />,
		title: "条件にあうボタンが見つかりませんでした",
		action: (
			<Button variant="outline" size="sm">
				フィルターをリセット
			</Button>
		),
	},
};

/** 詳細ページ内セクション（価格履歴・サンプル画像等）のようなコンパクトな空表示 */
export const Compact: Story = {
	args: {
		icon: <ImageOff className="h-full w-full" />,
		title: "サンプル画像はありません",
		size: "sm",
	},
};

export const NoIcon: Story = {
	args: {
		title: "変更がありません",
		size: "sm",
	},
};
