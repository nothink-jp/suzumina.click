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
 * WorkDocument.creators フィールド名 → CreatorType のマッピング。
 *
 * 注意: これは Firestore work doc に保存された `creators` フィールド用（`created_by` を含む）。
 * DLsite API レスポンス用の CREATOR_TYPE_MAP（`directed_by` を含む）とは別物なので混同しない。
 */
const WORK_DOCUMENT_CREATOR_FIELD_MAP: ReadonlyArray<[string, CreatorType]> = [
	["voice_by", "voice"],
	["scenario_by", "scenario"],
	["illust_by", "illustration"],
	["music_by", "music"],
	["others_by", "other"],
	["created_by", "other"],
];

/**
 * WorkDocument.creators（Firestore work doc の creators フィールド）から
 * クリエイターごとに役割を集約する。
 *
 * 整合性 cron の Creator-Work 復元が正本スキーマ（CreatorWorkRelation の
 * `roles: CreatorType[]`）に一致した文書を書くための共通関数。一作品で複数役割を
 * 持つクリエイターは roles に集約される。API レスポンスではなく保存済み work doc が
 * 入力源である点が extractCreatorMappings との違い。
 *
 * @param creators WorkDocument の creators フィールド
 * @returns クリエイターIDをキーとした Map（roles を集約済み）
 */
export function extractCreatorMappingsFromWorkDocument(
	creators: Record<string, { id?: string; name?: string }[] | undefined> | undefined,
): Map<string, ExtractedCreator> {
	const mappings = new Map<string, ExtractedCreator>();
	if (!creators || typeof creators !== "object") {
		return mappings;
	}

	for (const [field, role] of WORK_DOCUMENT_CREATOR_FIELD_MAP) {
		const list = creators[field];
		if (!Array.isArray(list)) {
			continue;
		}
		for (const creator of list) {
			if (creator?.id && isValidCreatorId(creator.id) && creator.name) {
				addOrUpdateCreatorMapping(mappings, creator.id, creator.name, role);
			}
		}
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

		// SPR-74 Phase B: 影響を受けたクリエイターの workCount/types/primaryRole を再計算。
		// マッピングの batch.commit は成功しているので、失敗しても処理結果は success のまま。
		const affectedCreators = new Set<string>([
			...processedCreators,
			...Array.from(existingMappings.keys()),
		]);
		const results = await Promise.allSettled(
			Array.from(affectedCreators).map((creatorId) => recomputeCreatorStats(creatorId)),
		);
		const failed = results.filter((r) => r.status === "rejected").length;
		if (failed > 0) {
			logger.warn(`クリエイター集計再計算で ${failed} 件失敗`, { workId });
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
 * クリエイターの集計フィールド（workCount / types / primaryRole）を
 * works サブコレクションから再計算して creator doc に書き戻す。
 *
 * SPR-74 Phase B で導入。/creators の読み込みパスがこれらの denormalized
 * フィールドを使うため、書き込み時に必ず同期する必要がある。
 *
 * @param creatorId クリエイターID
 */
export async function recomputeCreatorStats(creatorId: string): Promise<void> {
	const worksSnapshot = await firestore
		.collection(CREATORS_COLLECTION)
		.doc(creatorId)
		.collection("works")
		.get();

	if (worksSnapshot.empty) {
		await firestore.collection(CREATORS_COLLECTION).doc(creatorId).update({
			workCount: 0,
			types: [],
			updatedAt: Timestamp.now(),
		});
		return;
	}

	const typesSet = new Set<CreatorType>();
	const roleCount = new Map<CreatorType, number>();

	worksSnapshot.docs.forEach((doc) => {
		const relation = doc.data() as CreatorWorkRelation;
		relation.roles?.forEach((role: CreatorType) => {
			typesSet.add(role);
			roleCount.set(role, (roleCount.get(role) || 0) + 1);
		});
	});

	let primaryRole: CreatorType | undefined;
	let maxCount = 0;
	for (const [role, count] of roleCount) {
		if (count > maxCount) {
			maxCount = count;
			primaryRole = role;
		}
	}

	const update: Record<string, unknown> = {
		workCount: worksSnapshot.size,
		types: Array.from(typesSet),
		updatedAt: Timestamp.now(),
	};
	if (primaryRole) {
		update.primaryRole = primaryRole;
	}

	await firestore.collection(CREATORS_COLLECTION).doc(creatorId).update(update);
}
