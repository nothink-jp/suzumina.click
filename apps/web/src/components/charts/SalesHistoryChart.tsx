"use client";

import type {
	RankingHistoryPoint,
	SalesHistoryPoint,
} from "@suzumina.click/shared-types/src/time-series-data";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
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
	salesData?: SalesHistoryPoint[];
	rankingData?: RankingHistoryPoint[];
	title?: string;
	type?: "sales" | "ranking" | "combined";
}

interface ChartDataPoint {
	date: string;
	totalSales?: number;
	periodSales?: number;
	rank?: number;
	displayDate: string;
	category?: string;
}

export default function SalesHistoryChart({
	salesData = [],
	rankingData = [],
	title,
	type = "combined",
}: SalesHistoryChartProps) {
	// データを統合
	const allDates = Array.from(
		new Set([...salesData.map((d) => d.date), ...rankingData.map((d) => d.date)]),
	).sort();

	const chartData: ChartDataPoint[] = allDates.map((date) => {
		const salesPoint = salesData.find((s) => s.date === date);
		const rankingPoint = rankingData.find((r) => r.date === date);

		return {
			date,
			totalSales: salesPoint?.totalSales,
			periodSales: salesPoint?.periodSales,
			rank: rankingPoint?.rank,
			displayDate: new Date(date).toLocaleDateString("ja-JP", {
				month: "short",
				day: "numeric",
			}),
			category: rankingPoint?.category || "全体",
		};
	});

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

	const formatSales = (value: number) => `${value.toLocaleString()}本`;
	const formatRank = (value: number) => `${value}位`;

	if (chartData.length === 0) {
		return (
			<div className="text-center text-gray-500 py-8">
				<p>販売履歴データがありません</p>
			</div>
		);
	}

	// 販売数のみのチャート
	if (type === "sales") {
		return (
			<div className="space-y-4">
				{title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis dataKey="displayDate" tick={{ fontSize: 12 }} stroke="#666" />
							<YAxis tickFormatter={formatSales} tick={{ fontSize: 12 }} stroke="#666" />
							<Tooltip
								formatter={(value: number, name: string) => [
									name === "totalSales" ? formatSales(value) : formatSales(value),
									name === "totalSales" ? "累計販売数" : "期間販売数",
								]}
								labelFormatter={formatTooltipLabel}
								contentStyle={{
									backgroundColor: "#fff",
									border: "1px solid #e5e7eb",
									borderRadius: "6px",
									boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
								}}
							/>
							<Area
								type="monotone"
								dataKey="totalSales"
								stackId="1"
								stroke="#ff7e2d"
								fill="#ff7e2d"
								fillOpacity={0.3}
								name="累計販売数"
							/>
							{salesData.some((d) => d.periodSales !== undefined) && (
								<Area
									type="monotone"
									dataKey="periodSales"
									stackId="2"
									stroke="#10b981"
									fill="#10b981"
									fillOpacity={0.3}
									name="期間販売数"
								/>
							)}
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>
		);
	}

	// ランキングのみのチャート
	if (type === "ranking") {
		const maxRank = Math.max(...rankingData.map((d) => d.rank || 0));

		return (
			<div className="space-y-4">
				{title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

				<div className="h-80">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
							<XAxis dataKey="displayDate" tick={{ fontSize: 12 }} stroke="#666" />
							<YAxis
								domain={[0, maxRank + 5]}
								tickFormatter={formatRank}
								tick={{ fontSize: 12 }}
								stroke="#666"
								reversed
							/>
							<Tooltip
								formatter={(value: number) => [formatRank(value), "ランキング"]}
								labelFormatter={formatTooltipLabel}
								contentStyle={{
									backgroundColor: "#fff",
									border: "1px solid #e5e7eb",
									borderRadius: "6px",
									boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
								}}
							/>
							<Bar dataKey="rank" fill="#6366f1" name="ランキング" radius={[2, 2, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		);
	}

	// 複合チャート（販売数 + ランキング）
	return (
		<div className="space-y-4">
			{title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}

			<div className="h-80">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis dataKey="displayDate" tick={{ fontSize: 12 }} stroke="#666" />
						<YAxis
							yAxisId="sales"
							orientation="left"
							tickFormatter={formatSales}
							tick={{ fontSize: 12 }}
							stroke="#ff7e2d"
						/>
						<YAxis
							yAxisId="rank"
							orientation="right"
							tickFormatter={formatRank}
							tick={{ fontSize: 12 }}
							stroke="#6366f1"
							reversed
						/>
						<Tooltip
							formatter={(value: number, name: string) => {
								if (name === "totalSales") return [formatSales(value), "累計販売数"];
								if (name === "rank") return [formatRank(value), "ランキング"];
								return [value, name];
							}}
							labelFormatter={formatTooltipLabel}
							contentStyle={{
								backgroundColor: "#fff",
								border: "1px solid #e5e7eb",
								borderRadius: "6px",
								boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
							}}
						/>
						<Legend />

						{/* 販売数エリア */}
						<Area
							yAxisId="sales"
							type="monotone"
							dataKey="totalSales"
							fill="#ff7e2d"
							fillOpacity={0.3}
							stroke="#ff7e2d"
							strokeWidth={2}
							name="累計販売数"
						/>

						{/* ランキングライン */}
						<Line
							yAxisId="rank"
							type="monotone"
							dataKey="rank"
							stroke="#6366f1"
							strokeWidth={3}
							dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
							activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2 }}
							name="ランキング"
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{/* 凡例 */}
			<div className="flex items-center justify-center gap-6 text-sm">
				<div className="flex items-center gap-2">
					<div className="w-4 h-0.5 bg-minase-500" />
					<span>累計販売数 (左軸)</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-0.5 bg-indigo-500" />
					<span>ランキング (右軸)</span>
				</div>
			</div>
		</div>
	);
}
