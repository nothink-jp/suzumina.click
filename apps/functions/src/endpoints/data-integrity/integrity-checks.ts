/**
 * データ整合性検証: 4種の検査・修復関数
 *
 * - CircleのworkIds配列の整合性
 * - 孤立したCreatorマッピングのクリーンアップ
 * - Work-Circle相互参照の整合性
 * - Creator-Work関連の復元
 *
 * 実行順序と結果集計はオーケストレータ（run-integrity-check.ts）が担う。
 */

import type { DocumentReference, WriteBatch } from "@google-cloud/firestore";
import type { CreatorType, CreatorWorkRelation } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import {
	extractCreatorMappingsFromWorkDocument,
	recomputeCreatorStats,
} from "../../services/dlsite/creator-firestore";
import * as logger from "../../shared/logger";

// Firestoreバッチ操作の制限値（500より少し余裕を持たせた値）
// 分割コミットの境界。テストはこの値+1で分割パスを確実に踏むため export する。
export const FIRESTORE_BATCH_LIMIT = 400;

/**
 * バッチをコミットして新しい空バッチを返す。
 *
 * @google-cloud/firestore では commit 済みの WriteBatch に再度書き込む／コミットすると
 * 例外（Cannot modify a WriteBatch that has been committed）になる。
 * 400件ごとの分割コミットのたびに、このヘルパで必ず新しいバッチへ差し替えること。
 */
async function commitAndRenew(batch: WriteBatch): Promise<WriteBatch> {
	await batch.commit();
	return firestore.batch();
}

/**
 * 整合性チェック結果の型定義
 */
export interface IntegrityCheckResult {
	timestamp: string;
	/** report-only モードで実行されたか（書き込みをスキップしたか） */
	dryRun: boolean;
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
		creatorWorkRestore?: {
			checked: number;
			restored: number;
			creatorsCreated: number;
		};
	};
	totalIssues: number;
	totalFixed: number;
	executionTimeMs: number;
}

/**
 * CircleのworkIds配列の整合性をチェック
 */
export async function checkCircleWorkCounts(
	result: IntegrityCheckResult,
	dryRun: boolean,
): Promise<void> {
	logger.info("CircleのworkIds配列の整合性チェックを開始");

	const circlesSnapshot = await firestore.collection("circles").get();
	let batch = firestore.batch();
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
			if (!dryRun && batchCount >= FIRESTORE_BATCH_LIMIT) {
				batch = await commitAndRenew(batch);
				batchCount = 0;
			}
		}

		// 存在しない作品IDのチェック
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

			if (!dryRun && batchCount >= FIRESTORE_BATCH_LIMIT) {
				batch = await commitAndRenew(batch);
				batchCount = 0;
			}
		}
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`CircleのworkIds配列チェック完了: ${result.checks.circleWorkCounts.checked}件チェック、${result.checks.circleWorkCounts.fixed}件${dryRun ? "要修正" : "修正"}`,
	);
}

/**
 * 孤立したCreatorマッピングをチェック
 */
export async function checkOrphanedCreators(
	result: IntegrityCheckResult,
	dryRun: boolean,
): Promise<void> {
	logger.info("孤立したCreatorマッピングのチェックを開始");

	const creatorsSnapshot = await firestore.collection("creators").get();
	let batch = firestore.batch();
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

				if (!dryRun && batchCount >= FIRESTORE_BATCH_LIMIT) {
					batch = await commitAndRenew(batch);
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

			if (!dryRun && batchCount >= FIRESTORE_BATCH_LIMIT) {
				batch = await commitAndRenew(batch);
				batchCount = 0;
			}
		}
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`孤立Creatorチェック完了: ${result.checks.orphanedCreators.checked}件チェック、${result.checks.orphanedCreators.cleaned}件${dryRun ? "要クリーンアップ" : "クリーンアップ"}`,
	);
}

/**
 * クリエイター情報の復元に関する統計
 */
interface RestoreStats {
	restoredCount: number;
	creatorsCreated: number;
	batchCount: number;
}

/**
 * Creatorドキュメントを作成または確認
 */
async function ensureCreatorExists(
	creatorId: string,
	creatorName: string,
	type: string,
	batch: WriteBatch,
	processedCreators: Set<string>,
	stats: RestoreStats,
): Promise<DocumentReference> {
	const creatorRef = firestore.collection("creators").doc(creatorId);

	if (!processedCreators.has(creatorId)) {
		const creatorDoc = await creatorRef.get();

		if (!creatorDoc.exists) {
			logger.info(`Creatorドキュメント作成: ${creatorId} - ${creatorName}`);

			batch.set(creatorRef, {
				creatorId: creatorId,
				name: creatorName,
				primaryRole: type,
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			});

			stats.creatorsCreated++;
			stats.batchCount++;
		}
		processedCreators.add(creatorId);
	}

	return creatorRef;
}

/**
 * Creator-Workマッピングを復元
 */
