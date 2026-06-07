"use server";

import { unstable_cache } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * 人気タグ集計は全件スキャンを伴うため、revalidate でキャッシュして
 * ページ訪問ごとの全件 .get() を回避する（SPR-112 / SPR-88 と整合）。
 * タグは緩やかにしか変化しないので長めの TTL を採用する。
 */
const POPULAR_TAGS_REVALIDATE_SECONDS = 60 * 60;

/**
 * 動画の音声ボタン数を取得
 */
export async function getAudioButtonCount(videoId: string): Promise<number> {
	try {
		const firestore = getFirestore();

		logger.info("getAudioButtonCount: 音声ボタン数取得開始", { videoId });

		// Firestoreクエリを作成
		const query = firestore
			.collection("audioButtons")
			.where("videoId", "==", videoId)
			.where("isPublic", "==", true);

		try {
			// count()メソッドを試す
			const snapshot = await query.count().get();
			const count = snapshot.data().count;
			logger.info("getAudioButtonCount: count()メソッドで取得成功", { videoId, count });
			return count;
		} catch (countError) {
			// count()が使えない場合はフォールバック
			logger.warn("getAudioButtonCount: count()メソッドが使用できません、フォールバックします", {
				videoId,
				error: countError instanceof Error ? countError.message : String(countError),
			});

			// ドキュメントを取得して数える
			const snapshot = await query.limit(1000).get();
			const count = snapshot.size;
			logger.info("getAudioButtonCount: フォールバックで取得成功", { videoId, count });
			return count;
		}
	} catch (error) {
		logger.error("音声ボタン数取得エラー", {
			videoId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return 0;
	}
}

/**
 * 音声ボタンの人気タグを集計する内部実装。
 * 全件 .get() を伴うため、公開 API はキャッシュ経由で呼ぶ（getPopularAudioButtonTags）。
 *
 * エラーはここで握りつぶさず throw する。unstable_cache は throw をキャッシュしないため、
 * 一過性の Firestore 障害で空配列が revalidate 窓の間キャッシュされるのを避ける。
 */
async function fetchPopularAudioButtonTags(
	limit: number,
): Promise<Array<{ tag: string; count: number }>> {
	const firestore = getFirestore();
	const snapshot = await firestore.collection("audioButtons").where("isPublic", "==", true).get();

	const tagCounts = new Map<string, number>();

	for (const doc of snapshot.docs) {
		const data = doc.data();
		if (data && Array.isArray(data.tags)) {
			for (const tag of data.tags) {
				if (typeof tag === "string" && tag.trim() !== "") {
					tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
				}
			}
		}
	}

	return Array.from(tagCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([tag, count]) => ({ tag, count }));
}

// limit は unstable_cache が引数として自動でキー化する。
const getPopularAudioButtonTagsCached = unstable_cache(
	fetchPopularAudioButtonTags,
	["popular-audio-button-tags"],
	{ revalidate: POPULAR_TAGS_REVALIDATE_SECONDS, tags: ["popular-audio-button-tags"] },
);

/**
 * 人気タグリストを取得する。
 * 一覧ページのタグ絞り込みUIの選択肢に使う。全件スキャンを避けるため revalidate キャッシュ経由。
 * エラー時は空配列を返す（キャッシュ層には正常結果のみ載る）。
 */
export async function getPopularAudioButtonTags(limit = 30): Promise<
	Array<{
		tag: string;
		count: number;
	}>
> {
	try {
		return await getPopularAudioButtonTagsCached(limit);
	} catch (error) {
		logger.error("人気タグの取得に失敗", { error });
		return [];
	}
}
