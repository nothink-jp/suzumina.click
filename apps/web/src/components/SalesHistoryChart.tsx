"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
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

interface SalesHistoryChartProps {
	workId: string;
	className?: string;
}

interface SalesTimeSeriesDataPoint {
	date: string;
	value: number;
	change?: number | null;
}

interface RankingTimeSeriesDataPoint {
	date: string;
	daily: number | null;
	weekly: number | null;
	monthly: number | null;
}

interface SalesTimeSeriesResponse {
	workId: string;
	type: "sales" | "ranking";
	period: string;
	data: SalesTimeSeriesDataPoint[] | RankingTimeSeriesDataPoint[];
	metadata: {
		dataPoints: number;
		startDate: string;
		endDate: string;
		lastUpdated: string | null;
	};
}

interface ChartDataPoint {
	date: string;
	displayDate: string;
	value: number;
	change?: number;
}

const PERIODS = [
	{ code: "7d", name: "7日" },
	{ code: "30d", name: "30日" },
	{ code: "90d", name: "90日" },
	{ code: "1y", name: "1年" },
	{ code: "all", name: "全期間" },
] as const;

const CHART_TYPES = [
	{ code: "sales", name: "販売数", color: "#22c55e" },
	{ code: "ranking", name: "ランキング", color: "#3b82f6" },
] as const;

