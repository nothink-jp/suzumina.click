"use server";

import type { PriceHistoryDocument } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";

/**
 * 作品の価格履歴データを取得
 * @param workId 作品ID
 * @param startDate 開始日付 (YYYY-MM-DD)
 * @param endDate 終了日付 (YYYY-MM-DD)
 * @returns 価格履歴データの配列
 */
export async function getPriceHistory(
	workId: string,
	startDate?: string,
	endDate?: string,
): Promise<PriceHistoryDocument[]> {
	try {
		if (!workId) {
			throw new Error("作品IDが指定されていません");
		}

		// サブコレクション参照
		const firestore = getFirestore();
		let query = firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.orderBy("date", "desc");

		// 日付範囲フィルタ
		if (endDate) {
			query = query.where("date", "<=", endDate);
		}
		if (startDate) {
			query = query.where("date", ">=", startDate);
		}

		// 最大500件に制限（パフォーマンス考慮）
		query = query.limit(500);

		const snapshot = await query.get();

		if (snapshot.empty) {
			return [];
		}

		const priceHistory: PriceHistoryDocument[] = [];

		snapshot.forEach((doc) => {
			const data = doc.data() as PriceHistoryDocument;
			priceHistory.push(data);
		});

		// 日付昇順でソート（チャート表示用）
		priceHistory.sort((a, b) => a.date.localeCompare(b.date));

		return priceHistory;
	} catch (error) {
		logError("価格履歴取得エラー", error);
		throw new Error("価格履歴データの取得に失敗しました");
	}
}

/**
 * 最近の価格履歴を取得（90日間）
 * @param workId 作品ID
 * @returns 最近90日間の価格履歴
 */
export async function getRecentPriceHistory(workId: string): Promise<PriceHistoryDocument[]> {
	// JST（日本時間）で現在日付を取得
	const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
	const endDate = nowJST.toISOString().split("T")[0];

	// 90日前の日付（JST）
	const startJST = new Date(nowJST.getTime() - 90 * 24 * 60 * 60 * 1000);
	const startDate = startJST.toISOString().split("T")[0];

	return getPriceHistory(workId, startDate, endDate);
}
