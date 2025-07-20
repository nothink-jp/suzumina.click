"use client";

import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { useMemo } from "react";
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
	priceHistory: PriceHistoryDocument[];
	currency?: "JPY" | "USD" | "EUR" | "CNY" | "TWD" | "KRW";
	showDiscountPrices?: boolean;
	className?: string;
}

interface ChartDataPoint {
	date: string;
	regularPrice: number;
	discountPrice?: number;
	formattedDate: string;
	campaignActive: boolean;
}

export function PriceHistoryChart({
	priceHistory,
	currency = "JPY",
	showDiscountPrices = true,
	className = "",
}: PriceHistoryChartProps) {
	const chartData = useMemo<ChartDataPoint[]>(() => {
		return priceHistory.map((history) => {
			const date = new Date(history.date);
			const formattedDate = date.toLocaleDateString("ja-JP", {
				month: "short",
				day: "numeric",
			});

			return {
				date: history.date,
				regularPrice: history.regularPrice,
				discountPrice: history.discountPrice,
				formattedDate,
				campaignActive: !!history.campaignId,
			};
		});
	}, [priceHistory]);

	const { minPrice, maxPrice } = useMemo(() => {
		if (chartData.length === 0) {
			return { minPrice: 0, maxPrice: 1000 };
		}

		const allPrices = chartData.flatMap((d) => [
			d.regularPrice,
			...(d.discountPrice ? [d.discountPrice] : []),
		]);

		const min = Math.min(...allPrices);
		const max = Math.max(...allPrices);

		// チャート表示用に上下に余白を追加
		const padding = (max - min) * 0.1;
		return {
			minPrice: Math.max(0, min - padding),
			maxPrice: max + padding,
		};
	}, [chartData]);

	const formatPrice = (value: number) => {
		if (currency === "JPY") {
			return `¥${value.toLocaleString()}`;
		}
		return `${value.toLocaleString()} ${currency}`;
	};

	const formatTooltipPrice = (value: unknown, name: string) => {
		if (value === undefined || value === null) return ["-", name];
		const numValue = Number(value);
		if (Number.isNaN(numValue)) return ["-", name];
		return [formatPrice(numValue), name];
	};

	if (chartData.length === 0) {
		return (
			<div className={`flex h-64 items-center justify-center text-gray-500 ${className}`}>
				価格履歴データがありません
			</div>
		);
	}

	return (
		<div className={`h-64 w-full ${className}`}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={chartData}
					margin={{
						top: 20,
						right: 30,
						left: 20,
						bottom: 5,
					}}
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
					<XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} stroke="#6b7280" />
					<YAxis
						domain={[minPrice, maxPrice]}
						tick={{ fontSize: 12 }}
						stroke="#6b7280"
						tickFormatter={formatPrice}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "white",
							border: "1px solid #e5e7eb",
							borderRadius: "8px",
							boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
						}}
						formatter={formatTooltipPrice}
						labelFormatter={(label, payload) => {
							if (payload?.[0]) {
								const data = payload[0].payload as ChartDataPoint;
								return `${data.date} (${label})`;
							}
							return label;
						}}
					/>

					{/* 定価ライン */}
					<Line
						type="monotone"
						dataKey="regularPrice"
						stroke="#3b82f6"
						strokeWidth={2}
						dot={{ r: 3, fill: "#3b82f6" }}
						activeDot={{ r: 5, fill: "#3b82f6" }}
						name="定価"
					/>

					{/* セール価格ライン */}
					{showDiscountPrices && (
						<Line
							type="monotone"
							dataKey="discountPrice"
							stroke="#ef4444"
							strokeWidth={2}
							strokeDasharray="5 5"
							dot={{ r: 3, fill: "#ef4444" }}
							activeDot={{ r: 5, fill: "#ef4444" }}
							name="セール価格"
							connectNulls={false}
						/>
					)}

					{/* 価格変更があった日の参照線（オプション） */}
					{priceHistory
						.filter((h) => h.priceChanged)
						.map((h) => (
							<ReferenceLine
								key={h.date}
								x={new Date(h.date).toLocaleDateString("ja-JP", {
									month: "short",
									day: "numeric",
								})}
								stroke="#fbbf24"
								strokeDasharray="2 2"
								opacity={0.6}
							/>
						))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
