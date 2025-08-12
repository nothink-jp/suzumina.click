/**
 * 価格履歴の詳細なデバッグスクリプト
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

/**
 * 日付文字列を生成
 */
function formatDateToJST(date: Date): string {
	return date
		.toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		})
		.replace(/\//g, "-");
}

/**
 * 価格履歴データをログ出力
 */
function logPriceHistoryData(doc: FirebaseFirestore.DocumentSnapshot): void {
	const data = doc.data();
	if (!data) return;

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

/**
 * 特定日付のデータを確認
 */
async function checkDateData(workId: string, dateStr: string, dateLabel: string): Promise<void> {
	const doc = await firestore
		.collection("works")
		.doc(workId)
		.collection("priceHistory")
		.doc(dateStr)
		.get();

	if (doc.exists) {
		const data = doc.data();
		if (data) {
			logger.info(`\n${dateLabel}（${dateStr}）のデータ: 存在する`);
			logger.info(`- capturedAt: ${data.capturedAt}`);
			if (data.capturedAt) {
				const capturedDate = new Date(data.capturedAt);
				logger.info(
					`- 保存時刻 (JST): ${capturedDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
				);
			}
		}
	} else {
		logger.info(`\n${dateLabel}（${dateStr}）のデータ: 存在しない`);
	}
}

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
			logPriceHistoryData(doc);
		}

		// 今日と昨日のデータを特別に確認
		const now = new Date();
		const today = formatDateToJST(now);

		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = formatDateToJST(yesterday);

		logger.info("\n=== 今日と昨日のデータ確認 ===");
		logger.info(`今日の日付: ${today}`);
		logger.info(`昨日の日付: ${yesterdayStr}`);

		// 今日のデータ
		await checkDateData(workId, today, "今日");

		// 昨日のデータ
		await checkDateData(workId, yesterdayStr, "昨日");
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
