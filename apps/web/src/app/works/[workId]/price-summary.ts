import type { PriceHistoryDocument } from "@suzumina.click/shared-types";

/**
 * 価格推移のサマリー（SPR-302）。
 *
 * なぜサーバー側で出すのか:
 * works 詳細は検索流入の 8割（6/15-7/14 で clicks 90/124・impressions 3,669/4,612）を占める一方、
 * HTML に出ている固有テキストは約1,000文字で、その大半が DLsite の作品説明の写しだった。
 * 価格推移は **DLsite が過去のセール履歴を公開していない**このサイト固有のデータで、
 * かつ「RJ番号 セール」「安く買う」といった検索意図に直接答える。
 * しかし従来は非アクティブなタブの中の client component（SWR fetch）にあり、
 * 初期 HTML に一切現れていなかった＝クローラからは存在しないのと同じだった。
 */
export interface PriceHistorySummary {
	/** 観測できた日数 */
	observedDays: number;
	/** 期間の開始日（YYYY-MM-DD） */
	startDate: string;
	/** 期間の終了日（YYYY-MM-DD） */
	endDate: string;
	/** 最新の実売価格 */
	currentPrice: number;
	/** 期間中の最安値 */
	lowestPrice: number;
	/** 最安値を記録した日 */
	lowestDate: string;
	/** 期間中の最高値 */
	highestPrice: number;
	/** セール（割引あり）だった日数 */
	saleDays: number;
	/** 期間中の最大割引率（%） */
	maxDiscountRate: number;
	/** 現在価格が期間中の最安値と同じか */
	isCurrentlyLowest: boolean;
}

/** 実売価格を取り出す。price が無い日は officialPrice で代替し、どちらも無ければ対象外 */
function resolvePrice(entry: PriceHistoryDocument): number | null {
	if (typeof entry.price === "number") return entry.price;
	if (typeof entry.officialPrice === "number") return entry.officialPrice;
	return null;
}

/**
 * 価格履歴からサマリーを計算する（純関数）。
 * 価格を取り出せる日が 1 日も無ければ null（呼び出し側はセクションごと描画しない）。
 */
export function summarizePriceHistory(history: PriceHistoryDocument[]): PriceHistorySummary | null {
	const entries = history
		.map((entry) => ({ entry, price: resolvePrice(entry) }))
		.filter((row): row is { entry: PriceHistoryDocument; price: number } => row.price !== null)
		.sort((a, b) => a.entry.date.localeCompare(b.entry.date));

	if (entries.length === 0) return null;

	const first = entries[0] as (typeof entries)[number];
	const last = entries[entries.length - 1] as (typeof entries)[number];

	let lowest = first;
	let highestPrice = first.price;
	let saleDays = 0;
	let maxDiscountRate = 0;

	for (const row of entries) {
		// 同値なら先に出た日（＝古い方）を残す。「いつ最安だったか」は初出の方が情報量が多い
		if (row.price < lowest.price) lowest = row;
		if (row.price > highestPrice) highestPrice = row.price;
		if (row.entry.discountRate > 0) saleDays += 1;
		if (row.entry.discountRate > maxDiscountRate) maxDiscountRate = row.entry.discountRate;
	}

	return {
		observedDays: entries.length,
		startDate: first.entry.date,
		endDate: last.entry.date,
		currentPrice: last.price,
		lowestPrice: lowest.price,
		lowestDate: lowest.entry.date,
		highestPrice,
		saleDays,
		maxDiscountRate,
		isCurrentlyLowest: last.price === lowest.price,
	};
}
