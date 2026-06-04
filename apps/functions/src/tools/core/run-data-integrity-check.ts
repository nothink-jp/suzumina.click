#!/usr/bin/env tsx
/**
 * データ整合性チェック手動実行スクリプト
 *
 * 使用方法:
 *   pnpm check:integrity              # 通常実行（Firestore へ修正を書き込む）
 *   pnpm check:integrity -- --dry-run # 観測専用（検出のみ・書き込まない）
 *
 * 本番環境の Cloud Functions で実行されるデータ整合性チェック機能を
 * 手動でローカル実行するためのもの。dry-run なら「何を直すか」を
 * 本番データを汚さずに確認できる。
 *
 * 接続先は環境変数で決まる:
 *   - FIRESTORE_EMULATOR_HOST 設定時 → Emulator
 *   - 未設定 → ADC で本番 Firestore（dry-run 推奨）
 */

import { type IntegrityCheckResult, runIntegrityCheck } from "../../endpoints/data-integrity-check";
import * as logger from "../../shared/logger";

function printReport(result: IntegrityCheckResult): void {
	const c = result.checks;
	logger.info("=====================================");
	logger.info(`📊 整合性チェック結果 (${result.dryRun ? "DRY-RUN / 書き込みなし" : "適用済み"})`);
	logger.info(
		`- Circle workIds : ${c.circleWorkCounts.checked}件中 ${c.circleWorkCounts.mismatches}件不整合 / ${c.circleWorkCounts.fixed}件${result.dryRun ? "要修正" : "修正"}`,
	);
	logger.info(
		`- 孤立Creator    : ${c.orphanedCreators.checked}件中 ${c.orphanedCreators.found}件検出 / ${c.orphanedCreators.cleaned}件${result.dryRun ? "要削除" : "削除"}`,
	);
	logger.info(
		`- Work-Circle    : ${c.workCircleConsistency.checked}件中 ${c.workCircleConsistency.mismatches}件不整合 / ${c.workCircleConsistency.fixed}件${result.dryRun ? "要修正" : "修正"}`,
	);
	if (c.creatorWorkRestore) {
		logger.info(
			`- Creator-Work復元: ${c.creatorWorkRestore.checked}件中 ${c.creatorWorkRestore.restored}件マッピング / ${c.creatorWorkRestore.creatorsCreated}件Creator${result.dryRun ? "要復元/作成" : "復元/作成"}`,
		);
	}
	logger.info(
		`- 合計           : ${result.totalIssues}件の問題 / ${result.totalFixed}件${result.dryRun ? "要対応" : "対応済み"}`,
	);
	logger.info("=====================================");
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
	const dryRun = process.argv.includes("--dry-run");

	try {
		logger.info(`🔍 データ整合性チェック - 手動実行開始${dryRun ? "（DRY-RUN）" : ""}`);
		logger.info("=====================================");

		const startTime = Date.now();
		const result = await runIntegrityCheck({ dryRun });
		const executionTime = Date.now() - startTime;

		printReport(result);
		logger.info(`✅ 完了 (実行時間: ${(executionTime / 1000).toFixed(1)}秒)`);

		if (!dryRun) {
			logger.info("\n📊 結果の確認: Firestore の以下を参照してください:");
			logger.info("- dlsiteMetadata/dataIntegrityCheck");
			logger.info("- dlsiteMetadata/dataIntegrityCheck/history");
		}
	} catch (error) {
		logger.error("❌ データ整合性チェックエラー", { error });
		process.exit(1);
	}
}

// スクリプト実行
if (require.main === module) {
	main().catch((error) => {
		logger.error("Script execution error:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
