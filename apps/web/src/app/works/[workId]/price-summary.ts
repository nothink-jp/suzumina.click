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

export function formatPrice(value: number): string {
	return `¥${value.toLocaleString("ja-JP")}`;
}

/** YYYY-MM-DD を「2026年7月2日」にする。想定外の形式はそのまま返す（表示を壊さない） */
export function formatSummaryDate(date: string): string {
	const [year, month, day] = date.split("-");
	if (!year || !month || !day) return date;
	const monthNumber = Number(month);
	const dayNumber = Number(day);
	if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return date;
	return `${year}年${monthNumber}月${dayNumber}日`;
}

/**
 * サマリーを人が読む文章にする。
 *
 * 表示文言をコンポーネントではなくここに置くのは、**ユーザーに見える文章こそテストしたい**ため
 * （Server Component 側は JSX の組み立てだけにして、分岐は純関数に寄せる・SPR-302 レビュー指摘）。
 */
export function describePriceSummary(summary: PriceHistorySummary): string {
	const trend =
		summary.saleDays > 0
			? `最も安かったのは${formatSummaryDate(summary.lowestDate)}の${formatPrice(summary.lowestPrice)}で、最大${summary.maxDiscountRate}%OFFでした。${summary.observedDays}日間のうち${summary.saleDays}日がセール価格です。`
			: `観測した${summary.observedDays}日間はセールがなく、${formatPrice(summary.currentPrice)}のまま推移しています。`;

	const position = summary.isCurrentlyLowest
		? "現在の価格は、この期間の最安値と同じです。"
		: `現在の価格は最安値より${formatPrice(summary.currentPrice - summary.lowestPrice)}高い状態です。`;

	return `${trend}${position}`;
}

/** 期間の説明文（見出し直下のリード） */
export function describePriceSummaryPeriod(summary: PriceHistorySummary, title: string): string {
	return `${formatSummaryDate(summary.startDate)}〜${formatSummaryDate(summary.endDate)}の${summary.observedDays}日間、当サイトが記録した「${title}」の価格です。`;
}
