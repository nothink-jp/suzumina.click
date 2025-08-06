/**
 * Creator Firestore ユーティリティ関数
 *
 * プロジェクトの薄い設計パターンに従い、シンプルなユーティリティ関数として実装
 * リポジトリパターンは使用せず、直接的なFirestore操作を提供
 */

import type {
	CreatorDocument,
	CreatorType,
	CreatorWorkRelation,
	DLsiteApiResponse,
} from "@suzumina.click/shared-types";
import { isValidCreatorId } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

const CREATORS_COLLECTION = "creators";

/**
 * APIレスポンスからクリエイター情報を抽出
 */
interface ExtractedCreator {
	id: string;
	name: string;
	roles: CreatorType[];
}

/**
 * クリエイタータイプのマッピング定義
 */
const CREATOR_TYPE_MAP: ReadonlyArray<[string, CreatorType]> = [
	["voice_by", "voice"],
	["illust_by", "illustration"],
	["scenario_by", "scenario"],
	["music_by", "music"],
	["others_by", "other"],
	["directed_by", "other"],
];

/**
 * クリエイター情報をマッピングに追加または更新
 */
function addOrUpdateCreatorMapping(
	mappings: Map<string, ExtractedCreator>,
	creatorId: string,
	creatorName: string,
	role: CreatorType,
): void {
	const existing = mappings.get(creatorId);
	if (existing) {
		// 既存のクリエイターに役割を追加
		if (!existing.roles.includes(role)) {
			existing.roles.push(role);
		}
	} else {
		// 新規クリエイター
		mappings.set(creatorId, {
			id: creatorId,
			name: creatorName || "Unknown Creator",
			roles: [role],
		});
	}
}

/**
 * 特定の役割のクリエイターを処理
 */
function processCreatorsByRole(
	creaters: Record<string, { id?: string; name?: string }[]>,
	field: string,
	role: CreatorType,
	mappings: Map<string, ExtractedCreator>,
): void {
	const creators = creaters[field] || [];
	for (const creator of creators) {
		if (creator.id && isValidCreatorId(creator.id)) {
			addOrUpdateCreatorMapping(mappings, creator.id, creator.name || "", role);
		}
	}
}

/**
 * DLsite APIレスポンスからクリエイター情報を抽出
 *
 * @param apiData DLsite APIレスポンス
 * @returns クリエイターIDをキーとしたMap
 */
function extractCreatorMappings(apiData: DLsiteApiResponse): Map<string, ExtractedCreator> {
	const mappings = new Map<string, ExtractedCreator>();

	if (!apiData.creaters || Array.isArray(apiData.creaters)) {
		return mappings;
	}

	const creaters = apiData.creaters as Record<string, { id?: string; name?: string }[]>;

	for (const [field, role] of CREATOR_TYPE_MAP) {
		processCreatorsByRole(creaters, field, role, mappings);
	}

	return mappings;
}

/**
 * 作品の既存クリエイターマッピングを取得
 *
 * @param workId 作品ID
 * @returns クリエイターIDをキーとしたMap
 */
