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

type ExtendedWorkData = WorkDocument & {
	priceInJPY?: number;
};

/**
 * Compare works by date (newest or oldest)
 */
function compareByDate(a: ExtendedWorkData, b: ExtendedWorkData, isOldest = false): number {
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
function compareByRating(a: ExtendedWorkData, b: ExtendedWorkData): number {
	const ratingA = a.rating?.stars || 0;
	const ratingB = b.rating?.stars || 0;
	return ratingB - ratingA;
}

/**
 * Compare works by price
 */
function compareByPrice(a: ExtendedWorkData, b: ExtendedWorkData, isHighToLow = false): number {
	const priceA = a.price?.current || a.priceInJPY || 0;
	const priceB = b.price?.current || a.priceInJPY || 0;
	return isHighToLow ? priceB - priceA : priceA - priceB;
}

/**
 * Works sorting comparison function
 */
function compareWorks(a: ExtendedWorkData, b: ExtendedWorkData, sort: string): number {
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
 * クリエイターの作品一覧を取得
 * @param creatorId クリエイターID
 * @returns 作品一覧
 */
export async function getCreatorWorks(creatorId: string): Promise<WorkPlainObject[]> {
	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return [];
	}

	try {
		// 新しいcreatorsコレクションから作品IDを取得
		const firestore = getFirestore();
		const creatorDoc = await firestore.collection("creators").doc(creatorId).get();

		if (!creatorDoc.exists) {
			return [];
		}

		// worksサブコレクションから作品情報を取得
		const worksSnapshot = await creatorDoc.ref.collection("works").get();

		if (worksSnapshot.empty) {
			return [];
		}

		const workIds = worksSnapshot.docs.map((doc) => doc.id);

		// 作品詳細を取得（バッチ処理）
		const allWorks: WorkDocument[] = [];

		// Firestoreの whereIn 制限により、一度に10件まで
		for (let i = 0; i < workIds.length; i += 10) {
			const batch = workIds.slice(i, i + 10);
			const workRefs = batch.map((id) => firestore.collection("dlsiteWorks").doc(id));
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

		// 登録日でソート（新しい順）
		allWorks.sort((a, b) => compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, "newest"));

		// WorkPlainObjectに変換
		const works: WorkPlainObject[] = [];
		for (const work of allWorks) {
			const plainObject = convertToWorkPlainObject(work);
			if (plainObject) {
				works.push(plainObject);
			}
		}

		return works;
	} catch (_error) {
		// エラー発生時は空配列を返す
		return [];
	}
}

/**
 * ページネーション付きクリエイター作品取得
 * @param creatorId クリエイターID
 * @param page ページ番号（1から開始）
 * @param limit 1ページあたりの件数
 * @param sort ソート順序（newest, oldest, popular, price_low, price_high）
 * @returns 作品一覧と総件数
 */
export async function getCreatorWorksWithPagination(
	creatorId: string,
	page = 1,
	limit = 12,
	sort = "newest",
): Promise<{ works: WorkPlainObject[]; totalCount: number }> {
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
		const totalCount = workIds.length;

		// 作品詳細を取得（すべて取得してからソート・ページネーション）
		const allWorks: WorkDocument[] = [];

		// Firestoreの whereIn 制限により、一度に10件まで
		for (let i = 0; i < workIds.length; i += 10) {
			const batch = workIds.slice(i, i + 10);
			const workRefs = batch.map((id) => firestore.collection("dlsiteWorks").doc(id));
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

		// ソート処理
		allWorks.sort((a, b) => compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedFirestoreWorks = allWorks.slice(startIndex, endIndex);

		// WorkPlainObjectに変換
		const works: WorkPlainObject[] = [];
		for (const work of paginatedFirestoreWorks) {
			const plainObject = convertToWorkPlainObject(work);
			if (plainObject) {
				works.push(plainObject);
			}
		}

		return { works, totalCount };
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}

/**
 * クリエイター情報と作品一覧を同時に取得（ページネーション付き）
 * @param creatorId クリエイターID
 * @param page ページ番号（1から開始）
 * @param limit 1ページあたりの件数
 * @param sort ソート順序（newest, oldest, popular, price_low, price_high）
 * @returns クリエイター情報と作品一覧、存在しない場合はnull
 */
export async function getCreatorWithWorksWithPagination(
	creatorId: string,
	page = 1,
	limit = 12,
	sort = "newest",
): Promise<{
	creator: CreatorPageInfo;
	works: WorkPlainObject[];
	totalCount: number;
} | null> {
	const [creator, worksData] = await Promise.all([
		getCreatorInfo(creatorId),
		getCreatorWorksWithPagination(creatorId, page, limit, sort),
	]);

	if (!creator) {
		return null;
	}

	return { creator, works: worksData.works, totalCount: worksData.totalCount };
}

/**
 * クリエイター情報と作品一覧を同時に取得（後方互換性のため残す）
 * @param creatorId クリエイターID
 * @returns クリエイター情報と作品一覧、存在しない場合はnull
 */
export async function getCreatorWithWorks(
	creatorId: string,
): Promise<{ creator: CreatorPageInfo; works: WorkPlainObject[] } | null> {
	const [creator, works] = await Promise.all([
		getCreatorInfo(creatorId),
		getCreatorWorks(creatorId),
	]);

	if (!creator) {
		return null;
	}

	return { creator, works };
}
