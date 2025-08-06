"use server";

import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
	WorkDocument,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import { convertToWorkPlainObject, isValidCreatorId } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";

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
		// 新しいcreatorsコレクションから作品IDを取得
		const firestore = getFirestore();
		const creatorDoc = await firestore.collection("creators").doc(creatorId).get();

		if (!creatorDoc.exists) {
			return { works: [], totalCount: 0 };
		}

		// worksサブコレクションから作品情報を取得
		const worksSnapshot = await creatorDoc.ref.collection("works").get();

		if (worksSnapshot.empty) {
			return { works: [], totalCount: 0 };
		}

		const workIds = worksSnapshot.docs.map((doc) => doc.id);

		// 作品詳細を取得（すべて取得してからフィルター・ソート・ページネーション）
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

		// WorkPlainObjectに変換（検索前に変換することが重要）
		const convertedWorks: WorkPlainObject[] = [];
		for (const work of allWorks) {
			const plainObject = convertToWorkPlainObject(work);
			if (plainObject) {
				convertedWorks.push(plainObject);
			}
		}

		// 検索フィルター適用
		let filteredWorks = convertedWorks;
		let filteredCount: number | undefined;

		if (search) {
			const searchLower = search.toLowerCase();
			filteredWorks = convertedWorks.filter((work) => {
				// タイトルで検索
				if (work.title?.toLowerCase().includes(searchLower)) return true;

				// 説明で検索
				if (work.description?.toLowerCase().includes(searchLower)) return true;

				// 声優名で検索（WorkPlainObjectでは voiceActors フィールド）
				if (
					work.creators?.voiceActors?.some((va) => va.name?.toLowerCase().includes(searchLower))
				) {
					return true;
				}

				// ジャンルで検索（WorkPlainObjectでは genres は string[] ）
				if (work.genres?.some((genre) => genre.toLowerCase().includes(searchLower))) return true;
				if (work.customGenres?.some((genre) => genre.toLowerCase().includes(searchLower)))
					return true;

				return false;
			});
			filteredCount = filteredWorks.length;
		}

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
