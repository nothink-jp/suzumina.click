/**
 * データ整合性検証エンドポイント（薄いハンドラ）
 *
 * CloudEvent の受領 → オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-integrity-check.ts の `runIntegrityCheck`。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import * as logger from "../../shared/logger";
import { runIntegrityCheck } from "./run-integrity-check";

/**
 * Cloud Functions エントリーポイント
 *
 * 本番スケジュール実行用。常に dryRun=false（修正を書き込む）。
 */
export async function checkDataIntegrity(event: CloudEvent<unknown>): Promise<void> {
	logger.info("データ整合性チェックを開始", { eventType: event.type });

	try {
		const result = await runIntegrityCheck();

		logger.info("データ整合性チェック完了", {
			// totalChecked は「走査した doc 数」をコレクション単位で数える（circles + creators + works）。
			// 4つ目の検査 creatorWorkRestore.checked を足さないのは意図的: これは
			// workCircleConsistency と同じ works コレクションを再走査した件数で、加算すると
			// works が二重計上になる（実測 2026-07-18: circles 383 + creators 1,178 + works 2,114
			// = 3,675。足すと 5,789 になり実態と乖離する）。
			// creatorWorkRestore の「成果」は totalFixed 側に restored/creatorsCreated として
			// 計上済みなので、この検査がサマリから漏れているわけではない（SPR-270）。
			totalChecked:
				result.checks.circleWorkCounts.checked +
				result.checks.orphanedCreators.checked +
				result.checks.workCircleConsistency.checked,
			totalIssues: result.totalIssues,
			totalFixed: result.totalFixed,
			executionTimeMs: result.executionTimeMs,
		});
	} catch (error) {
		logger.error("データ整合性チェックエラー", { error });
		throw error;
	}
}
