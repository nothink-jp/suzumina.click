import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { cacheLife } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { fetchWorksByIds } from "../../works/utils/fetch-works-by-ids";
import { convertWorksToPlainObjects } from "../../works/utils/work-converters";

/**
 * クリエイターページの読み取り正本。ヘッダー情報と参加作品を **1 回の取得に畳む**（SPR-311）。
 *
 * ページ送り・ソート・検索はいずれも作品本体のフィールド（releaseDateISO / price / rating /
 * title / genres / 声優名）を見るため、Firestore 側では絞り込めず全作品が要る。
 * 素直に書くと「1 ページ表示するたびに全作品を読む」になり、`creators/{id}/works` を
 * ヘッダー用と一覧用で二重に引いていたこともあって **3N + 2 read / ページ表示** だった。
 * 作品 2,178 件のクリエイターで 1 ページ 6,536 read・全 182 ページ巡回で約 119 万 read に達し、
 * これ単独で月額予算を使い切っていた。
 *
 * 対策は 2 つ:
 * 1. サブコレクションの二重取得をやめて 1 回に畳む（3N + 2 → 2N + 1）
 * 2. `use cache` でクリエイター単位に括る。ページ番号・ソート・検索語は**キャッシュキーに入れない**ので、
 *    同じクリエイターの全ページ・全ソートが 1 日 1 回の取得を共有する
 *
 * `cacheLife("days")` は works 詳細の関連作品・価格推移（SPR-302）と揃えた。
 * 元データの更新は DLsite 取り込みパイプライン側で、一覧の鮮度は日次で足りる。
 *
 * 取得失敗は **throw して伝播させる**（キャッシュに載せない）。null を返すとエラーが 1 日居座る。
 * null は「そのクリエイターが存在しない」という、キャッシュしてよい結果だけに使う。
 */
export interface CreatorSource {
	info: CreatorPageInfo;
	/** 実在する参加作品のみ（サブコレクションの関連付けに対して欠けがありうる） */
	works: WorkPlainObject[];
}

export async function loadCreatorSource(creatorId: string): Promise<CreatorSource | null> {
	"use cache";
	cacheLife("days");

	const firestore = getFirestore();
	const creatorDoc = await firestore.collection("creators").doc(creatorId).get();

	if (!creatorDoc.exists) {
		return null;
	}

	const creatorData = creatorDoc.data() as CreatorDocument;
	const worksSnapshot = await creatorDoc.ref.collection("works").get();

	const types = new Set<string>();
	for (const doc of worksSnapshot.docs) {
		const relation = doc.data() as CreatorWorkRelation;
		for (const role of relation.roles ?? []) {
			types.add(role);
		}
	}

	const info: CreatorPageInfo = {
		id: creatorId,
		name: creatorData.name,
		types: Array.from(types),
		// 関連付けの件数。実在する作品数（works.length）とは意図的に別物で、
		// ヘッダーの「総作品数」は元から関連付け基準（欠けは整合性 cron の担当）。
		workCount: worksSnapshot.size,
	};

	if (creatorData.primaryRole && !types.has(creatorData.primaryRole)) {
		info.types.unshift(creatorData.primaryRole);
	}

	const works = convertWorksToPlainObjects(
		await fetchWorksByIds(
			firestore,
			worksSnapshot.docs.map((doc) => doc.id),
		),
	);

	return { info, works };
}