async function restoreCreatorWorkMapping(
	creatorRef: DocumentReference,
	workId: string,
	roles: CreatorType[],
	circleId: string,
	batch: WriteBatch,
	stats: RestoreStats,
): Promise<boolean> {
	const mappingRef = creatorRef.collection("works").doc(workId);
	const mappingDoc = await mappingRef.get();

	if (mappingDoc.exists) {
		return false;
	}

	logger.info(`マッピング復元: Creator ${creatorRef.id} - Work ${workId} (${roles.join(", ")})`);

	// 正本スキーマ（CreatorWorkRelation）に一致させる: roles 配列を必ず含める。
	// web の読み手は workRelation.roles を参照するため、旧フラット形式では役割ゼロ扱いになる。
	const relation: CreatorWorkRelation = {
		workId,
		roles,
		circleId: circleId || "UNKNOWN",
		updatedAt: Timestamp.now(),
	};
	batch.set(mappingRef, relation);

	stats.restoredCount++;
	stats.batchCount++;
	return true;
}

/**
 * バッチが満杯の場合はコミットし、新しい空バッチを返す（dryRun の場合は書き込まない）。
 *
 * commit 済みの WriteBatch は再利用できないため、呼び出し側は必ず戻り値で
 * バッチを差し替えること（`batch = await commitBatchIfNeeded(batch, ...)`）。
 */
async function commitBatchIfNeeded(
	batch: WriteBatch,
	stats: RestoreStats,
	force = false,
	dryRun = false,
): Promise<WriteBatch> {
	if (dryRun) {
		return batch;
	}
	if (stats.batchCount >= FIRESTORE_BATCH_LIMIT || (force && stats.batchCount > 0)) {
		await batch.commit();
		stats.batchCount = 0;
		return firestore.batch();
	}
	return batch;
}

/**
 * 削除されたCreator-Work関連を復元
 */
export async function restoreCreatorWorkRelations(
	result: IntegrityCheckResult,
	dryRun: boolean,
): Promise<void> {
	logger.info("Creator-Work関連の復元を開始");

	const worksSnapshot = await firestore.collection("works").get();
	let batch = firestore.batch();
	const processedCreators = new Set<string>();
	const creatorsToRecompute = new Set<string>();

	const stats: RestoreStats = {
		restoredCount: 0,
		creatorsCreated: 0,
		batchCount: 0,
	};

	for (const workDoc of worksSnapshot.docs) {
		const workData = workDoc.data();

		// WorkDocument.creators からクリエイターごとに役割を集約（正本スキーマに一致させる）。
		// フィールド表は creator-firestore に一本化（created_by 含む WorkDocument 用）。
		const creatorMappings = extractCreatorMappingsFromWorkDocument(workData.creators);
		if (creatorMappings.size === 0) {
			continue;
		}

		for (const [creatorId, mapping] of creatorMappings) {
			// Creatorドキュメントの確認・作成
			const creatorRef = await ensureCreatorExists(
				creatorId,
				mapping.name,
				mapping.roles[0] ?? "other",
				batch,
				processedCreators,
				stats,
			);

			// バッチサイズチェック
			batch = await commitBatchIfNeeded(batch, stats, false, dryRun);

			// Creator-Workマッピングの復元（roles 配列を含む正本スキーマで書く）
			const restored = await restoreCreatorWorkMapping(
				creatorRef,
				workDoc.id,
				mapping.roles,
				workData.circleId,
				batch,
				stats,
			);
			if (restored) {
				creatorsToRecompute.add(creatorId);
			}

			// バッチサイズチェック
			batch = await commitBatchIfNeeded(batch, stats, false, dryRun);
		}
	}

	// 残りのバッチをコミット
	batch = await commitBatchIfNeeded(batch, stats, true, dryRun);

	// 復元したクリエイターの denormalized stats（workCount/types/primaryRole）を同期する。
	// /creators の読み込みパスがこれらを使うため、復元時にも正本ライタと同様に再計算が必要。
	// dryRun では書き込まないので再計算もしない（未コミットの relation を読んでしまうため）。
	if (!dryRun && creatorsToRecompute.size > 0) {
		const recomputeResults = await Promise.allSettled(
			Array.from(creatorsToRecompute).map((creatorId) => recomputeCreatorStats(creatorId)),
		);
		const failed = recomputeResults.filter((r) => r.status === "rejected").length;
		if (failed > 0) {
			logger.warn(`クリエイター集計再計算で ${failed} 件失敗`);
		}
	}

	// 結果に追加
	result.checks.creatorWorkRestore = {
		checked: worksSnapshot.size,
		restored: stats.restoredCount,
		creatorsCreated: stats.creatorsCreated,
	};

	logger.info(
		`Creator-Work関連復元完了: ${worksSnapshot.size}件チェック、${stats.restoredCount}件マッピング${dryRun ? "要復元" : "復元"}、${stats.creatorsCreated}件Creator${dryRun ? "要作成" : "作成"}`,
	);
}

/**
 * Work-Circle相互参照の整合性をチェック
 */
export async function checkWorkCircleConsistency(
	result: IntegrityCheckResult,
	dryRun: boolean,
): Promise<void> {
	logger.info("Work-Circle相互参照の整合性チェックを開始");

	const worksSnapshot = await firestore.collection("works").get();
	let batch = firestore.batch();
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

			if (!dryRun && batchCount >= FIRESTORE_BATCH_LIMIT) {
				batch = await commitAndRenew(batch);
				batchCount = 0;
			}
		}
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
	}

	logger.info(
		`Work-Circle整合性チェック完了: ${result.checks.workCircleConsistency.checked}件チェック、${result.checks.workCircleConsistency.fixed}件${dryRun ? "要修正" : "修正"}`,
	);
}
