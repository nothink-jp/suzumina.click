import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { cacheLife } from "next/cache";
import { getRecentPriceHistory } from "@/actions/price-history";
import {
	describePriceSummary,
	describePriceSummaryPeriod,
	formatPrice,
	type PriceHistorySummary,
	summarizePriceHistory,
} from "../price-summary";

/**
 * 価格推移サマリー（SPR-302）。**Server Component であることが要件**。
 *
 * 同じデータを描く `PriceHistory` は非アクティブなタブの中の client component（SWR fetch）で、
 * `Tabs defaultValue="overview"` のため DOM にマウントすらされず、初期 HTML に一切現れない
 * ＝クローラからは存在しないのと同じだった。works 詳細は検索流入の8割を占めるのに HTML の
 * 固有テキストが約1,000文字しかなく、その大半が DLsite の作品説明の写しという状態だったため、
 * **DLsite が公開していない価格推移をサーバー側で出す**ことで重複ページから脱却させる。
 * タブの中には置かない（描画されなくなる）。
 *
 * 読み取りコスト: priceHistory は 1 作品 90 日分＝最大90 read。Firestore reads は課金上位のため
 * `use cache` + `cacheLife("days")` で 1 作品 1 日 1 回に抑える（元データの更新も日次 cron）。
 *
 * 表示文言の分岐は `price-summary.ts` の純関数に寄せてある（ここは JSX の組み立てのみ）。
 */
async function loadPriceSummary(workId: string): Promise<PriceHistorySummary | null> {
	"use cache";
	cacheLife("days");

	const history = await getRecentPriceHistory(workId);
	return summarizePriceHistory(history);
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

	const stats = [
		{ label: "現在の価格", value: formatPrice(summary.currentPrice) },
		{ label: "期間中の最安値", value: formatPrice(summary.lowestPrice) },
		{ label: "期間中の最高値", value: formatPrice(summary.highestPrice) },
		{ label: "セールだった日数", value: `${summary.saleDays}日` },
	];

	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle className="text-lg">価格の推移</CardTitle>
				<p className="text-sm text-muted-foreground">
					{describePriceSummaryPeriod(summary, title)}
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{stats.map((stat) => (
						<div key={stat.label}>
							<dt className="text-xs text-muted-foreground">{stat.label}</dt>
							<dd className="text-base font-semibold text-foreground">{stat.value}</dd>
						</div>
					))}
				</dl>
				<p className="text-sm text-foreground">{describePriceSummary(summary)}</p>
			</CardContent>
		</Card>
	);
}
