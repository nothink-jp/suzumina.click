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
 * クリエイターページの読み取り正本（SPR-311）。
 *
 * ページ送り・ソート・検索はいずれも作品本体のフィールド（releaseDateISO / price / rating /
 * title / genres / 声優名）を見るため Firestore 側では絞り込めず、全作品が要る。
 * 素直に書くと「1 ページ表示するたびに全作品を読む」になり、`creators/{id}/works` を
 * ヘッダー用と一覧用で二重に引いていたこともあって **3N + 2 read / ページ表示** だった。
 * 作品 2,178 件のクリエイターで 1 ページ 6,536 read・全 182 ページ巡回で約 119 万 read に達し、
 * これ単独で月額予算を使い切っていた。
 *
 * `use cache` をクリエイター単位に括り、ページ番号・ソート・検索語を**キャッシュキーに入れない**
 * ことで、全ページ・全ソートが取得を共有する。`cacheLife("days")` は works 詳細の
 * 関連作品・価格推移（SPR-302）と揃えた。元データの更新は DLsite 取り込みパイプライン側で、
 * 一覧の鮮度は日次で足りる。
 *
 * **ヘッダー情報と作品でキャッシュ境界を分けてある**（circle 側と同じ構造）。
 * `getCreatorInfo` は OG 画像ルート（`opengraph-image.tsx`）が単独で呼ぶ経路で、そこは
 * name / types / workCount しか使わない。1 つの境界に畳むと OG 生成が全作品まで引くことになり、
 * クローラの OG 巡回で `28165` のような大口が数千 read を払い続ける。
 * 代償として、ページ表示（info と works の両方を使う経路）では creators/{id} を境界ごとに
 * 1 回ずつ＝計 2 read 引く。分割で削れる量に対して無視できるので畳んでいない。
 *
 * 取得失敗は **throw して伝播させる**（キャッシュに載せない）。null を返すとエラーが 1 日居座る。
 * null は「そのクリエイターが存在しない」という、キャッシュしてよい結果だけに使う。
 */
export async function loadCreatorInfo(creatorId: string): Promise<CreatorPageInfo | null> {
	"use cache";
	cacheLife("days");

	const creator = await fetchCreatorDocument(creatorId);
	if (!creator) {
		return null;
	}
	const { data, ref } = creator;

	// SPR-74 Phase B の非正規化フィールドがあればサブコレクションを読まない（1 read で済む）。
	// 判定は `/creators` 一覧（`creators/actions.ts`）と同じにしてある。本番実測で 1,193 件中
	// 1,177 件（98.7%）が該当し、欠損 16 件はいずれも作品 100 件未満＝fallback でも安い。
	// なお一覧は元からこの非正規化値を使っており、詳細だけがサブコレクションを数え直していたため、
	// 同期が 1 件遅れている 29 件で一覧と詳細の「参加作品数」が食い違っていた。ここを揃えると解消する。
	if (typeof data.workCount === "number" && Array.isArray(data.types)) {
		return buildCreatorInfo(creatorId, data, new Set<string>(data.types), data.workCount);
	}

	const worksSnapshot = await ref.collection("works").get();
	return buildCreatorInfo(creatorId, data, collectRoles(worksSnapshot.docs), worksSnapshot.size);
}

/**
 * クリエイターの参加作品を全件取得する。存在しないクリエイターは null（空配列と区別する）。
 */
export async function loadCreatorWorks(creatorId: string): Promise<WorkPlainObject[] | null> {
	"use cache";
	cacheLife("days");

	const creator = await fetchCreatorDocument(creatorId);
	if (!creator) {
		return null;
	}

	const worksSnapshot = await creator.ref.collection("works").get();
	const firestore = getFirestore();
	return convertWorksToPlainObjects(
		await fetchWorksByIds(
			firestore,
			worksSnapshot.docs.map((doc) => doc.id),
		),
	);
}

async function fetchCreatorDocument(creatorId: string) {
	const firestore = getFirestore();
	const creatorDoc = await firestore.collection("creators").doc(creatorId).get();
	if (!creatorDoc.exists) {
		return null;
	}
	return { data: creatorDoc.data() as CreatorDocument, ref: creatorDoc.ref };
}

function collectRoles(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Set<string> {
	const roles = new Set<string>();
	for (const doc of docs) {
		const relation = doc.data() as CreatorWorkRelation;
		for (const role of relation.roles ?? []) {
			roles.add(role);
		}
	}
	return roles;
}

function buildCreatorInfo(
	creatorId: string,
	data: CreatorDocument,
	types: Set<string>,
	// 関連付けの件数。実在する作品数（loadCreatorWorks の length）とは意図的に別物で、
	// ヘッダーの「総作品数」は元から関連付け基準（欠けは整合性 cron の担当）。
	workCount: number,
): CreatorPageInfo {
	const info: CreatorPageInfo = {
		id: creatorId,
		name: data.name,
		types: Array.from(types),
		workCount,
	};

	if (data.primaryRole && !types.has(data.primaryRole)) {
		info.types.unshift(data.primaryRole);
	}

	return info;
}
