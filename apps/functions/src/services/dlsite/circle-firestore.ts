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
