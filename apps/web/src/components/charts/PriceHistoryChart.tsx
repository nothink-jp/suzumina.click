"use client";

import type { PriceHistoryPoint } from "@suzumina.click/shared-types/src/time-series-data";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface PriceHistoryChartProps {
	data: PriceHistoryPoint[];
	title?: string;
}

interface ChartDataPoint {
	date: string;
	currentPrice: number;
	originalPrice?: number;
	displayDate: string;
	isOnSale: boolean;
}

export default function PriceHistoryChart({ data, title }: PriceHistoryChartProps) {
	// データを変換
	const chartData: ChartDataPoint[] = data.map((point) => ({
		date: point.date,
		currentPrice: point.currentPrice,
		originalPrice: point.originalPrice,
		displayDate: new Date(point.date).toLocaleDateString("ja-JP", {
			month: "short",
			day: "numeric",
		}),
		isOnSale: Boolean(point.discountRate && point.discountRate > 0),
	}));

	// 価格の範囲を計算
	const prices = data.flatMap((point) => [
		point.currentPrice,
		point.originalPrice || point.currentPrice,
	]);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	const padding = (maxPrice - minPrice) * 0.1;

	const formatPrice = (value: number) => `¥${value.toLocaleString()}`;

	const formatTooltip = (value: number, name: string) => {
		if (name === "currentPrice") {
			return [formatPrice(value), "現在価格"];
		}
		if (name === "originalPrice") {
			return [formatPrice(value), "定価"];
		}
		return [formatPrice(value), name];
	};

	const formatTooltipLabel = (label: string) => {
		const point = chartData.find((p) => p.displayDate === label);
		if (point) {
			return new Date(point.date).toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		}
		return label;
	};

	if (data.length === 0) {
		return (
			<div className="text-center text-gray-500 py-8">
				<p>価格履歴データがありません</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

			<div className="h-80">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis dataKey="displayDate" tick={{ fontSize: 12 }} stroke="#666" />
						<YAxis
							domain={[minPrice - padding, maxPrice + padding]}
							tickFormatter={formatPrice}
							tick={{ fontSize: 12 }}
							stroke="#666"
						/>
						<Tooltip
							formatter={formatTooltip}
							labelFormatter={formatTooltipLabel}
							contentStyle={{
								backgroundColor: "#fff",
								border: "1px solid #e5e7eb",
								borderRadius: "6px",
								boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
							}}
						/>

						{/* 定価ライン */}
						<Line
							type="monotone"
							dataKey="originalPrice"
							stroke="#94a3b8"
							strokeWidth={2}
							strokeDasharray="5 5"
							dot={false}
							connectNulls={false}
							name="定価"
						/>

						{/* 現在価格ライン */}
						<Line
							type="monotone"
							dataKey="currentPrice"
							stroke="#ff4785"
							strokeWidth={3}
							dot={{ fill: "#ff4785", strokeWidth: 2, r: 4 }}
							activeDot={{ r: 6, stroke: "#ff4785", strokeWidth: 2 }}
							name="現在価格"
						/>

						{/* セール期間の参考線 */}
						{chartData.some((point) => point.isOnSale) && (
							<ReferenceLine
								y={Math.min(...prices)}
								stroke="#ef4444"
								strokeDasharray="2 2"
								label={{ value: "セール価格", position: "insideTopRight" }}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* 凡例 */}
			<div className="flex items-center justify-center gap-6 text-sm">
				<div className="flex items-center gap-2">
					<div className="w-4 h-0.5 bg-suzuka-500" />
					<span>現在価格</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400" />
					<span>定価</span>
				</div>
			</div>
		</div>
	);
}
