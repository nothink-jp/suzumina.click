/**
 * 価格履歴の日付ロジックをテストするスクリプト
 */

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
 * 日付計算のテスト
 */
async function testDateCalculation(): Promise<void> {
	logger.info("=== 価格履歴日付計算テスト ===");

	// 現在の各種時刻を表示
	const now = new Date();
	logger.info("現在のUTC時刻:", { time: now.toISOString() });
	logger.info("現在のローカル時刻:", { time: now.toString() });
	logger.info("現在のJST時刻:", { time: now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) });
	logger.info("getJSTDate()の結果:", { date: getJSTDate() });

	// タイムゾーン情報
	logger.info("実行環境のタイムゾーン:", {
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});
	logger.info("UTC時刻のミリ秒:", { milliseconds: Date.now() });

	// 特定の時刻でのテスト（0:03 JST相当）
	const testTimes = [
		new Date("2025-08-05T15:03:00Z"), // 2025-08-06 0:03 JST
		new Date("2025-08-05T17:03:00Z"), // 2025-08-06 2:03 JST
		new Date("2025-08-05T19:03:00Z"), // 2025-08-06 4:03 JST
		new Date("2025-08-06T15:03:00Z"), // 2025-08-07 0:03 JST
		new Date("2025-08-06T17:03:00Z"), // 2025-08-07 2:03 JST
	];

	logger.info("\n=== 特定時刻でのJST日付計算 ===");
	for (const testTime of testTimes) {
		const jstDateStr = testTime.toLocaleString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
		const [year, month, day] = jstDateStr.split("/");
		const formattedDate = `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;

		logger.info(`UTC: ${testTime.toISOString()} -> JST日付: ${formattedDate}`);
	}

	// テストAPIレスポンス
	const testApiResponse = {
		workno: "RJ12345678",
		price: 1000,
		official_price: 1200,
		discount_rate: 17,
		category: "マンガ",
	};

	logger.info("\n=== 価格履歴保存テスト ===");
	logger.info("テスト作品ID:", { workno: testApiResponse.workno });
	logger.info("現在のJST日付:", { date: getJSTDate() });

	// 実際の保存は実行しない（ドライラン）
	logger.info("保存処理のドライランを実行（実際には保存しません）");
}

// メイン実行
if (require.main === module) {
	testDateCalculation()
		.then(() => {
			logger.info("\nテスト完了");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("テストエラー:", error);
			process.exit(1);
		});
}
