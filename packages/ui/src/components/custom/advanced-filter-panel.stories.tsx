import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { AdvancedFilterPanel, type AdvancedFilters } from "./advanced-filter-panel";

const meta = {
	title: "Custom/Filter/AdvancedFilterPanel",
	component: AdvancedFilterPanel,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		filters: {
			control: "object",
			description: "現在のフィルタ値",
		},
		onChange: {
			action: "onChange",
			description: "フィルタ値が変更された時のコールバック",
		},
		onApply: {
			action: "onApply",
			description: "フィルタを適用ボタンがクリックされた時のコールバック",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof AdvancedFilterPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// 制御されたコンポーネントの例
function AdvancedFilterPanelWrapper(props: any) {
	const [filters, setFilters] = useState<AdvancedFilters>({});

	return (
		<div className="w-[600px]">
			<AdvancedFilterPanel
				{...props}
				filters={filters}
				onChange={setFilters}
				onApply={() => console.log("Applied filters:", filters)}
			/>
			<div className="mt-4 p-4 bg-gray-100 rounded-lg">
				<h4 className="font-semibold mb-2">現在のフィルタ値:</h4>
				<pre className="text-sm">{JSON.stringify(filters, null, 2)}</pre>
			</div>
		</div>
	);
}

export const Default: Story = {
	render: () => <AdvancedFilterPanelWrapper />,
};

export const WithApplyButton: Story = {
	render: () => <AdvancedFilterPanelWrapper onApply={() => console.log("Apply clicked")} />,
};

export const WithActiveFilters: Story = {
	render: () => {
		const [filters, setFilters] = useState<AdvancedFilters>({
			playCount: { min: 100, max: 1000 },
			likeCount: { min: 10 },
			duration: { min: 30, max: 60 },
			createdAt: {
				from: new Date("2024-01-01"),
				to: new Date("2024-12-31"),
			},
		});

		return (
			<div className="w-[600px]">
				<AdvancedFilterPanel
					filters={filters}
					onChange={setFilters}
					onApply={() => console.log("Applied filters:", filters)}
				/>
				<div className="mt-4 p-4 bg-gray-100 rounded-lg">
					<h4 className="font-semibold mb-2">アクティブなフィルタ:</h4>
					<pre className="text-sm">{JSON.stringify(filters, null, 2)}</pre>
				</div>
			</div>
		);
	},
};

export const PlayCountOnly: Story = {
	render: () => {
		const [filters, setFilters] = useState<AdvancedFilters>({
			playCount: { min: 1000 },
		});

		return (
			<div className="w-[600px]">
				<AdvancedFilterPanel filters={filters} onChange={setFilters} />
			</div>
		);
	},
};

export const DateRangeOnly: Story = {
	render: () => {
		const [filters, setFilters] = useState<AdvancedFilters>({
			createdAt: {
				from: new Date("2024-01-01"),
				to: new Date("2024-03-31"),
			},
		});

		return (
			<div className="w-[600px]">
				<AdvancedFilterPanel filters={filters} onChange={setFilters} />
			</div>
		);
	},
};

export const CustomClassName: Story = {
	render: () => {
		const [filters, setFilters] = useState<AdvancedFilters>({});

		return (
			<div className="w-[600px] p-8 bg-blue-50 rounded-lg">
				<AdvancedFilterPanel
					filters={filters}
					onChange={setFilters}
					className="bg-white p-4 rounded-lg shadow-md"
				/>
			</div>
		);
	},
};

export const Interactive: Story = {
	render: () => {
		const [filters, setFilters] = useState<AdvancedFilters>({});
		const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>({});

		return (
			<div className="w-[800px]">
				<div className="mb-4">
					<h3 className="text-lg font-semibold mb-2">フィルタ操作デモ</h3>
					<p className="text-sm text-gray-600 mb-4">
						フィルタを設定して「フィルタを適用」ボタンをクリックすると、下部に適用されたフィルタが表示されます。
					</p>
					<AdvancedFilterPanel
						filters={filters}
						onChange={setFilters}
						onApply={() => setAppliedFilters(filters)}
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="p-4 bg-gray-100 rounded-lg">
						<h4 className="font-semibold mb-2">編集中のフィルタ:</h4>
						<pre className="text-xs">{JSON.stringify(filters, null, 2)}</pre>
					</div>
					<div className="p-4 bg-green-50 rounded-lg">
						<h4 className="font-semibold mb-2">適用済みのフィルタ:</h4>
						<pre className="text-xs">{JSON.stringify(appliedFilters, null, 2)}</pre>
					</div>
				</div>
			</div>
		);
	},
};
