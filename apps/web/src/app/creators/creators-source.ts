import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
} from "@suzumina.click/shared-types";
import { cacheLife } from "next/cache";
import { getFirestore } from "@/lib/firestore";

/**
 * `/creators` 一覧の読み取り正本（SPR-311）。
 *
 * 一覧は role / 検索 / ソート / ページ送りをすべて in-memory で解決する設計で、
 * その手前で `creators` コレクションを全件（1,195 件）読む。
 *
 * 旧実装も `unstable_cache` でキャッシュしてはいたが、**params をキャッシュキーに含めていた**
 * （`unstable_cache` は引数を自動でキー化する）ため、page / sort / search / role の組み合わせ
 * ごとに別エントリになり、その数だけ全件スキャンが走っていた。detail ページと同じ病気が
 * キー設計の層で起きていた形。8/20 実測で 720 リクエスト → 860,400 read＝その日の 41%。
 *
 * SPR-308 の SEO 改善でクローラが一覧を発見するまでは 1日1リクエスト程度で顕在化しておらず、
 * 8/12 → 8/20 で 1 → 720 リクエストに増えて表面化した。
 *
 * 対策は「キャッシュ境界を全件取得だけに絞る」こと。**引数を取らない**ので組み合わせ爆発が起きず、
 * 絞り込みと並べ替えはキャッシュの外側の純粋な導出になる。
 *
 * `cacheLife("hours")` は detail（days）より短くしてある。`use cache` はインスタンスローカルで、
 * インスタンス世代は 8/20 実測で 1日 42。世代の寿命（平均 30分強）の方が revalidate 間隔より
 * 短いため、hours にしても days にしても実際の取得回数は世代数でほぼ決まる＝**鮮度を上げても
 * read は増えない**。それなら取り込み間隔（2h）に近い方を選ぶ。旧実装の 60s からの後退幅も抑えられる。
 *
 * 取得失敗は throw して伝播させる（キャッシュに載せない）。空配列に畳むと「クリエイター0件」が
 * キャッシュに居座る。
 */
export async function loadAllCreators(): Promise<CreatorPageInfo[]> {
	"use cache";
	cacheLife("hours");

	const firestore = getFirestore();
	const creatorsSnapshot = await firestore.collection("creators").get();

	return Promise.all(
		creatorsSnapshot.docs.map(async (doc) => {
			const creatorData = doc.data() as CreatorDocument;

			// SPR-74 Phase B: denormalized な workCount/types があれば subcollection 読み込みを省略。
			// backfill 未完了の旧データは fallback で従来の並列読みに退避する。
			if (typeof creatorData.workCount === "number" && Array.isArray(creatorData.types)) {
				return buildCreatorPageInfo(
					creatorData,
					new Set<string>(creatorData.types),
					creatorData.workCount,
				);
			}

			const worksSnapshot = await doc.ref.collection("works").get();
			const allTypes = new Set<string>();
			for (const workDoc of worksSnapshot.docs) {
				const workRelation = workDoc.data() as CreatorWorkRelation;
				for (const role of workRelation.roles ?? []) {
					allTypes.add(role);
				}
			}

			return buildCreatorPageInfo(creatorData, allTypes, worksSnapshot.size);
		}),
	);
}

function buildCreatorPageInfo(
	creatorData: CreatorDocument,
	types: Set<string>,
	workCount: number,
): CreatorPageInfo {
	if (creatorData.primaryRole && !types.has(creatorData.primaryRole)) {
		types.add(creatorData.primaryRole);
	}

	return {
		id: creatorData.creatorId,
		name: creatorData.name,
		types: Array.from(types),
		workCount,
	} satisfies CreatorPageInfo;
}
