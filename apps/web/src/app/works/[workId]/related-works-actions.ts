"use server";

import type { CircleDocument } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { fetchWorksByIds } from "../utils/fetch-works-by-ids";
import { convertWorksToPlainObjects } from "../utils/work-converters";
import { pickRelatedWorks, type RelatedWork } from "./related-works";

/**
 * 同じサークルの他の作品を引く（SPR-302 第2弾）。
 *
 * 共有層（`src/actions/`）ではなく route 同居にしているのは、`fetchWorksByIds` と
 * `pickRelatedWorks` が works route 配下にあり、**共有層から route 層への逆依存が
 * 禁止されている**ため（同ディレクトリの `evaluation-actions.ts` と同じ置き方）。
 *
 * 読み取りは circles/{id} の 1 read ＋ 表示分の最大 RELATED_WORKS_LIMIT read に固定する。
 * **workIds 全件は引かない**（789作品のサークルが存在し、全件取得は #917 で潰した
 * 全件スキャンの再発になる）。キャッシュは呼び出し側の Server Component が持つ。
 */
export async function getCircleRelatedWorks(
	circleId: string,
	currentWorkId: string,
): Promise<RelatedWork[]> {
	const firestore = getFirestore();
	const circleDoc = await firestore.collection("circles").doc(circleId).get();
	if (!circleDoc.exists) return [];

	const circleData = circleDoc.data() as CircleDocument;
	const targetIds = pickRelatedWorks(circleData.workIds ?? [], currentWorkId);
	if (targetIds.length === 0) return [];

	const works = await fetchWorksByIds(firestore, targetIds);
	return convertWorksToPlainObjects(works).map((work) => ({
		productId: work.productId,
		title: work.title,
		formattedPrice: work.price.formattedPrice,
	}));
}
