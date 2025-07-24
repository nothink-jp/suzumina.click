/**
 * レガシーフィールドクリーンアップスクリプト
 *
 * Firestoreから下位互換フィールドを削除するバッチ処理
 * 実行前に必ずバックアップを取得すること
 */

import { FieldValue } from "@google-cloud/firestore";
import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

/**
 * 削除対象のレガシーフィールド
 */
const LEGACY_FIELDS_TO_DELETE = [
	"totalDownloadCount", // salesCount機能廃止に伴い削除
	"bonusContent", // Individual Info APIでは取得不可
	"isExclusive", // 使用されていない
	"apiGenres", // 重複データ（genres で十分）
	"apiCustomGenres", // 重複データ（genres で十分）
	"apiWorkOptions", // 重複データ（workFormat で十分）
] as const;

/**
 * 単一ドキュメントのレガシーフィールドを削除
 */
async function cleanupDocument(
	docRef: FirebaseFirestore.DocumentReference,
	fieldsToDelete: string[],
): Promise<boolean> {
	try {
		const updateData: Record<string, any> = {};

		// 削除フィールドを FieldValue.delete() で設定
		for (const field of fieldsToDelete) {
			updateData[field] = FieldValue.delete();
		}

		await docRef.update(updateData);
		return true;
	} catch (error) {
		logger.error(`Failed to cleanup document ${docRef.id}:`, error);
		return false;
	}
}

/**
 * バッチ処理でレガシーフィールドを削除
 */
export async function cleanupLegacyFields(
	options: { dryRun?: boolean; batchSize?: number; limit?: number } = {},
): Promise<{
	totalProcessed: number;
	successCount: number;
	failureCount: number;
	deletedFields: Record<string, number>;
}> {
	const { dryRun = false, batchSize = 500, limit } = options;

	logger.info("Starting legacy field cleanup", {
		dryRun,
		batchSize,
		limit,
		targetFields: LEGACY_FIELDS_TO_DELETE,
	});

	const collection = firestore.collection("dlsiteWorks");
	let totalProcessed = 0;
	let successCount = 0;
	let failureCount = 0;
	const deletedFields: Record<string, number> = {};

	// 各フィールドの削除カウントを初期化
	for (const field of LEGACY_FIELDS_TO_DELETE) {
		deletedFields[field] = 0;
	}

	let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;

	while (true) {
		// クエリの構築
		let query = collection.orderBy("__name__").limit(batchSize);
		if (lastDoc) {
			query = query.startAfter(lastDoc);
		}

		const snapshot = await query.get();
		if (snapshot.empty) {
			break;
		}

		// バッチ処理の準備
		const batch = firestore.batch();
		let batchCount = 0;

		for (const doc of snapshot.docs) {
			totalProcessed++;

			if (limit && totalProcessed > limit) {
				break;
			}

			const data = doc.data();

			// 削除対象フィールドの存在確認
			const fieldsToDelete: string[] = [];
			for (const field of LEGACY_FIELDS_TO_DELETE) {
				if (field in data) {
					fieldsToDelete.push(field);
					if (deletedFields[field] !== undefined) {
						deletedFields[field]++;
					}
				}
			}

			// 削除対象がある場合のみ処理
			if (fieldsToDelete.length > 0) {
				if (!dryRun) {
					const updateData: Record<string, any> = {};
					for (const field of fieldsToDelete) {
						updateData[field] = FieldValue.delete();
					}
					batch.update(doc.ref, updateData);
					batchCount++;
				}

				logger.debug(`Document ${doc.id} has legacy fields:`, { fieldsToDelete });
			}
		}

		// バッチコミット
		if (batchCount > 0 && !dryRun) {
			try {
				await batch.commit();
				successCount += batchCount;
				logger.info(`Batch committed: ${batchCount} documents updated`);
			} catch (error) {
				failureCount += batchCount;
				logger.error("Batch commit failed:", error);
			}
		} else if (dryRun) {
			successCount += batchCount;
		}

		// 進捗ログ
		if (totalProcessed % 1000 === 0) {
			logger.info(`Progress: ${totalProcessed} documents processed`);
		}

		// 最後のドキュメントを記録
		lastDoc = snapshot.docs[snapshot.docs.length - 1];

		// リミットに達した場合は終了
		if (limit && totalProcessed >= limit) {
			break;
		}
	}

	const result = {
		totalProcessed,
		successCount,
		failureCount,
		deletedFields,
	};

	logger.info("Legacy field cleanup completed", result);

	return result;
}

/**
 * 特定の作品IDのレガシーフィールドを削除
 */
export async function cleanupLegacyFieldsForWork(
	workId: string,
	dryRun = false,
): Promise<{
	success: boolean;
	deletedFields: string[];
}> {
	try {
		const docRef = firestore.collection("dlsiteWorks").doc(workId);
		const doc = await docRef.get();

		if (!doc.exists) {
			return {
				success: false,
				deletedFields: [],
			};
		}

		const data = doc.data()!;
		const deletedFields: string[] = [];

		// 削除対象フィールドの確認
		for (const field of LEGACY_FIELDS_TO_DELETE) {
			if (field in data) {
				deletedFields.push(field);
			}
		}

		if (deletedFields.length === 0) {
			return {
				success: true,
				deletedFields: [],
			};
		}

		// 削除実行
		if (!dryRun) {
			const success = await cleanupDocument(docRef, deletedFields);
			return {
				success,
				deletedFields: success ? deletedFields : [],
			};
		}

		return {
			success: true,
			deletedFields,
		};
	} catch (error) {
		logger.error(`Failed to cleanup work ${workId}:`, error);
		return {
			success: false,
			deletedFields: [],
		};
	}
}

/**
 * レガシーフィールドの使用状況を分析
 */
export async function analyzeLegacyFieldUsage(): Promise<{
	totalDocuments: number;
	fieldUsage: Record<string, number>;
	sampleDocuments: Record<string, string[]>;
}> {
	logger.info("Analyzing legacy field usage");

	const collection = firestore.collection("dlsiteWorks");
	let totalDocuments = 0;
	const fieldUsage: Record<string, number> = {};
	const sampleDocuments: Record<string, string[]> = {};

	// 初期化
	for (const field of LEGACY_FIELDS_TO_DELETE) {
		fieldUsage[field] = 0;
		sampleDocuments[field] = [];
	}

	let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;

	while (true) {
		let query = collection.orderBy("__name__").limit(500);
		if (lastDoc) {
			query = query.startAfter(lastDoc);
		}

		const snapshot = await query.get();
		if (snapshot.empty) {
			break;
		}

		for (const doc of snapshot.docs) {
			totalDocuments++;
			const data = doc.data();

			for (const field of LEGACY_FIELDS_TO_DELETE) {
				if (field in data) {
					if (fieldUsage[field] !== undefined) {
						fieldUsage[field]++;
					}

					// サンプルドキュメントIDを記録（最大5つ）
					const samples = sampleDocuments[field];
					if (samples && samples.length < 5) {
						samples.push(doc.id);
					}
				}
			}
		}

		lastDoc = snapshot.docs[snapshot.docs.length - 1];
	}

	const result = {
		totalDocuments,
		fieldUsage,
		sampleDocuments,
	};

	logger.info("Legacy field usage analysis completed", result);

	return result;
}
