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

import type { DocumentData, DocumentReference, UpdateData } from "@google-cloud/firestore";
import type { CreatorType, CreatorWorkRelation } from "@suzumina.click/shared-types";
import firestore, { FieldValue, Timestamp } from "../../infrastructure/database/firestore";
import {
	extractCreatorMappingsFromWorkDocument,
	recomputeCreatorStats,
} from "../../services/dlsite/creator-firestore";
import * as logger from "../../shared/logger";

// Firestoreバッチ操作の制限値（500より少し余裕を持たせた値）
// 分割コミットの境界。テストはこの値+1で分割パスを確実に踏むため export する。
export const FIRESTORE_BATCH_LIMIT = 400;

/**
 * {@link FIRESTORE_BATCH_LIMIT} 件ごとに分割コミットする書き込み器（各チェック共通）
 */
interface ChunkedBatchWriter {
	set(ref: DocumentReference, data: DocumentData): Promise<void>;
	update(ref: DocumentReference, data: UpdateData<DocumentData>): Promise<void>;
	delete(ref: DocumentReference): Promise<void>;
	/** 残りを commit する。各チェックの最後に必ず呼ぶ */
	flush(): Promise<void>;
}

/**
 * 分割コミットの書き込み器を作る。
 *
 * - 書き込みは積んだ順に commit される（分割されたときは前の chunk が先）。
 *   順序に依存する箇所がある（checkOrphanedCreators の関連 → creator doc）
 * - dryRun では積むだけで commit しない（検出と件数の集計だけ行う）
 * - commit 済みの WriteBatch は再利用できない（Cannot modify a WriteBatch that has been
 *   committed）ため、分割のたびに新しい batch に差し替える
 */
function createChunkedBatchWriter(dryRun: boolean): ChunkedBatchWriter {
	let batch = firestore.batch();
	let count = 0;

	const afterWrite = async (): Promise<void> => {
		count++;
		if (!dryRun && count >= FIRESTORE_BATCH_LIMIT) {
			await batch.commit();
			batch = firestore.batch();
			count = 0;
		}
	};

	return {
		async set(ref, data) {
			batch.set(ref, data);
			await afterWrite();
		},
		async update(ref, data) {
			batch.update(ref, data);
			await afterWrite();
		},
		async delete(ref) {
			batch.delete(ref);
			await afterWrite();
		},
		async flush() {
			if (!dryRun && count > 0) {
				await batch.commit();
				batch = firestore.batch();
				count = 0;
			}
		},
	};
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
 *
 * 重複・存在しない作品・別サークルへ移った作品（work の circleId が別サークル）を workIds から外す。
 */
export async function checkCircleWorkCounts(
	result: IntegrityCheckResult,
	dryRun: boolean,
): Promise<void> {
	logger.info("CircleのworkIds配列の整合性チェックを開始");

	const circlesSnapshot = await firestore.collection("circles").get();
	const writer = createChunkedBatchWriter(dryRun);

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
			result.checks.circleWorkCounts.fixed++;
		}

		// 存在しない作品・別サークルへ移った作品（SPR-384）のチェック。
		// 後者は同期（removeWorkFromCircle）が外すが、同期失敗と修正前に移った分はここで直す。
		// 作品 doc はどちらの判定でも 1 回の get で足りる（追加の読み取りは無い）。
		const keptWorkIds: string[] = [];
		for (const workId of uniqueWorkIds) {
			const workDoc = await firestore
				.collection("works")
				.doc(workId as string)
				.get();
			const workCircleId = workDoc.exists ? workDoc.data()?.circleId : undefined;
			if (!workDoc.exists) {
				logger.warn(`Circle ${circleDoc.id}: 存在しない作品ID ${workId} を検出`);
				result.checks.circleWorkCounts.mismatches++;
			} else if (workCircleId && workCircleId !== circleDoc.id) {
				logger.warn(
					`Circle ${circleDoc.id}: 別サークル ${workCircleId} に移った作品ID ${workId} を検出`,
				);
				result.checks.circleWorkCounts.mismatches++;
			} else {
				keptWorkIds.push(workId as string);
			}
		}

		if (keptWorkIds.length !== uniqueWorkIds.length) {
			result.checks.circleWorkCounts.fixed++;
		}

		// 重複の除去と除外は、最終的な配列 1 回の update にまとめて書く
		if (keptWorkIds.length !== workIds.length) {
			await writer.update(circleDoc.ref, {
				workIds: keptWorkIds,
				updatedAt: Timestamp.now(),
			});
		}
	}

	await writer.flush();

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
	const writer = createChunkedBatchWriter(dryRun);

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

				await writer.delete(workMapping.ref);
				result.checks.orphanedCreators.cleaned++;
			} else {
				hasValidWork = true;
			}
		}

		// 作品が1つもないクリエイターは削除。関連（上のループで batch に積み済み）より後に積むこと:
		// 同期（applyNewCreatorMappings）は「関連があれば creator doc もある」前提で
		// 存在確認の get を省いている（SPR-387）
		if (!hasValidWork && worksSnapshot.size > 0) {
			logger.warn(`Creator ${creatorDoc.id}: 有効な作品がないため削除`);
			await writer.delete(creatorDoc.ref);
			result.checks.orphanedCreators.cleaned++;
		}
	}

	await writer.flush();

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
}