export default function SalesHistoryChart({ workId, className }: SalesHistoryChartProps) {
	const [timeSeriesData, setTimeSeriesData] = useState<SalesTimeSeriesResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
	const [selectedType, setSelectedType] = useState<"sales" | "ranking">("sales");

	useEffect(() => {
		const fetchTimeSeriesData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/timeseries/${workId}?type=${selectedType}&period=${selectedPeriod}`,
				);
				if (!response.ok) {
					throw new Error("時系列データの取得に失敗しました");
				}

				const data: SalesTimeSeriesResponse = await response.json();
				setTimeSeriesData(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "エラーが発生しました");
			} finally {
				setLoading(false);
			}
		};

		if (workId) {
			fetchTimeSeriesData();
		}
	}, [workId, selectedType, selectedPeriod]);

	// データをチャート用に変換
	const chartData: ChartDataPoint[] = timeSeriesData?.data
		? timeSeriesData.data.map((point) => {
				const date = new Date(point.date);
				if (selectedType === "sales") {
					const salesPoint = point as SalesTimeSeriesDataPoint;
					return {
						date: point.date,
						displayDate: date.toLocaleDateString("ja-JP", {
							month: "short",
							day: "numeric",
						}),
						value: salesPoint.value,
						change: salesPoint.change || undefined,
					};
				}
				const rankingPoint = point as RankingTimeSeriesDataPoint;
				return {
					date: point.date,
					displayDate: date.toLocaleDateString("ja-JP", {
						month: "short",
						day: "numeric",
					}),
					value: rankingPoint.daily || rankingPoint.weekly || rankingPoint.monthly || 999,
				};
			})
		: [];

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
					{selectedType === "sales" ? (
						<>
							<p className="text-lg font-semibold text-gray-900">{data.value.toLocaleString()}本</p>
							{data.change && data.change !== 0 && (
								<p
									className={`text-sm font-medium ${data.change > 0 ? "text-green-600" : "text-red-600"}`}
								>
									{data.change > 0 ? "+" : ""}
									{data.change.toLocaleString()}本
								</p>
							)}
						</>
					) : (
						<>
							<p className="text-lg font-semibold text-blue-600">#{data.value}位</p>
							<p className="text-sm text-gray-500">日次ランキング</p>
						</>
					)}
				</div>
			);
		}
		return null;
	};

	if (loading) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">販売・ランキング推移</h3>
				</div>
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`bg-white p-6 rounded-lg border ${className}`}>
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">販売・ランキング推移</h3>
				</div>
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
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">販売・ランキング推移</h3>
				</div>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="mb-4 text-6xl opacity-20">📈</div>
						<p className="text-gray-600 mb-2">時系列データがありません</p>
						<p className="text-sm text-gray-500">データ収集開始後に推移が表示されます</p>
					</div>
				</div>
			</div>
		);
	}

	const hasMultipleDataPoints = chartData.length > 1;
	const currentValue = chartData[chartData.length - 1]?.value;
	const firstValue = chartData[0]?.value;
	const selectedTypeInfo = CHART_TYPES.find((t) => t.code === selectedType);

	let changeText = "";
	if (hasMultipleDataPoints && currentValue !== undefined && firstValue !== undefined) {
		if (selectedType === "sales") {
			const salesIncrease = currentValue - firstValue;
			if (salesIncrease > 0) {
				changeText = `+${salesIncrease.toLocaleString()}本`;
			} else if (salesIncrease < 0) {
				changeText = `${salesIncrease.toLocaleString()}本`;
			}
		} else {
			// ランキングは数値が小さいほど良い
			const rankChange = firstValue - currentValue;
			if (rankChange > 0) {
				changeText = `↑${rankChange}位上昇`;
			} else if (rankChange < 0) {
				changeText = `↓${Math.abs(rankChange)}位下降`;
			}
		}
	}

	return (
		<div className={`space-y-4 ${className}`}>
			{/* コントロールパネル */}
			<div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
				{/* データ種別選択 */}
				<div className="flex-1">
					<div className="block text-sm font-medium text-gray-700 mb-2">データ種別</div>
					<div className="flex gap-2">
						{CHART_TYPES.map((type) => (
							<Button
								key={type.code}
								variant={selectedType === type.code ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedType(type.code as "sales" | "ranking")}
							>
								{type.name}
							</Button>
						))}
					</div>
				</div>

				{/* 期間選択 */}
				<div className="flex-1">
					<div className="block text-sm font-medium text-gray-700 mb-2">期間選択</div>
					<div className="flex gap-2">
						{PERIODS.map((period) => (
							<Button
								key={period.code}
								variant={selectedPeriod === period.code ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedPeriod(period.code)}
							>
								{period.name}
							</Button>
						))}
					</div>
				</div>
			</div>

			{/* チャート */}
			<div className="bg-white p-6 rounded-lg border">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">{selectedTypeInfo?.name}推移</h3>
						{timeSeriesData?.metadata && (
							<p className="text-sm text-gray-500">
								{timeSeriesData.metadata.dataPoints}件のデータポイント
							</p>
						)}
					</div>
					{hasMultipleDataPoints && changeText && (
						<div className="text-right">
							<div className="text-sm text-gray-600">期間変化</div>
							<div
								className={`text-lg font-semibold ${
									selectedType === "sales"
										? currentValue && firstValue && currentValue > firstValue
											? "text-green-600"
											: "text-gray-600"
										: currentValue && firstValue && currentValue < firstValue
											? "text-green-600"
											: "text-red-600"
								}`}
							>
								{changeText}
							</div>
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
								tickFormatter={(value) =>
									selectedType === "sales" ? `${value.toLocaleString()}本` : `#${value}`
								}
								reversed={selectedType === "ranking"} // ランキングは数値が小さいほど上位
							/>
							<Tooltip content={<CustomTooltip />} />

							{/* メインライン */}
							<Line
								type="monotone"
								dataKey="value"
								stroke={selectedTypeInfo?.color || "#3b82f6"}
								strokeWidth={3}
								dot={{ fill: selectedTypeInfo?.color || "#3b82f6", strokeWidth: 2, r: 5 }}
								activeDot={{ r: 8, fill: selectedTypeInfo?.color || "#3b82f6" }}
								name={selectedTypeInfo?.name || "値"}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* 統計情報 */}
				{timeSeriesData?.metadata && (
					<div className="mt-4 p-3 bg-gray-50 rounded-lg">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="text-gray-600">現在値:</span>
								<span className="ml-1 font-semibold">
									{selectedType === "sales"
										? `${currentValue?.toLocaleString()}本`
										: `#${currentValue}位`}
								</span>
							</div>
							<div>
								<span className="text-gray-600">データ期間:</span>
								<span className="ml-1 font-semibold">
									{new Date(timeSeriesData.metadata.startDate).toLocaleDateString("ja-JP")} -
									{new Date(timeSeriesData.metadata.endDate).toLocaleDateString("ja-JP")}
								</span>
							</div>
							<div>
								<span className="text-gray-600">データ数:</span>
								<span className="ml-1 font-semibold">{timeSeriesData.metadata.dataPoints}件</span>
							</div>
							{timeSeriesData.metadata.lastUpdated && (
								<div>
									<span className="text-gray-600">最終更新:</span>
									<span className="ml-1 font-semibold">
										{new Date(timeSeriesData.metadata.lastUpdated).toLocaleDateString("ja-JP")}
									</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
