/**
 * データ整合性検証エンドポイント
 *
 * 週次で実行されるデータ整合性チェック機能
 * - CircleのworkIds配列の整合性
 * - 孤立したCreatorマッピングのクリーンアップ
 * - Work-Circle相互参照の整合性
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import * as logger from "../shared/logger";

// メタデータ保存用の定数
const INTEGRITY_CHECK_COLLECTION = "dlsiteMetadata";
const INTEGRITY_CHECK_DOC_ID = "dataIntegrityCheck";

/**
 * 整合性チェック結果の型定義
 */
interface IntegrityCheckResult {
	timestamp: string;
	checks: {
		circleWorkCounts: {
			checked: number;
			mismatches: number;
			fixed: number;
		};
		orphanedCreators: {
			checked: number;
			found: number;
			cleaned: number;
		};
		workCircleConsistency: {
			checked: number;
			mismatches: number;
			fixed: number;
		};
	};
	totalIssues: number;
	totalFixed: number;
	executionTimeMs: number;
}

/**
 * CircleのworkIds配列の整合性をチェック
 */
async function checkCircleWorkCounts(result: IntegrityCheckResult): Promise<void> {
	logger.info("CircleのworkIds配列の整合性チェックを開始");

	const circlesSnapshot = await firestore.collection("circles").get();
	const batch = firestore.batch();
	let batchCount = 0;

	for (const circleDoc of circlesSnapshot.docs) {
		result.checks.circleWorkCounts.checked++;

		const circleData = circleDoc.data();
		const workIds = circleData.workIds || [];

		// 重複を除去
		const uniqueWorkIds = Array.from(new Set(workIds));

		if (workIds.length !== uniqueWorkIds.length) {
			logger.warn(
				`Circle ${circleDoc.id}: 重複作品IDを検出 (${workIds.length} -> ${uniqueWorkIds.length})`,
			);
			result.checks.circleWorkCounts.mismatches++;

			// 修正
			batch.update(circleDoc.ref, {
				workIds: uniqueWorkIds,
				updatedAt: Timestamp.now(),
			});

			result.checks.circleWorkCounts.fixed++;
			batchCount++;

			// バッチサイズ制限
			if (batchCount >= 400) {
				await batch.commit();
				batchCount = 0;
			}
		}

		// 存在しない作品IDのチェック（現在は削除しない - 収集対象が限定的なため）
		// TODO: 全作品収集完了後に有効化
		/*
		const existingWorkIds: string[] = [];
		for (const workId of uniqueWorkIds) {
			const workDoc = await firestore
				.collection("works")
				.doc(workId as string)
				.get();
			if (workDoc.exists) {
				existingWorkIds.push(workId as string);
			} else {
				logger.warn(`Circle ${circleDoc.id}: 存在しない作品ID ${workId} を検出`);
				result.checks.circleWorkCounts.mismatches++;
			}
		}

		if (existingWorkIds.length !== uniqueWorkIds.length) {
			batch.update(circleDoc.ref, {
				workIds: existingWorkIds,
				updatedAt: Timestamp.now(),
			});

			result.checks.circleWorkCounts.fixed++;
			batchCount++;

			if (batchCount >= 400) {
				await batch.commit();
				batchCount = 0;
			}
		}
		*/
	}

	if (batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`CircleのworkIds配列チェック完了: ${result.checks.circleWorkCounts.checked}件チェック、${result.checks.circleWorkCounts.fixed}件修正`,
	);
}

/**
 * 孤立したCreatorマッピングをチェック
 */
