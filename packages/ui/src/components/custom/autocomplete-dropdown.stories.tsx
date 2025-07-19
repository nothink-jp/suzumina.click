import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { AutocompleteDropdown, type AutocompleteSuggestionItem } from "./autocomplete-dropdown";

const meta = {
	title: "Custom/Filter/AutocompleteDropdown",
	component: AutocompleteDropdown,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div style={{ position: "relative", minHeight: 400 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AutocompleteDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
interface SampleItem {
	text: string;
	type: "tag" | "title" | "video";
	count?: number;
}

const sampleItems: AutocompleteSuggestionItem<SampleItem>[] = [
	{ id: "1", value: { text: "挨拶", type: "tag", count: 42 } },
	{ id: "2", value: { text: "おはようございます", type: "title", count: 15 } },
	{ id: "3", value: { text: "朝の配信", type: "video" } },
	{ id: "4", value: { text: "感謝", type: "tag", count: 38 } },
	{ id: "5", value: { text: "ありがとう", type: "title", count: 23 } },
];

// インタラクティブな例
export const Interactive: Story = {
	render: function Render() {
		const [isVisible, setIsVisible] = useState(true);
		const [highlightedIndex, setHighlightedIndex] = useState(0);
		const [selectedItem, setSelectedItem] = useState<string | null>(null);

		const handleSelect = (item: AutocompleteSuggestionItem<SampleItem>) => {
			setSelectedItem(item.value.text);
			setIsVisible(false);
		};

		const renderItem = (item: AutocompleteSuggestionItem<SampleItem>, isHighlighted: boolean) => (
			<div
				className={`flex items-center justify-between px-3 py-2 ${isHighlighted ? "text-primary" : ""}`}
			>
				<span>{item.value.text}</span>
				<div className="flex items-center gap-2">
					<Badge variant={isHighlighted ? "default" : "secondary"}>{item.value.type}</Badge>
					{item.value.count && (
						<span className="text-xs text-muted-foreground">{item.value.count}</span>
					)}
				</div>
			</div>
		);

		return (
			<>
				<button
					onClick={() => setIsVisible(!isVisible)}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Toggle Dropdown
				</button>
				{selectedItem && <p className="mt-2">選択: {selectedItem}</p>}
				<AutocompleteDropdown
					items={sampleItems}
					isVisible={isVisible}
					onSelect={handleSelect}
					onClose={() => setIsVisible(false)}
					highlightedIndex={highlightedIndex}
					onHighlightChange={setHighlightedIndex}
					renderItem={renderItem}
				/>
			</>
		);
	},
};

export const Loading: Story = {
	args: {
		items: [],
		isLoading: true,
		isVisible: true,
		onSelect: () => {},
		onClose: () => {},
		highlightedIndex: -1,
		onHighlightChange: () => {},
		renderItem: () => null,
		loadingMessage: "検索中...",
	},
};

export const Empty: Story = {
	args: {
		items: [],
		isLoading: false,
		isVisible: true,
		onSelect: () => {},
		onClose: () => {},
		highlightedIndex: -1,
		onHighlightChange: () => {},
		renderItem: () => null,
		emptyMessage: "候補が見つかりませんでした",
	},
};

export const WithManyItems: Story = {
	render: function Render() {
		const manyItems = Array.from({ length: 20 }, (_, i) => ({
			id: `item-${i}`,
			value: { text: `アイテム ${i + 1}`, type: "title" as const },
		}));

		const renderItem = (item: AutocompleteSuggestionItem<SampleItem>) => (
			<div className="px-3 py-2">{item.value.text}</div>
		);

		return (
			<AutocompleteDropdown
				items={manyItems}
				isVisible={true}
				onSelect={() => {}}
				onClose={() => {}}
				highlightedIndex={3}
				onHighlightChange={() => {}}
				renderItem={renderItem}
			/>
		);
	},
};
