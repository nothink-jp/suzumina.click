/**
 * データ整合性検証: オーケストレータ（この関数が run の本処理）
 *
 * 週次で実行されるデータ整合性チェック機能。4種の検査（integrity-checks.ts）を
 * 順に実行し、結果を集計して保存する。
 *
 * dryRun（report-only）モード:
 *   集計・検出は通常どおり行い「修正したであろう件数」をカウントするが、
 *   Firestore への書き込み（batch.commit / 結果保存）は一切行わない。
 *   本番データを汚さずに「整合性関数が何を直すか」を確認するための観測専用モード。
 */

import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import {
	checkCircleWorkCounts,
	checkOrphanedCreators,
	checkWorkCircleConsistency,
	type IntegrityCheckResult,
	restoreCreatorWorkRelations,
} from "./integrity-checks";

// ローカル手動実行（tools/core）・インテグレーションテストが単一のimport元で済むよう、
// 検査側の公開シンボルをここから再エクスポートする（本ファイルが公開の正面玄関）。
export { FIRESTORE_BATCH_LIMIT, type IntegrityCheckResult } from "./integrity-checks";

// メタデータ保存用の定数
const INTEGRITY_CHECK_COLLECTION = "dlsiteMetadata";
const INTEGRITY_CHECK_DOC_ID = "dataIntegrityCheck";

/**
 * 整合性チェックの実行オプション
 */
export interface IntegrityCheckOptions {
	/**
	 * true の場合、検出・集計のみ行い Firestore への書き込みを一切行わない（report-only）。
	 * 既定は false（＝従来どおり修正を書き込む）。本番スケジュール実行は false。
	 */
	dryRun?: boolean;
}

/**
 * 整合性チェック結果を保存
 */
async function saveIntegrityCheckResult(result: IntegrityCheckResult): Promise<void> {
	const docRef = firestore.collection(INTEGRITY_CHECK_COLLECTION).doc(INTEGRITY_CHECK_DOC_ID);

	// 最新の結果を保存
	await docRef.set(
		{
			latest: result,
			lastCheckedAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
		},
		{ merge: true },
	);

	// 履歴として保存（最大10件保持）
	const historyRef = docRef.collection("history").doc(result.timestamp);
	await historyRef.set(result);

	// 古い履歴を削除
	const historySnapshot = await docRef
		.collection("history")
		.orderBy("timestamp", "desc")
		.limit(11)
		.get();

	if (historySnapshot.size > 10) {
		const batch = firestore.batch();
		historySnapshot.docs.slice(10).forEach((doc) => {
			batch.delete(doc.ref);
		});
		await batch.commit();
	}
}

/**
 * 整合性チェックの本体ロジック
 *
 * 4種の検査（Circle workIds / 孤立Creator / Work-Circle / Creator-Work復元）を実行し、
 * 結果を返す。dryRun=false（既定）の場合のみ Firestore へ修正と結果を書き込む。
 *
 * Cloud Functions ハンドラ（check-data-integrity.ts の `checkDataIntegrity`）からも、
 * ローカル手動実行・インテグレーションテストからも共通で呼ばれる正本。
 *
 * @param options.dryRun true で書き込みを一切行わない観測専用モード
 * @returns 検査結果（dryRun でも「要修正件数」を含む）
 */
export async function runIntegrityCheck(
	options: IntegrityCheckOptions = {},
): Promise<IntegrityCheckResult> {
	const dryRun = options.dryRun ?? false;
	const startTime = Date.now();

	const result: IntegrityCheckResult = {
		timestamp: new Date().toISOString(),
		dryRun,
		checks: {
			circleWorkCounts: { checked: 0, mismatches: 0, fixed: 0 },
			orphanedCreators: { checked: 0, found: 0, cleaned: 0 },
			workCircleConsistency: { checked: 0, mismatches: 0, fixed: 0 },
		},
		totalIssues: 0,
		totalFixed: 0,
		executionTimeMs: 0,
	};

	// 1. CircleのworkIds配列の整合性チェック
	await checkCircleWorkCounts(result, dryRun);

	// 2. 孤立したCreatorマッピングのクリーンアップ
	await checkOrphanedCreators(result, dryRun);

	// 3. Work-Circle相互参照の整合性
	await checkWorkCircleConsistency(result, dryRun);

	// 4. Creator-Work関連の復元（削除されたデータの回復）
	await restoreCreatorWorkRelations(result, dryRun);

	// 総計を計算
	result.totalIssues =
		result.checks.circleWorkCounts.mismatches +
		result.checks.orphanedCreators.found +
		result.checks.workCircleConsistency.mismatches;

	result.totalFixed =
		result.checks.circleWorkCounts.fixed +
		result.checks.orphanedCreators.cleaned +
		result.checks.workCircleConsistency.fixed +
		(result.checks.creatorWorkRestore?.restored || 0) +
		(result.checks.creatorWorkRestore?.creatorsCreated || 0);

	result.executionTimeMs = Date.now() - startTime;

	// 結果を保存（dryRun では書き込まない）
	if (dryRun) {
		logger.info("dry-run: 書き込みをスキップしました（検出のみ）", {
			totalIssues: result.totalIssues,
			wouldFix: result.totalFixed,
		});
	} else {
		await saveIntegrityCheckResult(result);
	}

	return result;
}
