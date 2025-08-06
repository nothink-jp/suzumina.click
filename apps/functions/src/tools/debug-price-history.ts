/**
 * 価格履歴の詳細なデバッグスクリプト
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

/**
 * 指定した作品の価格履歴を詳細に調査
 */
async function debugPriceHistory(workId: string): Promise<void> {
	try {
		logger.info(`\n=== 作品 ${workId} の価格履歴デバッグ ===`);

		// 作品の存在確認
		const workDoc = await firestore.collection("works").doc(workId).get();
		if (!workDoc.exists) {
			logger.warn(`作品 ${workId} が存在しません`);
			return;
		}

		// 価格履歴の全取得（最新10件）
		const priceHistorySnapshot = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.orderBy("date", "desc")
			.limit(10)
			.get();

		logger.info(`価格履歴総数: ${priceHistorySnapshot.size}件`);

		// 各履歴の詳細を表示
		for (const doc of priceHistorySnapshot.docs) {
			const data = doc.data();
			logger.info(`\n日付ドキュメントID: ${doc.id}`);
			logger.info(`- date フィールド: ${data.date}`);
			logger.info(`- capturedAt: ${data.capturedAt}`);
			logger.info(`- 価格: ${data.price ?? "null"}`);
			logger.info(`- 定価: ${data.officialPrice ?? "null"}`);
			logger.info(`- 割引率: ${data.discountRate ?? 0}%`);

			// capturedAtの時刻を解析
			if (data.capturedAt) {
				const capturedDate = new Date(data.capturedAt);
				logger.info(`- capturedAt (UTC): ${capturedDate.toISOString()}`);
				logger.info(
					`- capturedAt (JST): ${capturedDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
				);
			}
		}

		// 今日と昨日のデータを特別に確認
		const now = new Date();
		const today = now
			.toLocaleDateString("ja-JP", {
				timeZone: "Asia/Tokyo",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
			.replace(/\//g, "-");

		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday
			.toLocaleDateString("ja-JP", {
				timeZone: "Asia/Tokyo",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
			.replace(/\//g, "-");

		logger.info("\n=== 今日と昨日のデータ確認 ===");
		logger.info(`今日の日付: ${today}`);
		logger.info(`昨日の日付: ${yesterdayStr}`);

		// 今日のデータ
		const todayDoc = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(today)
			.get();

		if (todayDoc.exists) {
			const todayData = todayDoc.data();
			if (todayData) {
				logger.info(`\n今日（${today}）のデータ: 存在する`);
				logger.info(`- capturedAt: ${todayData.capturedAt}`);
				if (todayData.capturedAt) {
					const capturedDate = new Date(todayData.capturedAt);
					logger.info(
						`- 保存時刻 (JST): ${capturedDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
					);
				}
			}
		} else {
			logger.warn(`\n今日（${today}）のデータ: 存在しない`);
		}

		// 昨日のデータ
		const yesterdayDoc = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(yesterdayStr)
			.get();

		if (yesterdayDoc.exists) {
			const yesterdayData = yesterdayDoc.data();
			if (yesterdayData) {
				logger.info(`\n昨日（${yesterdayStr}）のデータ: 存在する`);
				logger.info(`- capturedAt: ${yesterdayData.capturedAt}`);
			}
		} else {
			logger.info(`\n昨日（${yesterdayStr}）のデータ: 存在しない`);
		}
	} catch (error) {
		logger.error("デバッグエラー:", error);
	}
}

/**
 * メイン実行
 */
async function main(): Promise<void> {
	// テスト用の作品ID
	const testWorkIds = ["RJ01286465", "RJ01001130", "RJ428637"];

	logger.info("=== 価格履歴詳細デバッグ ===");
	logger.info(`現在時刻 (UTC): ${new Date().toISOString()}`);
	logger.info(`現在時刻 (JST): ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);

	for (const workId of testWorkIds) {
		await debugPriceHistory(workId);
		logger.info(`\n${"=".repeat(60)}\n`);
	}
}

// メイン実行
if (require.main === module) {
	main()
		.then(() => {
			logger.info("\nデバッグ完了");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("エラー:", error);
			process.exit(1);
		});
}
