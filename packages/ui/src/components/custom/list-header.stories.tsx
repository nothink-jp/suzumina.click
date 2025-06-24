import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { ListHeader } from "./list-header";

const meta: Meta<typeof ListHeader> = {
	title: "Custom/ListHeader",
	component: ListHeader,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"リスト表示用のヘッダーコンポーネント。件数表示、ページング情報、アクションボタンを統一的に配置します。",
			},
		},
	},
	argTypes: {
		title: {
			control: "text",
			description: "リストのタイトル",
		},
		totalCount: {
			control: "number",
			description: "全体の件数",
		},
		filteredCount: {
			control: "number",
			description: "フィルタ後の件数（設定した場合はフィルタ表示になる）",
		},
		currentPage: {
			control: "number",
			description: "現在のページ番号",
		},
		totalPages: {
			control: "number",
			description: "総ページ数",
		},
	},
};

export default meta;
type Story = StoryObj<typeof ListHeader>;

export const Default: Story = {
	args: {
		title: "動画一覧",
		totalCount: 150,
	},
};

export const WithPagination: Story = {
	args: {
		title: "音声ボタン一覧",
		totalCount: 1234,
		currentPage: 5,
		totalPages: 21,
	},
};

export const WithFilter: Story = {
	args: {
		title: "動画一覧",
		totalCount: 500,
		filteredCount: 25,
		currentPage: 1,
		totalPages: 3,
	},
};

export const WithActions: Story = {
	args: {
		title: "作品一覧",
		totalCount: 89,
		currentPage: 2,
		totalPages: 9,
		actions: (
			<Button>
				<Plus className="h-4 w-4 mr-2" />
				新規作成
			</Button>
		),
	},
};

export const LargeNumbers: Story = {
	args: {
		title: "大量データ一覧",
		totalCount: 1234567,
		filteredCount: 98765,
		currentPage: 123,
		totalPages: 9877,
	},
};

export const SinglePage: Story = {
	args: {
		title: "少量データ一覧",
		totalCount: 8,
		currentPage: 1,
		totalPages: 1,
	},
};

export const FilteredSameAsTotal: Story = {
	args: {
		title: "フィルタ結果一覧",
		totalCount: 100,
		filteredCount: 100,
		currentPage: 1,
		totalPages: 10,
	},
	parameters: {
		docs: {
			description: {
				story: "フィルタ後の件数が総件数と同じ場合は、通常の表示になります。",
			},
		},
	},
};

export const MultipleActions: Story = {
	args: {
		title: "管理一覧",
		totalCount: 45,
		currentPage: 2,
		totalPages: 5,
		actions: (
			<div className="flex gap-2">
				<Button variant="outline">エクスポート</Button>
				<Button>
					<Plus className="h-4 w-4 mr-2" />
					新規作成
				</Button>
			</div>
		),
	},
};

export const VideoList: Story = {
	args: {
		title: "動画一覧",
		totalCount: 342,
		currentPage: 3,
		totalPages: 29,
	},
	parameters: {
		docs: {
			description: {
				story: "動画一覧ページでの使用例",
			},
		},
	},
};

export const AudioButtonList: Story = {
	args: {
		title: "音声ボタン一覧",
		totalCount: 1580,
		currentPage: 8,
		totalPages: 132,
	},
	parameters: {
		docs: {
			description: {
				story: "音声ボタン一覧ページでの使用例",
			},
		},
	},
};

export const WorkList: Story = {
	args: {
		title: "作品一覧",
		totalCount: 267,
		currentPage: 1,
		totalPages: 23,
	},
	parameters: {
		docs: {
			description: {
				story: "作品一覧ページでの使用例",
			},
		},
	},
};
