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

interface PriceHistoryChartProps {
	workId: string;
	className?: string;
}

interface TimeSeriesDataPoint {
	date: string;
	value: number;
	originalValue?: number | null;
	discount: number;
	isOnSale: boolean;
}

interface TimeSeriesResponse {
	workId: string;
	type: string;
	period: string;
	region: string;
	data: TimeSeriesDataPoint[];
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
	price: number;
	discount: number;
	isOnSale: boolean;
}

const REGIONS = [
	{ code: "JP", name: "日本", flag: "🇯🇵" },
	{ code: "US", name: "米国", flag: "🇺🇸" },
	{ code: "EU", name: "欧州", flag: "🇪🇺" },
	{ code: "CN", name: "中国", flag: "🇨🇳" },
	{ code: "TW", name: "台湾", flag: "🇹🇼" },
	{ code: "KR", name: "韓国", flag: "🇰🇷" },
] as const;

const PERIODS = [
	{ code: "7d", name: "7日" },
	{ code: "30d", name: "30日" },
	{ code: "90d", name: "90日" },
	{ code: "1y", name: "1年" },
	{ code: "all", name: "全期間" },
] as const;

export default function PriceHistoryChart({ workId, className }: PriceHistoryChartProps) {
	const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedRegion, setSelectedRegion] = useState<string>("JP");
	const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");

	useEffect(() => {
		const fetchTimeSeriesData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(
					`/api/timeseries/${workId}?type=price&region=${selectedRegion}&period=${selectedPeriod}`,
				);
				if (!response.ok) {
					throw new Error("時系列データの取得に失敗しました");
				}

				const data: TimeSeriesResponse = await response.json();
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
	}, [workId, selectedRegion, selectedPeriod]);

	// データをチャート用に変換
	const chartData: ChartDataPoint[] = timeSeriesData?.data
		? timeSeriesData.data.map((point) => {
				const date = new Date(point.date);
				return {
					date: point.date,
					displayDate: date.toLocaleDateString("ja-JP", {
						month: "short",
						day: "numeric",
					}),
					price: point.value,
					discount: point.discount,
					isOnSale: point.isOnSale,
				};
			})
		: [];

	// カスタムツールチップ
	// biome-ignore lint/suspicious/noExplicitAny: Recharts payload type requires any
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
					{data.discount > 0 && (
						<p className="text-sm text-red-600 font-medium">{data.discount}% OFF</p>
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
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">価格推移（6地域対応）</h3>
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
					<h3 className="text-lg font-semibold text-gray-900">価格推移（6地域対応）</h3>
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
					<h3 className="text-lg font-semibold text-gray-900">価格推移（6地域対応）</h3>
				</div>
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="mb-4 text-6xl opacity-20">📊</div>
						<p className="text-gray-600 mb-2">時系列データがありません</p>
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

	const selectedRegionInfo = REGIONS.find((r) => r.code === selectedRegion);

	return (
		<div className={`space-y-4 ${className}`}>
			{/* コントロールパネル */}
			<div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
				{/* 地域選択 */}
				<div className="flex-1">
					<div className="block text-sm font-medium text-gray-700 mb-2">地域選択</div>
					<div className="flex flex-wrap gap-2">
						{REGIONS.map((region) => (
							<Button
								key={region.code}
								variant={selectedRegion === region.code ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedRegion(region.code)}
								className="flex items-center gap-1"
							>
								<span>{region.flag}</span>
								<span className="hidden sm:inline">{region.name}</span>
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
						<h3 className="text-lg font-semibold text-gray-900">
							価格推移 - {selectedRegionInfo?.flag} {selectedRegionInfo?.name}
						</h3>
						{timeSeriesData?.metadata && (
							<p className="text-sm text-gray-500">
								{timeSeriesData.metadata.dataPoints}件のデータポイント
							</p>
						)}
					</div>
					{hasMultipleDataPoints && (
						<div className="text-right">
							<div className="text-sm text-gray-600">期間変動</div>
							<div
								className={`text-lg font-semibold ${
									priceChange > 0
										? "text-red-600"
										: priceChange < 0
											? "text-green-600"
											: "text-gray-600"
								}`}
							>
								{priceChange > 0 ? "+" : ""}
								{priceChange.toFixed(1)}%
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
								tickFormatter={(value) => `¥${value.toLocaleString()}`}
							/>
							<Tooltip content={<CustomTooltip />} />

							{/* メイン価格ライン */}
							<Line
								type="monotone"
								dataKey="price"
								stroke="#ff4785"
								strokeWidth={3}
								dot={{ fill: "#ff4785", strokeWidth: 2, r: 5 }}
								activeDot={{ r: 8, fill: "#ff4785" }}
								name="価格"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* 統計情報 */}
				{timeSeriesData?.metadata && (
					<div className="mt-4 p-3 bg-gray-50 rounded-lg">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="text-gray-600">現在価格:</span>
								<span className="ml-1 font-semibold">¥{currentPrice?.toLocaleString()}</span>
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