async function getExistingCreatorMappings(
	workId: string,
): Promise<Map<string, CreatorWorkRelation>> {
	const mappings = new Map<string, CreatorWorkRelation>();

	try {
		// Collection Group Queryを使用して効率的に検索
		// Terraformで定義されたインデックスを使用
		const worksSnapshot = await firestore
			.collectionGroup("works")
			.where("workId", "==", workId)
			.get();

		worksSnapshot.docs.forEach((doc) => {
			// 親ドキュメントのIDがクリエイターID
			const creatorId = doc.ref.parent.parent?.id;
			if (creatorId) {
				const data = doc.data() as CreatorWorkRelation;
				mappings.set(creatorId, data);
			}
		});
	} catch (error) {
		logger.error(`既存クリエイターマッピング取得エラー: ${workId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return mappings;
}

/**
 * クリエイターと作品のマッピングを更新（差分更新）
 *
 * @param apiData DLsite APIレスポンス
 * @param workId 作品ID
 * @returns 処理結果
 */
export async function updateCreatorWorkMapping(
	apiData: DLsiteApiResponse,
	workId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const batch = firestore.batch();
		const processedCreators = new Set<string>();

		// 現在のマッピングを取得
		const existingMappings = await getExistingCreatorMappings(workId);

		// APIデータから新しいマッピングを構築
		const newMappings = extractCreatorMappings(apiData);

		// 追加・更新
		for (const [creatorId, mapping] of newMappings) {
			const creatorRef = firestore.collection(CREATORS_COLLECTION).doc(creatorId);
			const mappingRef = creatorRef.collection("works").doc(workId);

			// クリエイター基本情報の更新（merge: true で部分更新）
			const creatorData: Partial<CreatorDocument> = {
				creatorId,
				name: mapping.name,
				updatedAt: Timestamp.now(),
			};

			// 新規作成の場合はcreatedAtも設定
			const creatorDoc = await creatorRef.get();
			if (!creatorDoc.exists) {
				creatorData.createdAt = Timestamp.now();
			}

			batch.set(creatorRef, creatorData, { merge: true });

			// 作品との関連情報を設定
			const relationData: CreatorWorkRelation = {
				workId,
				roles: mapping.roles,
				circleId: apiData.maker_id || "UNKNOWN",
				updatedAt: Timestamp.now(),
			};

			batch.set(mappingRef, relationData);

			processedCreators.add(creatorId);
		}

		// 削除（APIデータに存在しないマッピング）
		for (const [creatorId] of existingMappings) {
			if (!processedCreators.has(creatorId)) {
				const mappingRef = firestore
					.collection(CREATORS_COLLECTION)
					.doc(creatorId)
					.collection("works")
					.doc(workId);

				batch.delete(mappingRef);

				logger.debug(`クリエイターマッピング削除: ${creatorId} - ${workId}`);
			}
		}

		await batch.commit();

		const addedCount = processedCreators.size;
		const removedCount =
			existingMappings.size -
			Array.from(existingMappings.keys()).filter((id) => processedCreators.has(id)).length;

		if (addedCount > 0 || removedCount > 0) {
			logger.debug(`クリエイターマッピング更新完了: ${workId}`, {
				added: addedCount,
				removed: removedCount,
			});
		}

		return { success: true };
	} catch (error) {
		logger.error(`クリエイターマッピング更新エラー: ${workId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 作品に関連するすべてのクリエイターマッピングを削除
 *
 * @param workId 作品ID
 * @returns 削除件数
 */
export async function removeCreatorMappings(workId: string): Promise<number> {
	try {
		const existingMappings = await getExistingCreatorMappings(workId);
		const batch = firestore.batch();
		let deletedCount = 0;

		for (const [creatorId] of existingMappings) {
			const mappingRef = firestore
				.collection(CREATORS_COLLECTION)
				.doc(creatorId)
				.collection("works")
				.doc(workId);

			batch.delete(mappingRef);
			deletedCount++;
		}

		if (deletedCount > 0) {
			await batch.commit();
			logger.info(`クリエイターマッピング削除: ${workId} - ${deletedCount}件`);
		}

		return deletedCount;
	} catch (error) {
		logger.error(`クリエイターマッピング削除エラー: ${workId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return 0;
	}
}

/**
 * クリエイターの作品数を取得
 *
 * @param creatorId クリエイターID
 * @returns 作品数
 */
export async function getCreatorWorkCount(creatorId: string): Promise<number> {
	try {
		const worksSnapshot = await firestore
			.collection(CREATORS_COLLECTION)
			.doc(creatorId)
			.collection("works")
			.get();

		return worksSnapshot.size;
	} catch (error) {
		logger.error(`クリエイター作品数取得エラー: ${creatorId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return 0;
	}
}

/**
 * クリエイターの主要な役割を統計的に判定して更新
 *
 * @param creatorId クリエイターID
 * @returns 更新が成功したかどうか
 */
export async function updateCreatorPrimaryRole(creatorId: string): Promise<boolean> {
	try {
		const worksSnapshot = await firestore
			.collection(CREATORS_COLLECTION)
			.doc(creatorId)
			.collection("works")
			.get();

		if (worksSnapshot.empty) {
			return false;
		}

		// 役割の出現回数をカウント
		const roleCount = new Map<CreatorType, number>();

		worksSnapshot.docs.forEach((doc) => {
			const relation = doc.data() as CreatorWorkRelation;
			relation.roles.forEach((role: CreatorType) => {
				roleCount.set(role, (roleCount.get(role) || 0) + 1);
			});
		});

		// 最も多い役割を判定
		let primaryRole: CreatorType | undefined;
		let maxCount = 0;

		for (const [role, count] of roleCount) {
			if (count > maxCount) {
				maxCount = count;
				primaryRole = role;
			}
		}

		if (primaryRole) {
			await firestore.collection(CREATORS_COLLECTION).doc(creatorId).update({
				primaryRole,
				updatedAt: Timestamp.now(),
			});

			logger.debug(`クリエイター主要役割更新: ${creatorId} - ${primaryRole}`);
			return true;
		}

		return false;
	} catch (error) {
		logger.error(`クリエイター主要役割更新エラー: ${creatorId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * クリエイター情報を取得（作品リスト付き）
 *
 * @param creatorId クリエイターID
 * @returns クリエイター情報と作品リスト
 */
export async function getCreatorWithWorks(creatorId: string): Promise<{
	creator: CreatorDocument | null;
	works: Array<CreatorWorkRelation>;
}> {
	try {
		const creatorDoc = await firestore.collection(CREATORS_COLLECTION).doc(creatorId).get();

		if (!creatorDoc.exists) {
			return { creator: null, works: [] };
		}

		const creator = creatorDoc.data() as CreatorDocument;

		const worksSnapshot = await creatorDoc.ref.collection("works").get();
		const works = worksSnapshot.docs.map((doc) => doc.data() as CreatorWorkRelation);

		return { creator, works };
	} catch (error) {
		logger.error(`クリエイター情報取得エラー: ${creatorId}`, {
			error: error instanceof Error ? error.message : String(error),
		});
		return { creator: null, works: [] };
	}
}
