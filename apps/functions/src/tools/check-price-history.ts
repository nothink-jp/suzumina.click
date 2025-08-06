/**
 * 価格履歴の保存状況を確認するスクリプト
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

/**
 * JST（日本標準時）での現在日付を YYYY-MM-DD 形式で取得
 */
function getJSTDate(): string {
	const now = new Date();
	const jstDateStr = now.toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const [year, month, day] = jstDateStr.split("/");
	if (!year || !month || !day) {
		throw new Error(`Invalid date format: ${jstDateStr}`);
	}
	return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * 作品の価格履歴を確認
 */
async function checkPriceHistory(workId: string): Promise<void> {
	try {
		const today = getJSTDate();
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday
			.toLocaleDateString("ja-JP", {
				timeZone: "Asia/Tokyo",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
			.replace(/\//g, "-");

		logger.info(`\n=== 作品 ${workId} の価格履歴確認 ===`);
		logger.info(`今日の日付: ${today}`);
		logger.info(`昨日の日付: ${yesterdayStr}`);

		// 作品の存在確認
		const workDoc = await firestore.collection("works").doc(workId).get();
		if (!workDoc.exists) {
			logger.warn(`作品 ${workId} が存在しません`);
			return;
		}

		// 価格履歴の取得（最新5件）
		const priceHistorySnapshot = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.orderBy("date", "desc")
			.limit(5)
			.get();

		logger.info(`価格履歴数: ${priceHistorySnapshot.size}件`);

		for (const doc of priceHistorySnapshot.docs) {
			const data = doc.data();
			logger.info(`- 日付: ${doc.id}, 価格: ${data.price}, 保存時刻: ${data.capturedAt}`);
		}

		// 今日のデータ確認
		const todayDoc = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(today)
			.get();

		if (todayDoc.exists) {
			logger.info(`\n今日（${today}）のデータが存在します`);
			const todayData = todayDoc.data();
			if (todayData) {
				logger.info(`保存時刻: ${todayData.capturedAt}`);
			}
		} else {
			logger.warn(`\n今日（${today}）のデータが存在しません`);
		}
	} catch (error) {
		logger.error("価格履歴確認エラー:", error);
	}
}

/**
 * 複数作品の価格履歴状況を確認
 */
async function checkMultipleWorks(): Promise<void> {
	const sampleWorkIds = [
		"RJ01286465", // ランダムなサンプル作品
		"RJ01001130",
		"RJ428637",
		"RJ436286",
		"RJ01064117",
	];

	logger.info("=== 価格履歴保存状況の確認 ===");
	logger.info(`現在のJST時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);

	for (const workId of sampleWorkIds) {
		await checkPriceHistory(workId);
	}

	// 統計情報
	const today = getJSTDate();
	const worksWithTodayData: string[] = [];
	const worksWithoutTodayData: string[] = [];

	for (const workId of sampleWorkIds) {
		const todayDoc = await firestore
			.collection("works")
			.doc(workId)
			.collection("priceHistory")
			.doc(today)
			.get();

		if (todayDoc.exists) {
			worksWithTodayData.push(workId);
		} else {
			worksWithoutTodayData.push(workId);
		}
	}

	logger.info("\n=== 統計情報 ===");
	logger.info(`今日（${today}）の価格履歴がある作品: ${worksWithTodayData.length}件`);
	logger.info(`今日（${today}）の価格履歴がない作品: ${worksWithoutTodayData.length}件`);

	if (worksWithoutTodayData.length > 0) {
		logger.info("\n価格履歴がない作品:");
		for (const workId of worksWithoutTodayData) {
			logger.info(`- ${workId}`);
		}
	}
}

// メイン実行
if (require.main === module) {
	checkMultipleWorks()
		.then(() => {
			logger.info("\n確認完了");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("エラー:", error);
			process.exit(1);
		});
}
