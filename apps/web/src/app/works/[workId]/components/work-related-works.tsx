import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { RelatedWork } from "../related-works";
import { getCircleRelatedWorks } from "../related-works-actions";

/**
 * 同じサークルの他の作品（SPR-302 第2弾）。**Server Component であることが要件**。
 *
 * 目的は2つ:
 * 1. works 詳細に DLsite の写しではない情報を増やす（第1弾の価格推移と同じ狙い）
 * 2. works 詳細どうしを内部リンクで結ぶ。一覧のページ送りしか経路が無いと
 *    クローラは深さ181ページを順に辿るしかないが、作品間リンクがあれば
 *    サークル単位の塊として辿れる（SPR-308）
 *
 * 読み取りコスト: circles/{id} が 1 read ＋ 表示分の works が最大 RELATED_WORKS_LIMIT read。
 * Firestore reads は課金上位のため `use cache` + `cacheLife("days")` で 1 作品 1 日 1 回に抑える。
 * Firestore アクセス自体は `related-works-actions.ts` に置く（第1弾の `work-price-summary.tsx`
 * と同じく、コンポーネントはキャッシュ境界と JSX の組み立てだけを持つ）。
 */
async function loadRelatedWorks(circleId: string, currentWorkId: string): Promise<RelatedWork[]> {
	"use cache";
	cacheLife("days");

	return getCircleRelatedWorks(circleId, currentWorkId);
}

export default async function WorkRelatedWorks({
	circleId,
	circleName,
	currentWorkId,
}: {
	circleId: string;
	circleName: string;
	currentWorkId: string;
}) {
	const relatedWorks = await loadRelatedWorks(circleId, currentWorkId);
	if (relatedWorks.length === 0) return null;

	return (
		<Card className="mt-6">
			<CardHeader>
				<CardTitle className="text-lg">{circleName}の他の作品</CardTitle>
				<p className="text-sm text-muted-foreground">
					同じサークルの作品を{relatedWorks.length}件表示しています。
				</p>
			</CardHeader>
			<CardContent>
				<ul className="space-y-2">
					{relatedWorks.map((work) => (
						<li key={work.productId} className="text-sm">
							<Link
								href={`/works/${work.productId}`}
								className="text-foreground underline-offset-4 hover:underline"
							>
								{work.title}
							</Link>
							<span className="ml-2 text-muted-foreground">{work.formattedPrice}</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
