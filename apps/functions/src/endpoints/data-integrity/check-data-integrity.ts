/**
 * データ整合性検証エンドポイント（薄いハンドラ）
 *
 * CloudEvent の受領 → 重複配信の判定 → オーケストレータ呼び出し → 結果ログのみを担う。
 * 本処理は run-integrity-check.ts の `runIntegrityCheck`。
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import * as logger from "../../shared/logger";
import { claimRunEventFailOpen } from "../../shared/run-metadata";
import { integrityCheckRunEventClaim, runIntegrityCheck } from "./run-integrity-check";

/**
 * Cloud Functions エントリーポイント
 *
 * 本番スケジュール実行用。常に dryRun=false（修正を書き込む）。
 * 同じメッセージの重複配信・再送（同じ event.id）では run を走らせず、正常終了（= ack）する（SPR-369）。
 */
export async function checkDataIntegrity(event: CloudEvent<unknown>): Promise<void> {
	if (!(await claimRunEventFailOpen(event.id, integrityCheckRunEventClaim))) {
		logger.warn("重複配信のためデータ整合性チェックをスキップ", { eventId: event.id });
		return;
	}

	logger.info("データ整合性チェックを開始", { eventId: event.id, eventType: event.type });

	try {
		const result = await runIntegrityCheck();

		logger.info("データ整合性チェック完了", {
			// totalChecked は「走査した doc 数」をコレクション単位で数える（circles + creators + works）。
			// 4つ目の検査 creatorWorkRestore.checked を足さないのは意図的:
			// `creatorWorkRestore.checked` と `workCircleConsistency.checked` は
			// **どちらも works 全件の件数で常に同値**（両者とも collection("works") を走査する）。
			// したがって加算すると works が必ず二重計上になる（件数の多寡によらず成立する）。
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
