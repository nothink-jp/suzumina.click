"use client";

import type { PriceHistory } from "@suzumina.click/shared-types";
import { useEffect, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface PriceHistoryChartProps {
	workId: string;
	className?: string;
}

interface ChartDataPoint {
	date: string;
	displayDate: string;
	price: number;
	originalPrice?: number;
	isOnSale: boolean;
}

export default function PriceHistoryChart({ workId, className }: PriceHistoryChartProps) {
	const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchPriceHistory = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/price-history/${workId}`);
				if (!response.ok) {
					throw new Error("価格履歴の取得に失敗しました");
				}

				const data = await response.json();
				setPriceHistory(data.priceHistory || []);
			} catch (err) {
				setError(err instanceof Error ? err.message : "エラーが発生しました");
			} finally {
				setLoading(false);
			}
		};

		if (workId) {
			fetchPriceHistory();
		}
	}, [workId]);

	// データをチャート用に変換
	const chartData: ChartDataPoint[] = priceHistory
		.map((point) => {
			const date = new Date(point.date);
			return {
				date: point.date,
				displayDate: date.toLocaleDateString("ja-JP", {
					month: "short",
					day: "numeric",
				}),
				price: point.price,
				originalPrice: point.originalPrice,
				isOnSale: !!(point.originalPrice && point.originalPrice > point.price),
			};
		})
		.reverse(); // 古い順に並び替え

	// カスタムツールチップ
	const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload as ChartDataPoint;
			const date = new Date(data.date);

			return (
				<div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
					<p className="text-sm text-gray-600 mb-1">
						{date.toLocaleDateString("ja-JP", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
					<p className="text-lg font-semibold text-gray-900">¥{data.price.toLocaleString()}</p>
					{data.originalPrice && data.originalPrice > data.price && (
						<p className="text-sm text-gray-500 line-through">
							元価格: ¥{data.originalPrice.toLocaleString()}
						</p>
					)}
					{data.isOnSale && <p className="text-sm text-red-600 font-medium">セール中</p>}
				</div>
			);
		}
		return null;
	};

	if (loading) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">価格推移</h3>
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">価格推移</h3>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<p className="text-red-600 mb-2">エラーが発生しました</p>
						<p className="text-sm text-gray-500">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	if (chartData.length === 0) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">価格推移</h3>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="mb-4 text-6xl opacity-20">📊</div>
						<p className="text-gray-600 mb-2">価格履歴データがありません</p>
						<p className="text-sm text-gray-500">データ収集開始後に価格推移が表示されます</p>
					</div>
				</div>
			</div>
		);
	}

	const hasMultipleDataPoints = chartData.length > 1;
	const currentPrice = chartData[chartData.length - 1]?.price;
	const firstPrice = chartData[0]?.price;
	const priceChange =
		hasMultipleDataPoints && currentPrice && firstPrice
			? ((currentPrice - firstPrice) / firstPrice) * 100
			: 0;

	return (
		<div className={`bg-white p-6 rounded-lg border ${className}`}>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">価格推移</h3>
				{hasMultipleDataPoints && (
					<div className="text-sm">
						<span className="text-gray-600">変動: </span>
						<span
							className={`font-medium ${
								priceChange > 0
									? "text-red-600"
									: priceChange < 0
										? "text-green-600"
										: "text-gray-600"
							}`}
						>
							{priceChange > 0 ? "+" : ""}
							{priceChange.toFixed(1)}%
						</span>
					</div>
				)}
			</div>

			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis
							dataKey="displayDate"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: "#6b7280" }}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: "#6b7280" }}
							tickFormatter={(value) => `¥${value.toLocaleString()}`}
						/>
						<Tooltip content={<CustomTooltip />} />

						{/* メイン価格ライン */}
						<Line
							type="monotone"
							dataKey="price"
							stroke="#ff4785"
							strokeWidth={2}
							dot={{ fill: "#ff4785", strokeWidth: 2, r: 4 }}
							activeDot={{ r: 6, fill: "#ff4785" }}
							name="現在価格"
						/>

						{/* 元価格ライン（セール時） */}
						<Line
							type="monotone"
							dataKey="originalPrice"
							stroke="#9ca3af"
							strokeWidth={1}
							strokeDasharray="5 5"
							dot={false}
							connectNulls={false}
							name="元価格"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			<div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
				<span>データポイント: {chartData.length}件</span>
				{chartData.length > 0 && (
					<span>
						最終更新:{" "}
						{new Date(chartData[chartData.length - 1]?.date || "").toLocaleDateString("ja-JP")}
					</span>
				)}
			</div>
		</div>
	);
}
