import type { Meta, StoryObj } from "@storybook/react";
import { HighlightTags, HighlightText, MultiFieldHighlight } from "./highlight-text";

const meta = {
	title: "Custom/HighlightText",
	component: HighlightText,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		text: {
			control: "text",
			description: "表示するテキスト",
		},
		searchQuery: {
			control: "text",
			description: "ハイライトする検索クエリ",
		},
		className: {
			control: "text",
			description: "テキスト全体に適用するCSSクラス",
		},
		highlightClassName: {
			control: "text",
			description: "ハイライト部分に適用するCSSクラス",
		},
	},
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		text: "これはテスト用のサンプルテキストです。テストという単語がハイライトされます。",
		searchQuery: "テスト",
	},
};

export const MultipleTerms: Story = {
	args: {
		text: "React TypeScript Next.js を使用した開発環境の構築方法について説明します。",
		searchQuery: "React Next.js",
	},
};

export const CaseInsensitive: Story = {
	args: {
		text: "JavaScript javascript JAVASCRIPT と様々な大文字小文字の組み合わせ",
		searchQuery: "javascript",
	},
};

export const NoMatch: Story = {
	args: {
		text: "このテキストには検索語が含まれていません。",
		searchQuery: "存在しない単語",
	},
};

export const CustomHighlightStyle: Story = {
	args: {
		text: "カスタムスタイルでハイライト表示されるテキストです。",
		searchQuery: "カスタム ハイライト",
		highlightClassName: "bg-blue-200 text-blue-900 font-bold px-1 rounded-md",
	},
};

export const LongText: Story = {
	args: {
		text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
		searchQuery: "dolor ut",
	},
};

export const SpecialCharacters: Story = {
	args: {
		text: "特殊文字を含むテキスト: (括弧) [配列] {オブジェクト} $変数 *アスタリスク",
		searchQuery: "(括弧) [配列]",
	},
};

export const EmptyQuery: Story = {
	args: {
		text: "検索クエリが空の場合は、通常のテキストとして表示されます。",
		searchQuery: "",
	},
};

// MultiFieldHighlight のストーリー
export const MultiFieldHighlightExample: Story = {
	render: () => (
		<MultiFieldHighlight
			fields={[
				{ value: "React", className: "font-bold" },
				{ value: "TypeScript", className: "text-blue-600" },
				{ value: "Next.js", className: "text-gray-700" },
			]}
			searchQuery="type next"
			separator=" / "
		/>
	),
};

export const MultiFieldHighlightCustom: Story = {
	render: () => (
		<MultiFieldHighlight
			fields={[
				{ value: "フロントエンド開発" },
				{ value: "バックエンド開発" },
				{ value: "フルスタック開発" },
			]}
			searchQuery="開発"
			highlightClassName="bg-green-200 text-green-900 font-semibold"
			separator=" | "
		/>
	),
};

// HighlightTags のストーリー
export const HighlightTagsExample: Story = {
	render: () => (
		<HighlightTags
			tags={["JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Svelte"]}
			searchQuery="script react"
		/>
	),
};

export const HighlightTagsCustomStyle: Story = {
	render: () => (
		<HighlightTags
			tags={["開発", "デザイン", "マーケティング", "営業", "人事", "経理"]}
			searchQuery="開発 営業"
			tagClassName="inline-block px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-lg border border-blue-200"
			highlightClassName="bg-yellow-300 text-yellow-900"
		/>
	),
};

export const HighlightTagsLarge: Story = {
	render: () => (
		<div className="max-w-md">
			<HighlightTags
				tags={[
					"声優",
					"涼花みなせ",
					"音声作品",
					"ASMR",
					"シチュエーションボイス",
					"ドラマCD",
					"ゲーム",
					"アニメ",
					"朗読",
					"ナレーション",
				]}
				searchQuery="声優 音声"
				className="flex flex-wrap gap-2"
				tagClassName="inline-block px-4 py-2 text-base bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
			/>
		</div>
	),
};
