import type { CircleDocument, CirclePlainObject } from "@suzumina.click/shared-types";
import { convertToCirclePlainObject } from "@suzumina.click/shared-types";
import { cacheLife } from "next/cache";
import { getFirestore } from "@/lib/firestore";

/**
 * `/circles` 一覧の読み取り正本（SPR-311）。
 *
 * 構造・理由とも `creators/creators-source.ts` と同じ。検索 / ソート / ページ送りを in-memory で
 * 解決するため手前で `circles` を全件（391 件）読むが、旧実装は `unstable_cache` の引数キー化に
 * より params の組み合わせごとに別エントリになり、その数だけ全件スキャンが走っていた。
 * 8/20 実測で 237 リクエスト → 92,667 read。
 *
 * キャッシュ境界を**引数を取らない全件取得**だけに絞り、絞り込みと並べ替えは外側の純粋な導出にする。
 *
 * 取得失敗は throw して伝播させる（キャッシュに載せない）。
 */
export async function loadAllCircles(): Promise<CirclePlainObject[]> {
	"use cache";
	cacheLife("hours");

	const firestore = getFirestore();
	const circlesSnapshot = await firestore.collection("circles").get();

	const circles: CirclePlainObject[] = [];
	for (const doc of circlesSnapshot.docs) {
		const plainObject = convertToCirclePlainObject(doc.data() as CircleDocument);
		if (plainObject) {
			circles.push(plainObject);
		}
	}
	return circles;
}
