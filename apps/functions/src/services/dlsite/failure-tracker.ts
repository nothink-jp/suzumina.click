/**
 * DLsite Individual Info API 失敗作品追跡システム
 * Cloud Functions で失敗した作品IDを記録・管理
 */

import { FieldValue } from "@google-cloud/firestore";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

/**
 * 失敗作品追跡データ
 */
export interface FailedWorkTracker {
	workId: string;
	failureCount: number;
	lastFailedAt: Timestamp;
	firstFailedAt: Timestamp;
	failureReason: string;
	lastSuccessfulAt?: Timestamp;
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

/**
 * 失敗理由カテゴリ
 */
export const FAILURE_REASONS = {
	TIMEOUT: "timeout",
	NETWORK_ERROR: "network_error",
	API_ERROR: "api_error",
	PARSING_ERROR: "parsing_error",
	RATE_LIMIT: "rate_limit",
	REGION_RESTRICTION: "region_restriction",
	UNKNOWN: "unknown",
} as const;

export type FailureReason = (typeof FAILURE_REASONS)[keyof typeof FAILURE_REASONS];

const FAILED_WORKS_COLLECTION = "dlsite_failed_works";

/**
 * 失敗作品を追跡システムに記録
 */
export async function trackFailedWork(
	workId: string,
	reason: FailureReason,
	errorDetails?: string,
): Promise<void> {
	try {
		const collection = firestore.collection(FAILED_WORKS_COLLECTION);
		const docRef = collection.doc(workId);

		await docRef.set(
			{
				workId,
				failureCount: FieldValue.increment(1),
				lastFailedAt: FieldValue.serverTimestamp(),
				failureReason: reason,
				errorDetails,
				updatedAt: FieldValue.serverTimestamp(),
			},
			{ merge: true },
		);

		// 初回失敗の場合は firstFailedAt も設定
		const doc = await docRef.get();
		if (!doc.exists || !doc.data()?.firstFailedAt) {
			await docRef.update({
				firstFailedAt: FieldValue.serverTimestamp(),
				createdAt: FieldValue.serverTimestamp(),
			});
		}

		logger.info("失敗作品追跡記録完了", {
			operation: "trackFailedWork",
			workId,
			reason,
			errorDetails,
		});
	} catch (error) {
		logger.error("失敗作品追跡記録エラー", {
			operation: "trackFailedWork",
			workId,
			reason,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 複数の失敗作品を一括記録
 */
export async function trackMultipleFailedWorks(
	failures: Array<{ workId: string; reason: FailureReason; errorDetails?: string }>,
): Promise<void> {
	if (failures.length === 0) return;

	try {
		const batch = firestore.batch();
		const collection = firestore.collection(FAILED_WORKS_COLLECTION);

		for (const failure of failures) {
			const docRef = collection.doc(failure.workId);
			batch.set(
				docRef,
				{
					workId: failure.workId,
					failureCount: FieldValue.increment(1),
					lastFailedAt: FieldValue.serverTimestamp(),
					failureReason: failure.reason,
					errorDetails: failure.errorDetails,
					updatedAt: FieldValue.serverTimestamp(),
				},
				{ merge: true },
			);
		}

		await batch.commit();

		// 初回失敗の記録は個別処理
		for (const failure of failures) {
			const docRef = collection.doc(failure.workId);
			const doc = await docRef.get();
			if (!doc.exists || !doc.data()?.firstFailedAt) {
				await docRef.update({
					firstFailedAt: FieldValue.serverTimestamp(),
					createdAt: FieldValue.serverTimestamp(),
				});
			}
		}

		logger.info("失敗作品一括追跡記録完了", {
			operation: "trackMultipleFailedWorks",
			count: failures.length,
			workIds: failures.slice(0, 5).map((f) => f.workId), // 最初の5件のみログ
		});
	} catch (error) {
		logger.error("失敗作品一括追跡記録エラー", {
			operation: "trackMultipleFailedWorks",
			count: failures.length,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 失敗統計情報を取得
 */
export async function getFailureStatistics(): Promise<{
	totalFailedWorks: number;
	recoveredWorks: number;
	unrecoveredWorks: number;
	failureReasons: Record<string, number>;
}> {
	try {
		const collection = firestore.collection(FAILED_WORKS_COLLECTION);
		const snapshot = await collection.get();

		let totalFailedWorks = 0;
		const recoveredWorks = 0;
		let unrecoveredWorks = 0;
		const failureReasons: Record<string, number> = {};

		for (const doc of snapshot.docs) {
			const data = doc.data() as FailedWorkTracker;
			totalFailedWorks++;

			// 全て未回復として扱う（supplementツール削除により）
			unrecoveredWorks++;

			const reason = data.failureReason || "unknown";
			failureReasons[reason] = (failureReasons[reason] || 0) + 1;
		}

		const statistics = {
			totalFailedWorks,
			recoveredWorks,
			unrecoveredWorks,
			failureReasons,
		};

		logger.info("失敗統計情報取得完了", {
			operation: "getFailureStatistics",
			statistics,
		});

		return statistics;
	} catch (error) {
		logger.error("失敗統計情報取得エラー", {
			operation: "getFailureStatistics",
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * 古い失敗記録をクリーンアップ
 */
export async function cleanupOldFailureRecords(daysToKeep = 30): Promise<number> {
	try {
		const collection = firestore.collection(FAILED_WORKS_COLLECTION);
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
		const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

		const snapshot = await collection
			.where("lastFailedAt", "<", cutoffTimestamp)
			// isLocalSuccessfulフィールドは削除済み
			.where("lastFailedAt", "<", cutoffTimestamp)
			.limit(500)
			.get();

		if (snapshot.empty) {
			return 0;
		}

		const batch = firestore.batch();
		for (const doc of snapshot.docs) {
			batch.delete(doc.ref);
		}

		await batch.commit();

		logger.info("古い失敗記録クリーンアップ完了", {
			operation: "cleanupOldFailureRecords",
			deletedCount: snapshot.size,
			daysToKeep,
		});

		return snapshot.size;
	} catch (error) {
		logger.error("古い失敗記録クリーンアップエラー", {
			operation: "cleanupOldFailureRecords",
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
