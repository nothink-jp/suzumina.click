"use server";

import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

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
 * 人気タグリストを取得する
 */
export async function getPopularAudioButtonTags(limit = 30): Promise<
	Array<{
		tag: string;
		count: number;
	}>
> {
	try {
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
	} catch (error) {
		logger.error("人気タグの取得に失敗", { error });
		return [];
	}
}

/**
 * 全動画の音声ボタン数を再計算して更新（メンテナンス用）
 */
export async function recalculateAllVideosAudioButtonCount(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const firestore = getFirestore();

		// 全動画を取得
		const videosSnapshot = await firestore.collection("videos").get();

		let updatedCount = 0;
		let batch = firestore.batch();

		for (const videoDoc of videosSnapshot.docs) {
			// その動画の音声ボタン数を取得
			const count = await getAudioButtonCount(videoDoc.id);

			// 動画ドキュメントを更新
			batch.update(videoDoc.ref, {
				audioButtonCount: count,
				hasAudioButtons: count > 0,
				updatedAt: new Date().toISOString(),
			});

			updatedCount++;

			// バッチサイズ制限（500）に達したらコミット
			if (updatedCount % 500 === 0) {
				await batch.commit();
				// 新しいバッチインスタンスを作成
				batch = firestore.batch();
				logger.info(`Updated ${updatedCount} videos...`);
			}
		}

		// 残りをコミット
		if (updatedCount % 500 !== 0) {
			await batch.commit();
		}

		logger.info(`Successfully updated audioButtonCount for ${updatedCount} videos`);
		return { success: true };
	} catch (error) {
		logger.error("音声ボタン数再計算エラー", { error });
		return { success: false, error: "音声ボタン数の再計算に失敗しました" };
	}
}
