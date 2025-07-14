import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NumericRangeFilter } from "./numeric-range-filter";

const meta = {
	title: "Custom/NumericRangeFilter",
	component: NumericRangeFilter,
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
			description: "選択された数値範囲",
		},
		onChange: {
			action: "onChange",
			description: "数値範囲が変更された時のコールバック",
		},
		presets: {
			control: "object",
			description: "プリセット値のリスト",
		},
		unit: {
			control: "text",
			description: "単位の表示",
		},
		placeholder: {
			control: "object",
			description: "プレースホルダーテキスト",
		},
	},
} satisfies Meta<typeof NumericRangeFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// 制御されたコンポーネントの例
function NumericRangeFilterWrapper(props: any) {
	const [range, setRange] = useState<{ min?: number; max?: number }>({});

	return (
		<div className="space-y-4">
			<NumericRangeFilter {...props} value={range} onChange={setRange} />
			<div className="p-4 bg-gray-100 rounded-lg">
				<h4 className="font-semibold mb-2">選択された範囲:</h4>
				<pre className="text-sm">{JSON.stringify(range, null, 2)}</pre>
			</div>
		</div>
	);
}

export const Default: Story = {
	render: () => <NumericRangeFilterWrapper label="価格" unit="円" />,
};

export const WithPresets: Story = {
	render: () => (
		<NumericRangeFilterWrapper
			label="再生数"
			unit="回"
			presets={[
				{ label: "1回以上", min: 1 },
				{ label: "10回以上", min: 10 },
				{ label: "100回以上", min: 100 },
				{ label: "1000回以上", min: 1000 },
			]}
		/>
	),
};

export const WithInitialValue: Story = {
	render: () => {
		const [range, setRange] = useState({ min: 100, max: 1000 });

		return <NumericRangeFilter label="在庫数" value={range} onChange={setRange} unit="個" />;
	},
};

export const CustomPlaceholder: Story = {
	render: () => (
		<NumericRangeFilterWrapper
			label="評価"
			unit="点"
			placeholder={{
				min: "最低点",
				max: "最高点",
			}}
		/>
	),
};

export const DurationFilter: Story = {
	render: () => (
		<NumericRangeFilterWrapper
			label="音声長"
			unit="秒"
			presets={[
				{ label: "短い (～10秒)", max: 10 },
				{ label: "普通 (10～30秒)", min: 10, max: 30 },
				{ label: "長い (30秒～)", min: 30 },
				{ label: "とても長い (60秒～)", min: 60 },
			]}
		/>
	),
};

export const PriceRangeFilter: Story = {
	render: () => (
		<NumericRangeFilterWrapper
			label="価格帯"
			unit="円"
			presets={[
				{ label: "～1,000円", max: 1000 },
				{ label: "1,000～5,000円", min: 1000, max: 5000 },
				{ label: "5,000～10,000円", min: 5000, max: 10000 },
				{ label: "10,000円～", min: 10000 },
			]}
			placeholder={{
				min: "下限なし",
				max: "上限なし",
			}}
		/>
	),
};

export const MinOnly: Story = {
	render: () => {
		const [range, setRange] = useState<{ min?: number; max?: number }>({ min: 50 });

		return (
			<div className="space-y-4">
				<NumericRangeFilter label="スコア" value={range} onChange={setRange} unit="点" />
				<p className="text-sm text-gray-600">最小値のみ選択された状態（{range.min}点以上）</p>
			</div>
		);
	},
};

export const MaxOnly: Story = {
	render: () => {
		const [range, setRange] = useState<{ min?: number; max?: number }>({ max: 100 });

		return (
			<div className="space-y-4">
				<NumericRangeFilter label="在庫" value={range} onChange={setRange} unit="個" />
				<p className="text-sm text-gray-600">最大値のみ選択された状態（{range.max}個以下）</p>
			</div>
		);
	},
};

export const MultipleFilters: Story = {
	render: () => {
		const [playCount, setPlayCount] = useState<{ min?: number; max?: number }>({});
		const [likeCount, setLikeCount] = useState<{ min?: number; max?: number }>({});
		const [duration, setDuration] = useState<{ min?: number; max?: number }>({});

		return (
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">複数の数値フィルタ</h3>
				<div className="flex flex-wrap gap-2">
					<NumericRangeFilter
						label="再生数"
						value={playCount}
						onChange={setPlayCount}
						unit="回"
						presets={[
							{ label: "10回以上", min: 10 },
							{ label: "100回以上", min: 100 },
							{ label: "1000回以上", min: 1000 },
						]}
					/>
					<NumericRangeFilter
						label="いいね数"
						value={likeCount}
						onChange={setLikeCount}
						unit="回"
						presets={[
							{ label: "5回以上", min: 5 },
							{ label: "10回以上", min: 10 },
							{ label: "50回以上", min: 50 },
						]}
					/>
					<NumericRangeFilter
						label="音声長"
						value={duration}
						onChange={setDuration}
						unit="秒"
						presets={[
							{ label: "短い (～10秒)", max: 10 },
							{ label: "普通 (10～30秒)", min: 10, max: 30 },
							{ label: "長い (30秒～)", min: 30 },
						]}
					/>
				</div>
				<div className="grid grid-cols-3 gap-4">
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">再生数</h4>
						<p className="text-xs">
							{playCount.min || "0"} - {playCount.max || "∞"} 回
						</p>
					</div>
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">いいね数</h4>
						<p className="text-xs">
							{likeCount.min || "0"} - {likeCount.max || "∞"} 回
						</p>
					</div>
					<div className="p-3 bg-gray-100 rounded">
						<h4 className="font-medium text-sm mb-1">音声長</h4>
						<p className="text-xs">
							{duration.min || "0"} - {duration.max || "∞"} 秒
						</p>
					</div>
				</div>
			</div>
		);
	},
};
