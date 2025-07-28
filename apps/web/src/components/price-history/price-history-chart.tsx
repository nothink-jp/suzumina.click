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
	regularPrice: number | null;
	discountPrice?: number;
	formattedDate: string;
	campaignActive: boolean;
}

// 通貨コードとロケールコードのマッピング
const CURRENCY_TO_LOCALE_MAP: Record<string, string> = {
	USD: "en_US",
	EUR: "de_DE",
	CNY: "zh_CN",
	TWD: "zh_TW",
	KRW: "ko_KR",
};

// 価格データを計算する関数
function calculatePricesForCurrency(
	history: PriceHistoryDocument,
	currency: string,
): { regularPrice: number; discountPrice?: number } {
	if (currency === "JPY") {
		if (history.price === null || history.officialPrice === null) {
			return { regularPrice: null as unknown as number, discountPrice: undefined };
		}
		return {
			regularPrice: history.officialPrice || history.price,
			discountPrice: history.discountRate > 0 ? history.price : undefined,
		};
	}

	const localeCode = CURRENCY_TO_LOCALE_MAP[currency];
	if (!localeCode) {
		return { regularPrice: null as unknown as number, discountPrice: undefined };
	}

	const salePrice = history.localePrice?.[localeCode];
	const officialPrice = history.localeOfficialPrice?.[localeCode];

	if (officialPrice === undefined) {
		return { regularPrice: null as unknown as number, discountPrice: undefined };
	}

	return {
		regularPrice: officialPrice,
		discountPrice: history.discountRate > 0 && salePrice !== undefined ? salePrice : undefined,
	};
}

// チャートデータポイントを作成する関数
function createChartDataPoint(
	dateStr: string,
	priceMap: Map<string, PriceHistoryDocument>,
	currency: string,
	lastValidData: { regularPrice: number; discountPrice?: number; campaignActive: boolean } | null,
): ChartDataPoint {
	const date = new Date(dateStr);
	const formattedDate = date.toLocaleDateString("ja-JP", {
		month: "short",
		day: "numeric",
	});

	const history = priceMap.get(dateStr);

	if (history) {
		// データがある場合
		const prices = calculatePricesForCurrency(history, currency);

		return {
			date: dateStr,
			regularPrice: prices.regularPrice,
			discountPrice: prices.discountPrice,
			formattedDate,
			campaignActive: !!history.campaignId,
		};
	}

	// データがない日は前日の値を維持（またはnull）
	if (lastValidData) {
		return {
			date: dateStr,
			regularPrice: lastValidData.regularPrice,
			discountPrice: lastValidData.discountPrice,
			formattedDate,
			campaignActive: lastValidData.campaignActive,
		};
	}

	// まだ有効なデータがない場合はnullを設定
	return {
		date: dateStr,
		regularPrice: null as unknown as number, // Rechartsはnullをギャップとして扱う
		discountPrice: undefined,
		formattedDate,
		campaignActive: false,
	};
}

export function PriceHistoryChart({
	priceHistory,
	currency = "JPY",
	showDiscountPrices = true,
	className = "",
}: PriceHistoryChartProps) {
	const chartData = useMemo<ChartDataPoint[]>(() => {
		if (priceHistory.length === 0) return [];

		// 価格履歴データをマップに変換
		const priceMap = new Map<string, PriceHistoryDocument>();
		priceHistory.forEach((history) => {
			priceMap.set(history.date, history);
		});

		// 最初と最後の日付を取得
		const dates = priceHistory.map((h) => h.date).sort();
		if (dates.length === 0) return [];

		const firstDate = dates[0];
		const lastDate = dates[dates.length - 1];
		if (!firstDate || !lastDate) return [];

		const startDate = new Date(firstDate);
		const endDate = new Date(lastDate);

		// 連続した日付の配列を作成
		const allDates: string[] = [];
		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const dateStr = currentDate.toISOString().split("T")[0];
			if (dateStr) {
				allDates.push(dateStr);
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}

		// 各日付のデータを生成（データがない日はnullを設定）
		let lastValidData: {
			regularPrice: number;
			discountPrice?: number;
			campaignActive: boolean;
		} | null = null;

		return allDates.map((dateStr) => {
			const dataPoint = createChartDataPoint(dateStr, priceMap, currency, lastValidData);
			// lastValidDataを更新
			const history = priceMap.get(dateStr);
			if (history) {
				const prices = calculatePricesForCurrency(history, currency);
				lastValidData = {
					regularPrice: prices.regularPrice,
					discountPrice: prices.discountPrice,
					campaignActive: !!history.campaignId,
				};
			}
			return dataPoint;
		});
	}, [priceHistory, currency]);

	const { minPrice, maxPrice } = useMemo(() => {
		if (chartData.length === 0) {
			return { minPrice: 0, maxPrice: 1000 };
		}

		// null以外の価格を抽出
		const validPrices = chartData
			.flatMap((d) => [d.regularPrice, ...(d.discountPrice ? [d.discountPrice] : [])])
			.filter((price): price is number => price !== null && price !== undefined);

		if (validPrices.length === 0) {
			return { minPrice: 0, maxPrice: 1000 };
		}

		const max = Math.max(...validPrices);

		// チャート表示用に上部に余白を追加
		const padding = max * 0.1;
		return {
			minPrice: 0, // 常に0起算
			maxPrice: Math.ceil(max + padding), // 整数に切り上げ
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
						tickFormatter={(value) => {
							// 日本円の場合は整数のみ表示
							if (currency === "JPY") {
								const intValue = Math.round(value);
								return `¥${intValue.toLocaleString()}`;
							}
							return formatPrice(value);
						}}
						// 通貨に応じてtickを設定
						ticks={(() => {
							if (currency === "JPY") {
								// 日本円の場合は100円単位
								return Array.from(
									{ length: Math.ceil(maxPrice / 100) + 1 },
									(_, i) => i * 100,
								).filter((tick) => tick <= maxPrice);
							}
							if (currency === "KRW") {
								// ウォンの場合は1000単位
								return Array.from(
									{ length: Math.ceil(maxPrice / 1000) + 1 },
									(_, i) => i * 1000,
								).filter((tick) => tick <= maxPrice);
							}
							// その他の通貨は自動計算
							return undefined;
						})()}
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
						connectNulls={false}
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

					{/* キャンペーン開始日の参照線（オプション） */}
					{priceHistory
						.filter((h, index) => {
							// キャンペーンが新しく開始された日をマーク
							if (index === 0) return h.campaignId !== undefined;
							const prevHistory = priceHistory[index - 1];
							return (
								h.campaignId !== undefined && prevHistory && prevHistory.campaignId === undefined
							);
						})
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