/**
 * Creatorドキュメントを作成または確認
 */
async function ensureCreatorExists(
	creatorId: string,
	creatorName: string,
	type: string,
	writer: ChunkedBatchWriter,
	processedCreators: Set<string>,
	stats: RestoreStats,
): Promise<DocumentReference> {
	const creatorRef = firestore.collection("creators").doc(creatorId);

	if (!processedCreators.has(creatorId)) {
		const creatorDoc = await creatorRef.get();

		if (!creatorDoc.exists) {
			logger.info(`Creatorドキュメント作成: ${creatorId} - ${creatorName}`);

			await writer.set(creatorRef, {
				creatorId: creatorId,
				name: creatorName,
				primaryRole: type,
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			});

			stats.creatorsCreated++;
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
	writer: ChunkedBatchWriter,
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
	await writer.set(mappingRef, relation);

	stats.restoredCount++;
	return true;
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
	const writer = createChunkedBatchWriter(dryRun);
	const processedCreators = new Set<string>();
	const creatorsToRecompute = new Set<string>();

	const stats: RestoreStats = {
		restoredCount: 0,
		creatorsCreated: 0,
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
				writer,
				processedCreators,
				stats,
			);

			// Creator-Workマッピングの復元（roles 配列を含む正本スキーマで書く）
			const restored = await restoreCreatorWorkMapping(
				creatorRef,
				workDoc.id,
				mapping.roles,
				workData.circleId,
				writer,
				stats,
			);
			if (restored) {
				creatorsToRecompute.add(creatorId);
			}
		}
	}

	await writer.flush();

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
	const writer = createChunkedBatchWriter(dryRun);

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

			// サークル側に追加。arrayUnion にするのは、同じサークルに足す作品が 1 run で複数あると
			// 読んだ時点の配列から作り直す書き方では同じバッチ内で後の update が前を上書きし、
			// 最後の 1 件しか残らないため（SPR-384: 前サークルからの除外と組み合わさると作品が消える）
			await writer.update(circleDoc.ref, {
				workIds: FieldValue.arrayUnion(workDoc.id),
				updatedAt: Timestamp.now(),
			});

			result.checks.workCircleConsistency.fixed++;
		}
	}

	await writer.flush();

	logger.info(
		`Work-Circle整合性チェック完了: ${result.checks.workCircleConsistency.checked}件チェック、${result.checks.workCircleConsistency.fixed}件${dryRun ? "要修正" : "修正"}`,
	);
}
