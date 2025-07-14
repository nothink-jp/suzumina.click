import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../ui/button";
import { ListDisplayControls } from "./list-display-controls";

const meta = {
	title: "Custom/ListDisplayControls",
	component: ListDisplayControls,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
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
			description: "フィルタ後の件数",
		},
		currentPage: {
			control: "number",
			description: "現在のページ番号",
		},
		totalPages: {
			control: "number",
			description: "総ページ数",
		},
		sortValue: {
			control: "text",
			description: "現在の並び順",
		},
		onSortChange: {
			action: "onSortChange",
			description: "並び順変更時のコールバック",
		},
		sortOptions: {
			control: "object",
			description: "並び順の選択肢",
		},
		itemsPerPageValue: {
			control: "text",
			description: "現在の表示件数",
		},
		onItemsPerPageChange: {
			action: "onItemsPerPageChange",
			description: "表示件数変更時のコールバック",
		},
		itemsPerPageOptions: {
			control: "object",
			description: "表示件数の選択肢",
		},
		viewMode: {
			control: "radio",
			options: ["grid", "list"],
			description: "表示モード",
		},
		onViewModeChange: {
			action: "onViewModeChange",
			description: "表示モード変更時のコールバック",
		},
		actions: {
			description: "追加のアクション要素",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof ListDisplayControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "音声ボタン一覧",
		totalCount: 150,
	},
};

export const WithFiltering: Story = {
	args: {
		title: "検索結果",
		totalCount: 150,
		filteredCount: 42,
	},
};

export const WithPagination: Story = {
	args: {
		title: "作品一覧",
		totalCount: 250,
		currentPage: 3,
		totalPages: 11,
	},
};

export const WithSortControl: Story = {
	render: () => {
		const [sortValue, setSortValue] = useState("newest");

		return (
			<ListDisplayControls
				title="動画一覧"
				totalCount={89}
				sortValue={sortValue}
				onSortChange={setSortValue}
			/>
		);
	},
};

export const WithItemsPerPageControl: Story = {
	render: () => {
		const [itemsPerPage, setItemsPerPage] = useState("24");

		return (
			<ListDisplayControls
				title="コンテンツ一覧"
				totalCount={300}
				itemsPerPageValue={itemsPerPage}
				onItemsPerPageChange={setItemsPerPage}
			/>
		);
	},
};

export const WithViewModeControl: Story = {
	render: () => {
		const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

		return (
			<ListDisplayControls
				title="画像ギャラリー"
				totalCount={48}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>
		);
	},
};

export const FullFeatured: Story = {
	render: () => {
		const [sortValue, setSortValue] = useState("newest");
		const [itemsPerPage, setItemsPerPage] = useState("24");
		const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

		return (
			<ListDisplayControls
				title="音声ボタン"
				totalCount={150}
				filteredCount={75}
				currentPage={2}
				totalPages={4}
				sortValue={sortValue}
				onSortChange={setSortValue}
				itemsPerPageValue={itemsPerPage}
				onItemsPerPageChange={setItemsPerPage}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>
		);
	},
};

export const WithCustomActions: Story = {
	args: {
		title: "お気に入り",
		totalCount: 32,
		actions: (
			<div className="flex gap-2">
				<Button size="sm" variant="outline">
					エクスポート
				</Button>
				<Button size="sm" variant="outline">
					共有
				</Button>
			</div>
		),
	},
};

export const CustomSortOptions: Story = {
	render: () => {
		const [sortValue, setSortValue] = useState("price-low");

		const customSortOptions = [
			{ value: "price-low", label: "価格が低い順" },
			{ value: "price-high", label: "価格が高い順" },
			{ value: "rating", label: "評価が高い順" },
			{ value: "sales", label: "売上順" },
		];

		return (
			<ListDisplayControls
				title="商品一覧"
				totalCount={200}
				sortValue={sortValue}
				onSortChange={setSortValue}
				sortOptions={customSortOptions}
			/>
		);
	},
};

export const CustomItemsPerPageOptions: Story = {
	render: () => {
		const [itemsPerPage, setItemsPerPage] = useState("10");

		const customItemsPerPageOptions = [
			{ value: "10", label: "10件表示" },
			{ value: "20", label: "20件表示" },
			{ value: "50", label: "50件表示" },
			{ value: "100", label: "100件表示" },
		];

		return (
			<ListDisplayControls
				title="データテーブル"
				totalCount={500}
				itemsPerPageValue={itemsPerPage}
				onItemsPerPageChange={setItemsPerPage}
				itemsPerPageOptions={customItemsPerPageOptions}
			/>
		);
	},
};

export const MinimalControls: Story = {
	args: {
		title: "シンプルリスト",
		totalCount: 25,
	},
};

export const ResponsiveLayout: Story = {
	render: () => {
		const [sortValue, setSortValue] = useState("newest");
		const [itemsPerPage, setItemsPerPage] = useState("24");
		const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

		return (
			<div className="space-y-8">
				<div>
					<h3 className="text-sm font-semibold mb-2">デスクトップ表示</h3>
					<div className="border rounded-lg p-4">
						<ListDisplayControls
							title="レスポンシブテスト"
							totalCount={150}
							filteredCount={75}
							currentPage={2}
							totalPages={4}
							sortValue={sortValue}
							onSortChange={setSortValue}
							itemsPerPageValue={itemsPerPage}
							onItemsPerPageChange={setItemsPerPage}
							viewMode={viewMode}
							onViewModeChange={setViewMode}
						/>
					</div>
				</div>
				<div>
					<h3 className="text-sm font-semibold mb-2">モバイル表示（max-width: 640px）</h3>
					<div className="max-w-[640px] border rounded-lg p-4">
						<ListDisplayControls
							title="レスポンシブテスト"
							totalCount={150}
							filteredCount={75}
							currentPage={2}
							totalPages={4}
							sortValue={sortValue}
							onSortChange={setSortValue}
							itemsPerPageValue={itemsPerPage}
							onItemsPerPageChange={setItemsPerPage}
							viewMode={viewMode}
							onViewModeChange={setViewMode}
						/>
					</div>
				</div>
			</div>
		);
	},
};
