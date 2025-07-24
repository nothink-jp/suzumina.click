#!/usr/bin/env node

/**
 * レガシーフィールドクリーンアップCLIツール
 */

import {
	analyzeLegacyFieldUsage,
	cleanupLegacyFields,
} from "../services/migration/cleanup-legacy-fields";
import * as logger from "../shared/logger";

const MIGRATION_LEGACY_FIELDS = [
	"aggregatedInfo",
	"prices",
	"dates",
	"totalDownloadCount",
	"bonusContent",
	"isExclusive",
	"apiGenres",
	"apiCustomGenres",
	"apiWorkOptions",
];

async function main() {
	const command = process.argv[2];

	try {
		switch (command) {
			case "analyze": {
				logger.info("レガシーフィールド使用状況の分析を開始します");
				const analysis = await analyzeLegacyFieldUsage();

				console.log("\n=== レガシーフィールド使用状況分析結果 ===");
				console.log(`総ドキュメント数: ${analysis.totalDocuments}`);
				console.log("\nフィールド別使用状況:");

				for (const [field, count] of Object.entries(analysis.fieldUsage)) {
					if (count > 0) {
						const percentage = ((count / analysis.totalDocuments) * 100).toFixed(1);
						console.log(`  ${field}: ${count}件 (${percentage}%)`);

						const samples = analysis.sampleDocuments[field];
						if (samples.length > 0) {
							console.log(
								`    サンプルID: ${samples.slice(0, 3).join(", ")}${samples.length > 3 ? "..." : ""}`,
							);
						}
					}
				}

				const totalLegacyFields = Object.values(analysis.fieldUsage).reduce(
					(sum, count) => sum + count,
					0,
				);
				if (totalLegacyFields === 0) {
					console.log("\n✅ レガシーフィールドは見つかりませんでした");
				} else {
					console.log(`\n⚠️  合計 ${totalLegacyFields} 件のレガシーフィールドが見つかりました`);
				}
				break;
			}

			case "dry-run": {
				logger.info("クリーンアップのドライランを開始します");
				const result = await cleanupLegacyFields({
					dryRun: true,
					fieldsToDelete: MIGRATION_LEGACY_FIELDS,
					batchSize: 500,
				});

				console.log("\n=== ドライラン結果 ===");
				console.log(`処理対象ドキュメント数: ${result.totalProcessed}`);
				console.log("削除予定フィールド数:");

				for (const [field, count] of Object.entries(result.deletedFields)) {
					if (count > 0) {
						console.log(`  ${field}: ${count}件`);
					}
				}

				if (result.totalProcessed === 0) {
					console.log("\n✅ 削除対象のレガシーフィールドはありません");
				} else {
					console.log(`\n⚠️  実行時は ${result.totalProcessed} 件のドキュメントが更新されます`);
					console.log("実行するには: pnpm cleanup:execute");
				}
				break;
			}

			case "execute": {
				console.log("⚠️  警告: この操作は本番データを変更します");
				console.log("削除対象フィールド:", MIGRATION_LEGACY_FIELDS.join(", "));
				console.log("\n続行しますか？ (yes/no): ");

				// 標準入力から確認を取得
				const readline = require("readline").createInterface({
					input: process.stdin,
					output: process.stdout,
				});

				const answer = await new Promise<string>((resolve) => {
					readline.question("", (ans) => {
						readline.close();
						resolve(ans);
					});
				});

				if (answer.toLowerCase() !== "yes") {
					console.log("キャンセルしました");
					process.exit(0);
				}

				logger.info("レガシーフィールドのクリーンアップを開始します");
				const result = await cleanupLegacyFields({
					dryRun: false,
					fieldsToDelete: MIGRATION_LEGACY_FIELDS,
					batchSize: 100,
				});

				console.log("\n=== クリーンアップ結果 ===");
				console.log(`処理ドキュメント数: ${result.totalProcessed}`);
				console.log(`成功: ${result.successCount}`);
				console.log(`失敗: ${result.failureCount}`);
				console.log("削除フィールド数:");

				for (const [field, count] of Object.entries(result.deletedFields)) {
					if (count > 0) {
						console.log(`  ${field}: ${count}件`);
					}
				}

				if (result.failureCount > 0) {
					console.log(`\n❌ ${result.failureCount} 件のドキュメントでエラーが発生しました`);
				} else {
					console.log("\n✅ クリーンアップが正常に完了しました");
				}
				break;
			}

			default:
				console.log("使用方法:");
				console.log("  pnpm cleanup:analyze    - レガシーフィールドの使用状況を分析");
				console.log("  pnpm cleanup:dry-run    - ドライランで削除対象を確認");
				console.log("  pnpm cleanup:execute    - 実際にクリーンアップを実行");
				process.exit(1);
		}
	} catch (error) {
		logger.error("エラーが発生しました:", error);
		console.error("\n❌ エラーが発生しました:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// メイン関数を実行
main().catch((error) => {
	logger.error("Unhandled error:", error);
	process.exit(1);
});
