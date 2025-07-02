import type {
	PriceHistoryPoint,
	RankingHistoryPoint,
	SalesHistoryPoint,
} from "@suzumina.click/shared-types/src/time-series-data";

/**
 * モック価格履歴データを生成
 */
export function generateMockPriceHistory(_workId: string): PriceHistoryPoint[] {
	const basePrice = 1000 + Math.floor(Math.random() * 2000); // 1000-3000円
	const data: PriceHistoryPoint[] = [];
	const now = new Date();

	// 過去6ヶ月のデータを生成
	for (let i = 180; i >= 0; i -= 15) {
		// 2週間間隔
		const date = new Date(now);
		date.setDate(date.getDate() - i);

		// セール期間をランダムに設定
		const isOnSale = Math.random() < 0.3; // 30%の確率でセール
		const discountRate = isOnSale ? 10 + Math.floor(Math.random() * 30) : 0; // 10-40%割引
		const currentPrice = isOnSale ? Math.floor(basePrice * (1 - discountRate / 100)) : basePrice;

		data.push({
			date: date.toISOString(),
			fetchedAt: date.toISOString(),
			source: "dlsite",
			currentPrice,
			originalPrice: basePrice,
			discountRate: discountRate > 0 ? discountRate : undefined,
			saleType: isOnSale ? "campaign" : undefined,
			saleEndDate: isOnSale
				? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
				: undefined,
			pointRate: 10, // 10%ポイント還元
		});
	}

	return data;
}

/**
 * モック販売履歴データを生成
 */
export function generateMockSalesHistory(_workId: string): SalesHistoryPoint[] {
	const data: SalesHistoryPoint[] = [];
	const now = new Date();
	let totalSales = Math.floor(Math.random() * 1000) + 500; // 初期販売数500-1500

	// 過去6ヶ月のデータを生成
	for (let i = 180; i >= 0; i -= 15) {
		// 2週間間隔
		const date = new Date(now);
		date.setDate(date.getDate() - i);

		// 期間販売数（週によって変動）
		const periodSales = Math.floor(Math.random() * 100) + 10; // 10-110本
		totalSales += periodSales;

		data.push({
			date: date.toISOString(),
			fetchedAt: date.toISOString(),
			source: "dlsite",
			totalSales,
			periodSales,
		});
	}

	return data;
}

/**
 * モックランキング履歴データを生成
 */
export function generateMockRankingHistory(_workId: string): RankingHistoryPoint[] {
	const data: RankingHistoryPoint[] = [];
	const now = new Date();
	let currentRank = Math.floor(Math.random() * 50) + 10; // 初期ランキング10-60位

	// 過去6ヶ月のデータを生成
	for (let i = 180; i >= 0; i -= 7) {
		// 週間隔
		const date = new Date(now);
		date.setDate(date.getDate() - i);

		// ランキングは時間と共に変動（一般的に下がる傾向）
		const variation = Math.floor(Math.random() * 20) - 5; // -5から+15の変動
		currentRank = Math.max(1, Math.min(currentRank + variation, 100));

		data.push({
			date: date.toISOString(),
			fetchedAt: date.toISOString(),
			source: "dlsite",
			rank: currentRank,
			category: "voice",
			term: "weekly",
			type: "popular",
			periodStart: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
			periodEnd: date.toISOString(),
		});
	}

	return data;
}

/**
 * 作品に基づいてモックデータを生成（一貫性のため）
 */
export function generateMockTimeSeriesData(workId: string) {
	// workIdをシードとして使用し、同じ作品は同じデータを生成
	let seed = workId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const originalRandom = Math.random;
	Math.random = () => {
		const x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	};

	const priceHistory = generateMockPriceHistory(workId);
	const salesHistory = generateMockSalesHistory(workId);
	const rankingHistory = generateMockRankingHistory(workId);

	// Math.randomを元に戻す
	Math.random = originalRandom;

	return {
		priceHistory,
		salesHistory,
		rankingHistory,
	};
}
