import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { FilterSelect, SearchFilterPanel, SortSelect } from "./search-filter-panel";

const meta: Meta<typeof SearchFilterPanel> = {
	title: "Custom/Filter/SearchFilterPanel",
	component: SearchFilterPanel,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: "リストページ用の統一された検索・フィルターパネルコンポーネント",
			},
		},
	},
	argTypes: {
		searchValue: {
			control: "text",
			description: "検索入力の値",
		},
		searchPlaceholder: {
			control: "text",
			description: "検索入力のプレースホルダー",
		},
		onSearchChange: {
			action: "searchChanged",
			description: "検索値変更時のコールバック",
		},
		onSearch: {
			action: "searched",
			description: "検索実行時のコールバック",
		},
	},
};

export default meta;
type Story = StoryObj<typeof SearchFilterPanel>;

export const Default: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "検索...",
		onSearchChange: fn(),
		onSearch: fn(),
	},
};

export const WithSearchValue: Story = {
	args: {
		searchValue: "涼花みなせ",
		searchPlaceholder: "動画タイトルで検索...",
		onSearchChange: fn(),
		onSearch: fn(),
	},
};

export const WithFilters: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "音声ボタンを検索...",
		onSearchChange: fn(),
		onSearch: fn(),
		filters: (
			<>
				<SortSelect
					value="newest"
					onValueChange={fn()}
					options={[
						{ value: "default", label: "並び順" },
						{ value: "newest", label: "新しい順" },
						{ value: "oldest", label: "古い順" },
						{ value: "popular", label: "人気順" },
					]}
				/>
				<FilterSelect
					value="all"
					onValueChange={fn()}
					placeholder="カテゴリー"
					options={[
						{ value: "all", label: "すべてのカテゴリー" },
						{ value: "greeting", label: "挨拶" },
						{ value: "reaction", label: "リアクション" },
						{ value: "emotion", label: "感情" },
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
		onSearchChange: fn(),
		onSearch: fn(),
		filters: (
			<>
				<SortSelect
					value="default"
					onValueChange={fn()}
					options={[
						{ value: "default", label: "並び順" },
						{ value: "newest", label: "新しい順" },
						{ value: "oldest", label: "古い順" },
						{ value: "popular", label: "人気順" },
					]}
				/>
				<FilterSelect
					value="all"
					onValueChange={fn()}
					placeholder="すべての年代"
					options={[
						{ value: "all", label: "すべての年代" },
						{ value: "2024", label: "2024年" },
						{ value: "2023", label: "2023年" },
						{ value: "2022", label: "2022年" },
						{ value: "2021", label: "2021年" },
					]}
				/>
			</>
		),
	},
};

export const WorkSearch: Story = {
	args: {
		searchValue: "",
		searchPlaceholder: "作品タイトルで検索...",
		onSearchChange: fn(),
		onSearch: fn(),
		filters: (
			<>
				<SortSelect
					value="default"
					onValueChange={fn()}
					options={[
						{ value: "default", label: "並び順" },
						{ value: "newest", label: "新しい順" },
						{ value: "oldest", label: "古い順" },
						{ value: "popular", label: "人気順" },
						{ value: "rating", label: "評価順" },
						{ value: "price_low", label: "価格安い順" },
						{ value: "price_high", label: "価格高い順" },
					]}
				/>
				<FilterSelect
					value="all"
					onValueChange={fn()}
					placeholder="カテゴリ"
					options={[
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "SOU", label: "ボイス・ASMR" },
						{ value: "ADV", label: "アドベンチャー" },
						{ value: "RPG", label: "ロールプレイング" },
						{ value: "MOV", label: "動画" },
					]}
				/>
			</>
		),
	},
};

// FilterSelect のストーリー
const filterMeta: Meta<typeof FilterSelect> = {
	title: "Custom/Filter/FilterSelect",
	component: FilterSelect,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		value: {
			control: "text",
		},
		placeholder: {
			control: "text",
		},
		onValueChange: {
			action: "valueChanged",
		},
	},
};

type FilterStory = StoryObj<typeof FilterSelect>;

export const FilterDefault: FilterStory = {
	...filterMeta,
	args: {
		value: "all",
		placeholder: "選択してください",
		options: [
			{ value: "all", label: "すべて" },
			{ value: "option1", label: "オプション1" },
			{ value: "option2", label: "オプション2" },
			{ value: "option3", label: "オプション3" },
		],
		onValueChange: fn(),
	},
};

export const FilterSelected: FilterStory = {
	...filterMeta,
	args: {
		value: "option2",
		placeholder: "選択してください",
		options: [
			{ value: "all", label: "すべて" },
			{ value: "option1", label: "オプション1" },
			{ value: "option2", label: "オプション2" },
			{ value: "option3", label: "オプション3" },
		],
		onValueChange: fn(),
	},
};

// SortSelect のストーリー
const sortMeta: Meta<typeof SortSelect> = {
	title: "Custom/Filter/SortSelect",
	component: SortSelect,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		value: {
			control: "text",
		},
		onValueChange: {
			action: "valueChanged",
		},
	},
};

type SortStory = StoryObj<typeof SortSelect>;

export const SortDefault: SortStory = {
	...sortMeta,
	args: {
		value: "default",
		onValueChange: fn(),
	},
};

export const SortSelected: SortStory = {
	...sortMeta,
	args: {
		value: "popular",
		onValueChange: fn(),
	},
};

export const SortCustomOptions: SortStory = {
	...sortMeta,
	args: {
		value: "default",
		options: [
			{ value: "default", label: "並び順" },
			{ value: "name_asc", label: "名前昇順" },
			{ value: "name_desc", label: "名前降順" },
			{ value: "date_asc", label: "日付昇順" },
			{ value: "date_desc", label: "日付降順" },
		],
		onValueChange: fn(),
	},
};
