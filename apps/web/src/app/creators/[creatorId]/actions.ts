"use server";

import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
	WorkDocument,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { isValidCreatorId } from "@suzumina.click/shared-types";
import { compareWorks, searchWorks } from "@/lib/circle-creator-works";
import { getFirestore } from "@/lib/firestore";
import { convertWorksToPlainObjects } from "../../works/utils/work-converters";

/**
 * クリエイター情報を取得
 * @param creatorId クリエイターID
 * @returns クリエイター情報、存在しない場合はnull
 */
export async function getCreatorInfo(creatorId: string): Promise<CreatorPageInfo | null> {
	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return null;
	}

	try {
		// 新しいcreatorsコレクションから情報を取得
		const firestore = getFirestore();
		const creatorDoc = await firestore.collection("creators").doc(creatorId).get();

		if (!creatorDoc.exists) {
			return null;
		}

		const creatorData = creatorDoc.data() as CreatorDocument;

		// worksサブコレクションから作品数と役割を取得
		const worksSnapshot = await creatorDoc.ref.collection("works").get();

		const allTypes = new Set<string>();
		worksSnapshot.docs.forEach((doc) => {
			const workRelation = doc.data() as CreatorWorkRelation;
			workRelation.roles?.forEach((role) => {
				allTypes.add(role);
			});
		});

		// クリエイター情報の集約
		const creatorInfo: CreatorPageInfo = {
			id: creatorId,
			name: creatorData.name,
			types: Array.from(allTypes),
			workCount: worksSnapshot.size,
		};

		// primaryRoleが設定されていて、typesに含まれていない場合は追加
		if (creatorData.primaryRole && !allTypes.has(creatorData.primaryRole)) {
			creatorInfo.types.unshift(creatorData.primaryRole);
		}

		return creatorInfo;
	} catch (_error) {
		// エラー発生時はnullを返す
		return null;
	}
}

/**
 * 作品IDを取得
 */
async function fetchWorkIds(
	firestore: FirebaseFirestore.Firestore,
	creatorId: string,
): Promise<string[] | null> {
	const creatorDoc = await firestore.collection("creators").doc(creatorId).get();

	if (!creatorDoc.exists) {
		return null;
	}

	const worksSnapshot = await creatorDoc.ref.collection("works").get();

	if (worksSnapshot.empty) {
		return [];
	}

	return worksSnapshot.docs.map((doc) => doc.id);
}

/**
 * 作品詳細を取得
 */
async function fetchWorkDocuments(
	firestore: FirebaseFirestore.Firestore,
	workIds: string[],
): Promise<WorkDocument[]> {
	const allWorks: WorkDocument[] = [];

	// Firestoreの whereIn 制限により、一度に10件まで
	for (let i = 0; i < workIds.length; i += 10) {
		const batch = workIds.slice(i, i + 10);
		const workRefs = batch.map((id) => firestore.collection("works").doc(id));
		const workDocs = await firestore.getAll(...workRefs);

		for (const doc of workDocs) {
			if (doc.exists) {
				const data = doc.data();
				allWorks.push({
					...data,
					id: doc.id,
				} as WorkDocument);
			}
		}
	}

	return allWorks;
}

/**
 * クリエイター作品リストを取得（ConfigurableList用）
 * @param params パラメータ
 * @returns 作品一覧と総件数
 */
export async function getCreatorWorksList(params: {
	creatorId: string;
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<{ works: WorkPlainObject[]; totalCount: number; filteredCount?: number }> {
	const { creatorId, page = 1, limit = 12, sort = "newest", search } = params;

	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return { works: [], totalCount: 0 };
	}

	try {
		const firestore = getFirestore();

		// 作品IDを取得
		const workIds = await fetchWorkIds(firestore, creatorId);
		if (workIds === null) {
			return { works: [], totalCount: 0 };
		}
		if (workIds.length === 0) {
			return { works: [], totalCount: 0 };
		}

		// 作品詳細を取得
		const allWorks = await fetchWorkDocuments(firestore, workIds);

		// WorkPlainObjectに変換
		const convertedWorks = convertWorksToPlainObjects(allWorks);

		// 検索フィルター適用
		const { filtered: filteredWorks, count: filteredCount } = searchWorks(convertedWorks, search);

		// ソート処理
		filteredWorks.sort((a, b) => compareWorks(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = filteredWorks.slice(startIndex, endIndex);

		return { works: paginatedWorks, totalCount: convertedWorks.length, filteredCount };
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}
