"use server";

import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
	WorkDocument,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { isValidCreatorId, workTransformers } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { warn } from "@/lib/logger";

/**
 * Compare works by date (newest or oldest)
 */
function compareByDate(a: WorkPlainObject, b: WorkPlainObject, isOldest = false): number {
	const dateA = a.releaseDateISO || a.registDate || "1900-01-01";
	const dateB = b.releaseDateISO || b.registDate || "1900-01-01";
	if (dateA === dateB) {
		return isOldest
			? a.productId.localeCompare(b.productId)
			: b.productId.localeCompare(a.productId);
	}
	return isOldest ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
}

/**
 * Compare works by rating (popular)
 */
function compareByRating(a: WorkPlainObject, b: WorkPlainObject): number {
	const ratingA = a.rating?.stars || 0;
	const ratingB = b.rating?.stars || 0;
	return ratingB - ratingA;
}

/**
 * Compare works by price
 */
function compareByPrice(a: WorkPlainObject, b: WorkPlainObject, isHighToLow = false): number {
	const priceA = a.price?.current || 0;
	const priceB = b.price?.current || 0;
	return isHighToLow ? priceB - priceA : priceA - priceB;
}

/**
 * Works sorting comparison function
 */
function compareWorks(a: WorkPlainObject, b: WorkPlainObject, sort: string): number {
	switch (sort) {
		case "newest":
			return compareByDate(a, b, false);
		case "oldest":
			return compareByDate(a, b, true);
		case "popular":
			return compareByRating(a, b);
		case "price_low":
			return compareByPrice(a, b, false);
		case "price_high":
			return compareByPrice(a, b, true);
		default:
			return compareByDate(a, b, false);
	}
}

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
			workRelation.roles?.forEach((role) => allTypes.add(role));
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
 * 作品をWorkPlainObjectに変換
 */
function convertWorksToPlainObjects(allWorks: WorkDocument[]): WorkPlainObject[] {
	const convertedWorks: WorkPlainObject[] = [];
	for (const work of allWorks) {
		try {
			const converted = workTransformers.fromFirestore(work);
			convertedWorks.push(converted);
		} catch (error) {
			// Log warning but continue processing other items
			warn(`Failed to convert work ${work.id}`, {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return convertedWorks;
}

/**
 * 検索フィルター適用
 */
function applySearchFilter(
	works: WorkPlainObject[],
	search?: string,
): { filtered: WorkPlainObject[]; count?: number } {
	if (!search) {
		return { filtered: works };
	}

	const searchLower = search.toLowerCase();
	const filtered = works.filter((work) => {
		// タイトルで検索
		if (work.title?.toLowerCase().includes(searchLower)) return true;

		// 説明で検索
		if (work.description?.toLowerCase().includes(searchLower)) return true;

		// 声優名で検索（WorkPlainObjectでは voiceActors フィールド）
		if (work.creators?.voiceActors?.some((va) => va.name?.toLowerCase().includes(searchLower))) {
			return true;
		}

		// ジャンルで検索（WorkPlainObjectでは genres は string[] ）
		if (work.genres?.some((genre) => genre.toLowerCase().includes(searchLower))) return true;
		if (work.customGenres?.some((genre) => genre.toLowerCase().includes(searchLower))) return true;

		return false;
	});

	return { filtered, count: filtered.length };
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
		const { filtered: filteredWorks, count: filteredCount } = applySearchFilter(
			convertedWorks,
			search,
		);

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
