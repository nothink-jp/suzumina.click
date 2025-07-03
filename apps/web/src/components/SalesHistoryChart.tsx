"use client";

import type { RankingInfo, SalesHistory } from "@suzumina.click/shared-types";
import { useEffect, useState } from "react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface SalesHistoryChartProps {
	workId: string;
	className?: string;
}

interface ChartDataPoint {
	date: string;
	displayDate: string;
	salesCount: number;
	dailyAverage?: number;
	rankingPosition?: number;
	// ランキング表示用（Y軸が逆転するため）
	invertedRank?: number;
}

export default function SalesHistoryChart({ workId, className }: SalesHistoryChartProps) {
	const [salesHistory, setSalesHistory] = useState<SalesHistory[]>([]);
	const [rankingHistory, setRankingHistory] = useState<RankingInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchSalesHistory = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`/api/sales-history/${workId}`);
				if (!response.ok) {
					throw new Error("販売履歴の取得に失敗しました");
				}

				const data = await response.json();
				setSalesHistory(data.salesHistory || []);
				setRankingHistory(data.rankingHistory || []);
			} catch (err) {
				console.error("Sales history fetch error:", err);
				setError(err instanceof Error ? err.message : "エラーが発生しました");
			} finally {
				setLoading(false);
			}
		};

		if (workId) {
			fetchSalesHistory();
		}
	}, [workId]);

	// データをチャート用に変換
	const chartData: ChartDataPoint[] = salesHistory
		.map((point) => {
			const date = new Date(point.date);
			return {
				date: point.date,
				displayDate: date.toLocaleDateString("ja-JP", {
					month: "short",
					day: "numeric",
				}),
				salesCount: point.salesCount,
				dailyAverage: point.dailyAverage,
				rankingPosition: point.rankingPosition,
				// ランキング表示用（小さい数字が上位なので反転）
				invertedRank: point.rankingPosition ? Math.max(0, 1000 - point.rankingPosition) : undefined,
			};
		})
		.reverse(); // 古い順に並び替え

	// カスタムツールチップ
	const CustomTooltip = ({ active, payload, label }: any) => {
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
					<p className="text-lg font-semibold text-gray-900">
						販売数: {data.salesCount.toLocaleString()}本
					</p>
					{data.dailyAverage && (
						<p className="text-sm text-gray-500">日平均: {data.dailyAverage.toLocaleString()}本</p>
					)}
					{data.rankingPosition && (
						<p className="text-sm text-minase-600 font-medium">
							ランキング: {data.rankingPosition}位
						</p>
					)}
				</div>
			);
		}
		return null;
	};

	if (loading) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">販売推移</h3>
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<h3 className="text-lg font-semibold text-gray-900 mb-4">販売推移</h3>
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
				<h3 className="text-lg font-semibold text-gray-900 mb-4">販売推移</h3>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="mb-4 text-6xl opacity-20">📈</div>
						<p className="text-gray-600 mb-2">販売履歴データがありません</p>
						<p className="text-sm text-gray-500">データ収集開始後に販売推移が表示されます</p>
					</div>
				</div>
			</div>
		);
	}

	const hasMultipleDataPoints = chartData.length > 1;
	const currentSales = chartData[chartData.length - 1]?.salesCount;
	const firstSales = chartData[0]?.salesCount;
	const salesGrowth =
		hasMultipleDataPoints && currentSales && firstSales ? currentSales - firstSales : 0;

	return (
		<div className={`bg-white p-6 rounded-lg border ${className}`}>
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold text-gray-900">販売推移</h3>
				{hasMultipleDataPoints && (
					<div className="text-sm">
						<span className="text-gray-600">成長: </span>
						<span
							className={`font-medium ${
								salesGrowth > 0
									? "text-green-600"
									: salesGrowth < 0
										? "text-red-600"
										: "text-gray-600"
							}`}
						>
							{salesGrowth > 0 ? "+" : ""}
							{salesGrowth.toLocaleString()}本
						</span>
					</div>
				)}
			</div>

			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis
							dataKey="displayDate"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: "#6b7280" }}
						/>
						<YAxis
							yAxisId="sales"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: "#6b7280" }}
							tickFormatter={(value) => `${value.toLocaleString()}本`}
						/>
						<YAxis
							yAxisId="ranking"
							orientation="right"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 12, fill: "#ff7e2d" }}
							tickFormatter={(value) => `${Math.max(0, 1000 - value)}位`}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Legend />

						{/* 販売数ライン */}
						<Line
							yAxisId="sales"
							type="monotone"
							dataKey="salesCount"
							stroke="#ff4785"
							strokeWidth={2}
							dot={{ fill: "#ff4785", strokeWidth: 2, r: 4 }}
							activeDot={{ r: 6, fill: "#ff4785" }}
							name="販売数"
						/>

						{/* ランキング位置バー（反転） */}
						<Bar
							yAxisId="ranking"
							dataKey="invertedRank"
							fill="#ff7e2d"
							fillOpacity={0.6}
							name="ランキング"
						/>
					</ComposedChart>
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
