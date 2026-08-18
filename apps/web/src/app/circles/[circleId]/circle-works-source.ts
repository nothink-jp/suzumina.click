import type {
	CircleDocument,
	CirclePlainObject,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { convertToCirclePlainObject } from "@suzumina.click/shared-types";
import { cacheLife } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { fetchWorksByIds } from "../../works/utils/fetch-works-by-ids";
import { convertWorksToPlainObjects } from "../../works/utils/work-converters";

/**
 * サークルページの読み取り正本（SPR-311）。
 *
 * ページ送り・ソート・検索はいずれも作品本体のフィールド（releaseDateISO / price / rating /
 * title / genres / 声優名）を見るため Firestore 側では絞り込めず、所属作品が全件要る。
 * 素直に書くと「1 ページ表示するたびに所属作品を全件読む」になり、最大サークル（789作品）で
 * 789 read / ページ表示だった。`use cache` をサークル単位に括り、ページ番号・ソート・検索語を
 * **キャッシュキーに入れない**ことで、全ページ・全ソートが 1 日 1 回の取得を共有する。
 *
 * #917 が潰したのは「works コレクションの全件スキャン」であって、
 * 「所属作品を全件引いて in-memory で slice する」構造はここまで残っていた。
 *
 * **ヘッダー情報と作品でキャッシュ境界を分けてある**。`loadCircleInfo` は OG 画像ルート
 * （`opengraph-image.tsx`）が単独で呼ぶ経路で、そこは元から circles/{id} の 1 read で済む。
 * 1 つの境界に畳むと OG 生成が所属作品まで引くことになり、クローラの OG 巡回で悪化する。
 * creator 側も同じ理由・同じ構造で `loadCreatorInfo` / `loadCreatorWorks` に分割済み（SPR-311）。
 * 代償として、ページ表示（info と works の両方を使う経路）では circles/{id} を境界ごとに
 * 1 回ずつ＝計 2 read 引く。分割で削れる量に対して無視できるので畳んでいない。
 *
 * 取得失敗は throw して伝播させる（キャッシュに載せない）。
 * null は「そのサークルが存在しない」という、キャッシュしてよい結果だけに使う。
 */
export async function loadCircleInfo(circleId: string): Promise<CirclePlainObject | null> {
	"use cache";
	cacheLife("days");

	const circleData = await fetchCircleDocument(circleId);
	return circleData ? convertToCirclePlainObject(circleData) : null;
}

/**
 * サークルの所属作品を全件取得する。存在しないサークルは null（空配列と区別する）。
 */
export async function loadCircleWorks(circleId: string): Promise<WorkPlainObject[] | null> {
	"use cache";
	cacheLife("days");

	const circleData = await fetchCircleDocument(circleId);
	if (!circleData) {
		return null;
	}

	// サークル所属作品の正本は circles/{id}.workIds。
	// 書き手は DLsite 取り込み（2h毎に arrayUnion・circle-firestore.ts）で、
	// checkDataIntegrity（週次）が重複除去と欠落補填を事後修復する。
	// 読み取り側はこの配列を引き当てるだけにし、所属条件を read 時に再計算しない。
	const workIds = circleData.workIds ?? [];
	const firestore = getFirestore();
	return convertWorksToPlainObjects(await fetchWorksByIds(firestore, workIds));
}

async function fetchCircleDocument(circleId: string): Promise<CircleDocument | null> {
	const firestore = getFirestore();
	const circleDoc = await firestore.collection("circles").doc(circleId).get();
	return circleDoc.exists ? (circleDoc.data() as CircleDocument) : null;
}
