import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DateRangeFilter } from "./date-range-filter";

const meta = {
	title: "Custom/DateRangeFilter",
	component: DateRangeFilter,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		label: {
			control: "text",
			description: "フィルタのラベル",
		},
		value: {
			control: "object",
			description: "選択された日付範囲",
		},
		onChange: {
			action: "onChange",
			description: "日付範囲が変更された時のコールバック",
		},
		presets: {
			control: "object",
			description: "カスタムプリセット",
		},
	},
} satisfies Meta<typeof DateRangeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// 制御されたコンポーネントの例
function DateRangeFilterWrapper(props: any) {
	const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

	return (
		<div className="space-y-4">
			<DateRangeFilter {...props} value={dateRange} onChange={setDateRange} />
			<div className="p-4 bg-gray-100 rounded-lg">
				<h4 className="font-semibold mb-2">選択された日付範囲:</h4>
				<pre className="text-sm">
					{JSON.stringify(
						{
							from: dateRange.from?.toISOString().split("T")[0],
							to: dateRange.to?.toISOString().split("T")[0],
						},
						null,
						2,
					)}
				</pre>
			</div>
		</div>
	);
}

export const Default: Story = {
	render: () => <DateRangeFilterWrapper label="作成日" />,
};

export const WithInitialValue: Story = {
	render: () => {
		const [dateRange, setDateRange] = useState({
			from: new Date("2024-01-01"),
			to: new Date("2024-03-31"),
		});

		return <DateRangeFilter label="期間" value={dateRange} onChange={setDateRange} />;
	},
};

export const CustomPresets: Story = {
	render: () => {
		const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

		const customPresets = [
			{
				label: "昨年",
				from: new Date("2023-01-01"),
				to: new Date("2023-12-31"),
			},
			{
				label: "今年度",
				from: new Date("2024-04-01"),
				to: new Date("2025-03-31"),
			},
			{
				label: "過去1年",
				from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
				to: new Date(),
			},
		];

		return (
			<DateRangeFilter
				label="集計期間"
				value={dateRange}
				onChange={setDateRange}
				presets={customPresets}
			/>
		);
	},
};

export const FromDateOnly: Story = {
	render: () => {
		const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
			from: new Date("2024-01-01"),
		});

		return (
			<div className="space-y-4">
				<DateRangeFilter label="開始日" value={dateRange} onChange={setDateRange} />
				<p className="text-sm text-gray-600">
					開始日のみ選択された状態（{dateRange.from?.toLocaleDateString()}以降）
				</p>
			</div>
		);
	},
};

export const ToDateOnly: Story = {
	render: () => {
		const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
			to: new Date("2024-12-31"),
		});

		return (
			<div className="space-y-4">
				<DateRangeFilter label="終了日" value={dateRange} onChange={setDateRange} />
				<p className="text-sm text-gray-600">
					終了日のみ選択された状態（{dateRange.to?.toLocaleDateString()}以前）
				</p>
			</div>
		);
	},
};

export const MultipleFilters: Story = {
	render: () => {
		const [createdRange, setCreatedRange] = useState<{ from?: Date; to?: Date }>({});
		const [updatedRange, setUpdatedRange] = useState<{ from?: Date; to?: Date }>({});
		const [publishedRange, setPublishedRange] = useState<{ from?: Date; to?: Date }>({});

		return (
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">複数の日付フィルタ</h3>
				<div className="flex flex-wrap gap-2">
					<DateRangeFilter label="作成日" value={createdRange} onChange={setCreatedRange} />
					<DateRangeFilter label="更新日" value={updatedRange} onChange={setUpdatedRange} />
					<DateRangeFilter label="公開日" value={publishedRange} onChange={setPublishedRange} />
				</div>
				<div className="grid grid-cols-3 gap-4">
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">作成日</h4>
						<p className="text-xs">
							{createdRange.from?.toLocaleDateString() || "未設定"} -{" "}
							{createdRange.to?.toLocaleDateString() || "未設定"}
						</p>
					</div>
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">更新日</h4>
						<p className="text-xs">
							{updatedRange.from?.toLocaleDateString() || "未設定"} -{" "}
							{updatedRange.to?.toLocaleDateString() || "未設定"}
						</p>
					</div>
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">公開日</h4>
						<p className="text-xs">
							{publishedRange.from?.toLocaleDateString() || "未設定"} -{" "}
							{publishedRange.to?.toLocaleDateString() || "未設定"}
						</p>
					</div>
				</div>
			</div>
		);
	},
};
