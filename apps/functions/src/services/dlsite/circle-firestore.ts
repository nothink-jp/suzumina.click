/**
 * Circle Firestore ユーティリティ関数
 *
 * プロジェクトの薄い設計パターンに従い、シンプルなユーティリティ関数として実装
 * リポジトリパターンは使用せず、直接的なFirestore操作を提供
 */

import type { CircleDocument } from "@suzumina.click/shared-types";
import firestore, { FieldValue, Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

const CIRCLES_COLLECTION = "circles";

/**
 * サークルに作品を追加（重複チェック付き）
 *
 * @param circleId - サークルID
 * @param workId - 作品ID
 * @param circleName - サークル名
 * @param circleNameEn - サークル名（英語）
 * @returns 更新が成功したかどうか
 */
export async function updateCircleWithWork(
	circleId: string,
	workId: string,
	circleName: string,
	circleNameEn: string,
): Promise<boolean> {
	try {
		const circleRef = firestore.collection(CIRCLES_COLLECTION).doc(circleId);
		const doc = await circleRef.get();

		if (!doc.exists) {
			// 新規作成
			const newCircle: CircleDocument = {
				circleId,
				name: circleName,
				nameEn: circleNameEn,
				workIds: [workId],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now(),
			};
			await circleRef.set(newCircle);
			logger.debug(`新規サークル作成: ${circleId} - ${circleName}`);
			return true;
		}

		// 既存サークルの更新
		const data = doc.data() as CircleDocument;

		// 名前の更新が必要かチェック
		const needsNameUpdate = data.name !== circleName || data.nameEn !== circleNameEn;

		// workIdsがundefinedの場合は空配列として扱う（後方互換性）
		const currentWorkIds = data.workIds || [];
		const needsWorkIdUpdate = !currentWorkIds.includes(workId);
		const needsWorkIdsInit = !data.workIds; // workIdsフィールドが存在しない

		if (needsNameUpdate || needsWorkIdUpdate || needsWorkIdsInit) {
			const updateData: Partial<CircleDocument> = {
				updatedAt: Timestamp.now(),
			};

			if (needsNameUpdate) {
				updateData.name = circleName;
				updateData.nameEn = circleNameEn;
			}

			if (needsWorkIdsInit) {
				// workIdsフィールドが存在しない場合は初期化
				updateData.workIds = [workId];
				logger.info(`workIds初期化: ${circleId} - 最初の作品: ${workId}`);
			}

			// 基本的な更新を実行
			await circleRef.update(updateData);

			// workIdの追加が必要な場合は、arrayUnionで別途更新
			if (!needsWorkIdsInit && needsWorkIdUpdate) {
				await circleRef.update({
					workIds: FieldValue.arrayUnion(workId),
				});
			}

			logger.debug(
				`サークル更新: ${circleId} - 名前更新: ${needsNameUpdate}, 作品追加: ${needsWorkIdUpdate}`,
			);
			return true;
		}

		return false;
	} catch (error) {
		logger.error(`サークル更新エラー: ${circleId}`, {
			error: error instanceof Error ? error.message : String(error),
			workId,
			circleName,
		});
		throw error;
	}
}

/**
 * サークルから作品を削除
 *
 * @param circleId - サークルID
 * @param workId - 作品ID
 * @returns 削除が成功したかどうか
 */
export async function removeWorkFromCircle(circleId: string, workId: string): Promise<boolean> {
	try {
		const circleRef = firestore.collection(CIRCLES_COLLECTION).doc(circleId);
		const doc = await circleRef.get();

		if (!doc.exists) {
			logger.warn(`サークルが存在しません: ${circleId}`);
			return false;
		}

		const data = doc.data() as CircleDocument;
		const currentWorkIds = data.workIds || [];

		if (!currentWorkIds.includes(workId)) {
			logger.debug(`作品がサークルに存在しません: ${circleId} - ${workId}`);
			return false;
		}

		// FieldValue.arrayRemoveを使用
		await circleRef.update({
			workIds: FieldValue.arrayRemove(workId),
			updatedAt: Timestamp.now(),
		});

		logger.debug(`サークルから作品削除: ${circleId} - ${workId}`);
		return true;
	} catch (error) {
		logger.error(`サークルからの作品削除エラー: ${circleId} - ${workId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * サークルの作品数を取得（配列長から計算）
 *
 * @param circleId - サークルID
 * @returns 作品数（サークルが存在しない場合は0）
 */
export async function getCircleWorkCount(circleId: string): Promise<number> {
	try {
		const circleRef = firestore.collection(CIRCLES_COLLECTION).doc(circleId);
		const doc = await circleRef.get();

		if (!doc.exists) {
			return 0;
		}

		const data = doc.data() as CircleDocument;

		// workIdsから作品数を計算
		if (data.workIds && Array.isArray(data.workIds)) {
			return data.workIds.length;
		}

		return 0;
	} catch (error) {
		logger.error(`サークル作品数取得エラー: ${circleId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return 0;
	}
}

/**
 * 複数のサークルを一括で取得
 *
 * @param circleIds - サークルIDの配列
 * @returns サークルIDをキーとしたCircleDocumentのMap
 */
export async function getCirclesByIds(circleIds: string[]): Promise<Map<string, CircleDocument>> {
	const results = new Map<string, CircleDocument>();

	if (circleIds.length === 0) {
		return results;
	}

	try {
		// Firestoreの制限（whereIn最大10個）を考慮してバッチ処理
		const batchSize = 10;
		const batches: string[][] = [];

		for (let i = 0; i < circleIds.length; i += batchSize) {
			batches.push(circleIds.slice(i, i + batchSize));
		}

		await Promise.all(
			batches.map(async (batch) => {
				const snapshot = await firestore
					.collection(CIRCLES_COLLECTION)
					.where("circleId", "in", batch)
					.get();

				snapshot.forEach((doc) => {
					const data = doc.data() as CircleDocument;
					results.set(data.circleId, data);
				});
			}),
		);

		return results;
	} catch (error) {
		logger.error("サークル一括取得エラー", {
			error: error instanceof Error ? error.message : String(error),
			circleCount: circleIds.length,
		});
		return results;
	}
}

/**
 * サークルのworkIdsを実際の作品から再集計して修正
 *
 * @param circleId - サークルID
 * @returns 更新された作品数
 */
export async function recalculateCircleWorkIds(circleId: string): Promise<number> {
	try {
		// 実際の作品を検索
		const worksSnapshot = await firestore
			.collection("works")
			.where("circleId", "==", circleId)
			.get();

		const actualWorkIds = worksSnapshot.docs.map((doc) => doc.id);

		// サークルドキュメントを更新
		const circleRef = firestore.collection(CIRCLES_COLLECTION).doc(circleId);
		const circleDoc = await circleRef.get();

		if (!circleDoc.exists) {
			logger.warn(`再集計対象のサークルが存在しません: ${circleId}`);
			return 0;
		}

		const currentData = circleDoc.data() as CircleDocument;
		const currentWorkIds = currentData.workIds || [];

		// 差分がある場合のみ更新
		const needsUpdate =
			actualWorkIds.length !== currentWorkIds.length ||
			!actualWorkIds.every((id) => currentWorkIds.includes(id));

		if (needsUpdate) {
			await circleRef.update({
				workIds: actualWorkIds,
				updatedAt: Timestamp.now(),
			});

			logger.info(`サークルworkIds再集計完了: ${circleId}`, {
				before: currentWorkIds.length,
				after: actualWorkIds.length,
			});
		}

		return actualWorkIds.length;
	} catch (error) {
		logger.error(`サークルworkIds再集計エラー: ${circleId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
