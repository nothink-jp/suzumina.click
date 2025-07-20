import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { calculatePriceStatistics } from "@/lib/price-history-utils";

interface PriceStatisticsProps {
	priceHistory: PriceHistoryDocument[];
	currency?: "JPY" | "USD" | "EUR" | "CNY" | "TWD" | "KRW";
	className?: string;
}

export function PriceStatistics({
	priceHistory,
	currency = "JPY",
	className = "",
}: PriceStatisticsProps) {
	if (priceHistory.length === 0) {
		return <div className={`text-gray-500 ${className}`}>価格統計データがありません</div>;
	}

	const formatPrice = (value: number) => {
		if (currency === "JPY") {
			return `¥${value.toLocaleString()}`;
		}
		return `${value.toLocaleString()} ${currency}`;
	};

	// 価格統計を計算
	const stats = calculatePriceStatistics(priceHistory);
	const { minPrice, maxPrice, currentPrice, avgPrice, priceChangeCount, campaignCount } = stats;

	// 現在セール中かどうか
	const currentRecord = priceHistory[priceHistory.length - 1];
	const isCurrentlyOnSale = currentRecord?.discountPrice !== undefined;
	const currentSalePrice = currentRecord?.discountPrice;
	const currentDiscountRate = currentRecord?.discountRate || 0;

	return (
		<div className={`grid grid-cols-2 gap-4 sm:grid-cols-4 ${className}`}>
			{/* 現在価格 */}
			<div className="rounded-lg bg-blue-50 p-4">
				<div className="text-sm font-medium text-blue-600">現在価格</div>
				<div className="text-lg font-bold text-blue-900">{formatPrice(currentPrice)}</div>
				{isCurrentlyOnSale && currentSalePrice && (
					<div className="mt-1">
						<div className="text-sm font-semibold text-red-600">
							セール価格: {formatPrice(currentSalePrice)}
						</div>
						<div className="text-xs text-red-500">{currentDiscountRate}% OFF</div>
					</div>
				)}
			</div>

			{/* 最安価格 */}
			<div className="rounded-lg bg-green-50 p-4">
				<div className="text-sm font-medium text-green-600">最安価格</div>
				<div className="text-lg font-bold text-green-900">{formatPrice(minPrice)}</div>
			</div>

			{/* 最高価格 */}
			<div className="rounded-lg bg-orange-50 p-4">
				<div className="text-sm font-medium text-orange-600">最高価格</div>
				<div className="text-lg font-bold text-orange-900">{formatPrice(maxPrice)}</div>
			</div>

			{/* 平均価格 */}
			<div className="rounded-lg bg-gray-50 p-4">
				<div className="text-sm font-medium text-gray-600">平均価格</div>
				<div className="text-lg font-bold text-gray-900">{formatPrice(avgPrice)}</div>
			</div>

			{/* 追加統計情報 */}
			<div className="col-span-2 rounded-lg bg-purple-50 p-4 sm:col-span-4">
				<div className="text-sm font-medium text-purple-600 mb-2">価格履歴統計</div>
				<div className="flex flex-wrap gap-4 text-sm">
					<div className="flex items-center gap-1">
						<span className="text-purple-700">データ期間:</span>
						<span className="font-medium">{stats.totalDataPoints}日間</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-purple-700">価格変更:</span>
						<span className="font-medium">{priceChangeCount}回</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-purple-700">キャンペーン:</span>
						<span className="font-medium">{campaignCount}回</span>
					</div>
					{isCurrentlyOnSale && (
						<div className="flex items-center gap-1">
							<span className="inline-block h-2 w-2 rounded-full bg-red-500" />
							<span className="font-medium text-red-600">セール中</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
