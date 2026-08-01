import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { cacheLife } from "next/cache";
import { getRecentPriceHistory } from "@/actions/price-history";
import { type PriceHistorySummary, summarizePriceHistory } from "../price-summary";

/**
 * 価格推移サマリー（SPR-302）。**Server Component であることが要件**。
 *
 * 同じデータを描く `PriceHistory` は非アクティブなタブの中の client component（SWR fetch）で、
 * 初期 HTML に一切現れない＝クローラからは存在しないのと同じだった。works 詳細は検索流入の
 * 8割を占めるのに HTML の固有テキストが約1,000文字しかなく、その大半が DLsite の作品説明の
 * 写しという状態だったため、**DLsite が公開していない価格推移をサーバー側で出す**ことで
 * 重複ページから脱却させるのが狙い。タブの中には置かない（描画されなくなる）。
 *
 * 読み取りコスト: priceHistory は 1 作品 90 日分＝最大90 read。Firestore reads は課金上位のため
 * `use cache` + `cacheLife("days")` で 1 作品 1 日 1 回に抑える（元データの更新も日次 cron）。
 */
async function loadPriceSummary(workId: string): Promise<PriceHistorySummary | null> {
	"use cache";
	cacheLife("days");

	const history = await getRecentPriceHistory(workId);
	return summarizePriceHistory(history);
}

function formatPrice(value: number): string {
	return `¥${value.toLocaleString("ja-JP")}`;
}

/** YYYY-MM-DD を「2026年7月2日」にする（date-format は Date 前提のためここで完結させる） */
function formatDate(date: string): string {
	const [year, month, day] = date.split("-");
	if (!year || !month || !day) return date;
	return `${year}年${Number(month)}月${Number(day)}日`;
}

export default async function WorkPriceSummary({
	workId,
	title,
}: {
	workId: string;
	title: string;
}) {
	const summary = await loadPriceSummary(workId);
	if (!summary) return null;

	const hasSale = summary.saleDays > 0;

	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle className="text-lg">価格の推移</CardTitle>
				<p className="text-sm text-muted-foreground">
					{formatDate(summary.startDate)}〜{formatDate(summary.endDate)}の{summary.observedDays}
					日間、当サイトが記録した「{title}」の価格です。
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div>
						<dt className="text-xs text-muted-foreground">現在の価格</dt>
						<dd className="text-base font-semibold text-foreground">
							{formatPrice(summary.currentPrice)}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">期間中の最安値</dt>
						<dd className="text-base font-semibold text-foreground">
							{formatPrice(summary.lowestPrice)}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">期間中の最高値</dt>
						<dd className="text-base font-semibold text-foreground">
							{formatPrice(summary.highestPrice)}
						</dd>
					</div>
					<div>
						<dt className="text-xs text-muted-foreground">セールだった日数</dt>
						<dd className="text-base font-semibold text-foreground">{summary.saleDays}日</dd>
					</div>
				</dl>

				<p className="text-sm text-foreground">
					{hasSale
						? `最も安かったのは${formatDate(summary.lowestDate)}の${formatPrice(summary.lowestPrice)}で、最大${summary.maxDiscountRate}%OFFでした。${summary.observedDays}日間のうち${summary.saleDays}日がセール価格です。`
						: `観測した${summary.observedDays}日間はセールがなく、${formatPrice(summary.currentPrice)}のまま推移しています。`}
					{summary.isCurrentlyLowest
						? "現在の価格は、この期間の最安値と同じです。"
						: `現在の価格は最安値より${formatPrice(summary.currentPrice - summary.lowestPrice)}高い状態です。`}
				</p>
			</CardContent>
		</Card>
	);
}