async function checkOrphanedCreators(result: IntegrityCheckResult): Promise<void> {
	logger.info("孤立したCreatorマッピングのチェックを開始");

	const creatorsSnapshot = await firestore.collection("creators").get();
	const batch = firestore.batch();
	let batchCount = 0;

	for (const creatorDoc of creatorsSnapshot.docs) {
		result.checks.orphanedCreators.checked++;

		const worksSnapshot = await creatorDoc.ref.collection("works").get();
		let hasValidWork = false;

		for (const workMapping of worksSnapshot.docs) {
			const workId = workMapping.id;
			const workDoc = await firestore.collection("works").doc(workId).get();

			if (!workDoc.exists) {
				logger.warn(`Creator ${creatorDoc.id}: 孤立したマッピング ${workId} を検出`);
				result.checks.orphanedCreators.found++;

				// 削除
				batch.delete(workMapping.ref);
				result.checks.orphanedCreators.cleaned++;
				batchCount++;

				if (batchCount >= 400) {
					await batch.commit();
					batchCount = 0;
				}
			} else {
				hasValidWork = true;
			}
		}

		// 作品が1つもないクリエイターは削除
		if (!hasValidWork && worksSnapshot.size > 0) {
			logger.warn(`Creator ${creatorDoc.id}: 有効な作品がないため削除`);
			batch.delete(creatorDoc.ref);
			result.checks.orphanedCreators.cleaned++;
			batchCount++;

			if (batchCount >= 400) {
				await batch.commit();
				batchCount = 0;
			}
		}
	}

	if (batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`孤立Creatorチェック完了: ${result.checks.orphanedCreators.checked}件チェック、${result.checks.orphanedCreators.cleaned}件クリーンアップ`,
	);
}

/**
 * Work-Circle相互参照の整合性をチェック
 */
async function checkWorkCircleConsistency(result: IntegrityCheckResult): Promise<void> {
	logger.info("Work-Circle相互参照の整合性チェックを開始");

	const worksSnapshot = await firestore.collection("works").get();
	const batch = firestore.batch();
	let batchCount = 0;

	for (const workDoc of worksSnapshot.docs) {
		result.checks.workCircleConsistency.checked++;

		const workData = workDoc.data();
		const circleId = workData.circleId;

		if (!circleId) {
			logger.warn(`Work ${workDoc.id}: サークルIDが未設定`);
			result.checks.workCircleConsistency.mismatches++;
			continue;
		}

		// サークルの存在確認
		const circleDoc = await firestore.collection("circles").doc(circleId).get();

		if (!circleDoc.exists) {
			logger.warn(`Work ${workDoc.id}: 存在しないサークル ${circleId} を参照`);
			result.checks.workCircleConsistency.mismatches++;
			// この場合は修正できないので記録のみ
			continue;
		}

		// サークルのworkIds配列に含まれているか確認
		const circleData = circleDoc.data();
		const workIds = circleData?.workIds || [];

		if (!workIds.includes(workDoc.id)) {
			logger.warn(`Work ${workDoc.id}: サークル ${circleId} のworkIds配列に含まれていない`);
			result.checks.workCircleConsistency.mismatches++;

			// サークル側に追加
			batch.update(circleDoc.ref, {
				workIds: [...workIds, workDoc.id],
				updatedAt: Timestamp.now(),
			});

			result.checks.workCircleConsistency.fixed++;
			batchCount++;

			if (batchCount >= 400) {
				await batch.commit();
				batchCount = 0;
			}
		}
	}

	if (batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`Work-Circle整合性チェック完了: ${result.checks.workCircleConsistency.checked}件チェック、${result.checks.workCircleConsistency.fixed}件修正`,
	);
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
 * Cloud Functions エントリーポイント
 */
export async function checkDataIntegrity(event: CloudEvent<unknown>): Promise<void> {
	const startTime = Date.now();

	logger.info("データ整合性チェックを開始", { eventType: event.type });

	const result: IntegrityCheckResult = {
		timestamp: new Date().toISOString(),
		checks: {
			circleWorkCounts: { checked: 0, mismatches: 0, fixed: 0 },
			orphanedCreators: { checked: 0, found: 0, cleaned: 0 },
			workCircleConsistency: { checked: 0, mismatches: 0, fixed: 0 },
		},
		totalIssues: 0,
		totalFixed: 0,
		executionTimeMs: 0,
	};

	try {
		// 1. CircleのworkIds配列の整合性チェック
		await checkCircleWorkCounts(result);

		// 2. 孤立したCreatorマッピングのクリーンアップ
		await checkOrphanedCreators(result);

		// 3. Work-Circle相互参照の整合性
		await checkWorkCircleConsistency(result);

		// 総計を計算
		result.totalIssues =
			result.checks.circleWorkCounts.mismatches +
			result.checks.orphanedCreators.found +
			result.checks.workCircleConsistency.mismatches;

		result.totalFixed =
			result.checks.circleWorkCounts.fixed +
			result.checks.orphanedCreators.cleaned +
			result.checks.workCircleConsistency.fixed;

		result.executionTimeMs = Date.now() - startTime;

		// 結果を保存
		await saveIntegrityCheckResult(result);

		logger.info("データ整合性チェック完了", {
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
