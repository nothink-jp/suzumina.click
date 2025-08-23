"use client";

import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { useId, useState } from "react";
import useSWR from "swr";
import { getRecentPriceHistory } from "@/actions/price-history";
import { error as logError } from "@/lib/logger";
import { PriceHistoryChart } from "./price-history-chart";
import { PriceStatistics } from "./price-statistics";

interface PriceHistoryProps {
	workId: string;
	className?: string;
}

type CurrencyOption = "JPY" | "USD" | "EUR" | "CNY" | "TWD" | "KRW";

const CURRENCY_OPTIONS: { value: CurrencyOption; label: string }[] = [
	{ value: "JPY", label: "¥ JPY (円)" },
	{ value: "USD", label: "$ USD (ドル)" },
	{ value: "EUR", label: "€ EUR (ユーロ)" },
	{ value: "CNY", label: "¥ CNY (人民元)" },
	{ value: "TWD", label: "$ TWD (台湾ドル)" },
	{ value: "KRW", label: "₩ KRW (ウォン)" },
];

async function fetchPriceHistory(workId: string): Promise<PriceHistoryDocument[]> {
	try {
		return await getRecentPriceHistory(workId);
	} catch (error) {
		logError("価格履歴取得エラー", error);
		throw error;
	}
}

export function PriceHistory({ workId, className = "" }: PriceHistoryProps) {
	const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>("JPY");
	const currencySelectId = useId();

	const {
		data: priceHistory,
		error,
		isLoading,
	} = useSWR(workId ? `price-history-${workId}` : null, () => fetchPriceHistory(workId), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		dedupingInterval: 5 * 60 * 1000, // 5分間は重複リクエストを防ぐ
	});

	if (error) {
		return (
			<div className={`text-center ${className}`}>
				<div className="rounded-lg bg-red-50 p-6">
					<div className="text-red-800 font-medium mb-2">価格履歴の読み込みに失敗しました</div>
					<div className="text-red-600 text-sm">
						{error.message || "不明なエラーが発生しました"}
					</div>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={`space-y-6 ${className}`}>
				{/* チャート部分のスケルトン */}
				<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />

				{/* 統計情報のスケルトン */}
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{["stat1", "stat2", "stat3", "stat4"].map((key) => (
						<div key={key} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
					))}
				</div>
				<div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
			</div>
		);
	}

	if (!priceHistory || priceHistory.length === 0) {
		return (
			<div className={`text-center ${className}`}>
				<div className="rounded-lg bg-gray-50 p-6">
					<div className="text-gray-600 font-medium mb-2">価格履歴データがありません</div>
					<div className="text-gray-500 text-sm">
						この作品の価格履歴がまだ収集されていないか、データが存在しません
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`space-y-6 ${className}`}>
			{/* コントロールパネル */}
			<div className="flex items-center gap-2">
				<label htmlFor={currencySelectId} className="text-sm font-medium text-gray-700">
					通貨:
				</label>
				<select
					id={currencySelectId}
					value={selectedCurrency}
					onChange={(e) => setSelectedCurrency(e.target.value as CurrencyOption)}
					className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					{CURRENCY_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			{/* 価格チャート */}
			<div className="rounded-lg border border-gray-200 p-4">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">価格推移チャート (最近90日間)</h3>
				<PriceHistoryChart
					priceHistory={priceHistory}
					currency={selectedCurrency}
					showDiscountPrices={true}
				/>
			</div>

			{/* 価格統計 */}
			<div className="rounded-lg border border-gray-200 p-4">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">価格統計情報</h3>
				<PriceStatistics priceHistory={priceHistory} currency={selectedCurrency} />
			</div>
		</div>
	);
}
