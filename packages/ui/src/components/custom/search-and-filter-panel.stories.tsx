import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SearchAndFilterPanel } from "./search-and-filter-panel";
import { FilterSelect } from "./search-filter-panel";

const meta: Meta<typeof SearchAndFilterPanel> = {
	title: "Custom/SearchAndFilterPanel",
	component: SearchAndFilterPanel,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"検索・フィルター専用パネルコンポーネント。検索バー（Enter実行対応）、フィルターボタン群、検索・リセットアクションを提供します。",
			},
		},
	},
	argTypes: {
		searchValue: {
			control: "text",
			description: "検索クエリの値",
		},
		searchPlaceholder: {
			control: "text",
			description: "検索バーのプレースホルダー",
		},
		hasActiveFilters: {
			control: "boolean",
			description: "アクティブなフィルターがあるかどうか",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
		onSearchChange: {
			description: "検索値変更時のコールバック",
		},
		onSearch: {
			description: "検索実行時のコールバック",
		},
		onReset: {
			description: "リセット時のコールバック",
		},
		onSearchKeyDown: {
			description: "カスタムキーダウンハンドラー",
		},
		filters: {
			description: "フィルターコンポーネント",
		},
	},
	args: {
		onSearchChange: fn(),
		onSearch: fn(),
		onReset: fn(),
		onSearchKeyDown: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "検索...",
		hasActiveFilters: false,
	},
};

export const WithSearchValue: Story = {
	args: {
		searchValue: "涼花みなせ",
		searchPlaceholder: "動画タイトルで検索...",
		hasActiveFilters: true,
	},
};

export const WithFilters: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "作品タイトルで検索...",
		hasActiveFilters: false,
		filters: (
			<>
				<FilterSelect
					value="all"
					onValueChange={() => {}}
					placeholder="すべての年代"
					options={[
						{ value: "all", label: "すべての年代" },
						{ value: "2024", label: "2024年" },
						{ value: "2023", label: "2023年" },
						{ value: "2022", label: "2022年" },
					]}
				/>
				<FilterSelect
					value="all"
					onValueChange={() => {}}
					placeholder="カテゴリ"
					options={[
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "SOU", label: "ボイス・ASMR" },
						{ value: "ADV", label: "アドベンチャー" },
						{ value: "RPG", label: "ロールプレイング" },
					]}
				/>
			</>
		),
	},
};

export const WithActiveFilters: Story = {
	args: {
		searchValue: "ASMR",
		searchPlaceholder: "作品タイトルで検索...",
		hasActiveFilters: true,
		filters: (
			<>
				<FilterSelect
					value="2024"
					onValueChange={() => {}}
					placeholder="すべての年代"
					options={[
						{ value: "all", label: "すべての年代" },
						{ value: "2024", label: "2024年" },
						{ value: "2023", label: "2023年" },
						{ value: "2022", label: "2022年" },
					]}
				/>
				<FilterSelect
					value="SOU"
					onValueChange={() => {}}
					placeholder="カテゴリ"
					options={[
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "SOU", label: "ボイス・ASMR" },
						{ value: "ADV", label: "アドベンチャー" },
						{ value: "RPG", label: "ロールプレイング" },
					]}
				/>
			</>
		),
	},
};

export const VideoSearch: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "動画タイトルで検索...",
		hasActiveFilters: false,
		filters: (
			<FilterSelect
				value="all"
				onValueChange={() => {}}
				placeholder="すべての年代"
				options={[
					{ value: "all", label: "すべての年代" },
					{ value: "2024", label: "2024年" },
					{ value: "2023", label: "2023年" },
					{ value: "2022", label: "2022年" },
					{ value: "2021", label: "2021年" },
					{ value: "2020", label: "2020年" },
					{ value: "2019", label: "2019年" },
					{ value: "2018", label: "2018年" },
				]}
			/>
		),
	},
};

export const WorkSearch: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "作品タイトルで検索...",
		hasActiveFilters: false,
		filters: (
			<FilterSelect
				value="all"
				onValueChange={() => {}}
				placeholder="カテゴリ"
				options={[
					{ value: "all", label: "すべてのカテゴリ" },
					{ value: "SOU", label: "ボイス・ASMR" },
					{ value: "ADV", label: "アドベンチャー" },
					{ value: "RPG", label: "ロールプレイング" },
					{ value: "MOV", label: "動画" },
				]}
			/>
		),
	},
};

export const CustomClassName: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "検索...",
		hasActiveFilters: false,
		className: "border-dashed border-2 border-primary",
	},
};
