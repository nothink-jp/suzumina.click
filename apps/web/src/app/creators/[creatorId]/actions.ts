"use server";

import type {
	CreatorInfo,
	CreatorWorkMapping,
	OptimizedFirestoreDLsiteWorkData,
} from "@suzumina.click/shared-types";
import { isValidCreatorId } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";

type ExtendedWorkData = OptimizedFirestoreDLsiteWorkData & {
	releaseDateISO?: string;
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
	const priceB = b.price?.current || b.priceInJPY || 0;
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
export async function getCreatorInfo(creatorId: string): Promise<CreatorInfo | null> {
	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return null;
	}

	try {
		// creatorWorkMappings から情報を集約
		const firestore = getFirestore();
		const mappingsSnapshot = await firestore
			.collection("creatorWorkMappings")
			.where("creatorId", "==", creatorId)
			.get();

		if (mappingsSnapshot.empty) {
			return null;
		}

		// クリエイター情報の集約
		const creatorInfo: CreatorInfo = {
			id: creatorId,
			name: "",
			types: [],
			workCount: 0,
		};

		const workIds = new Set<string>();
		const allTypes = new Set<string>();

		mappingsSnapshot.docs.forEach((doc) => {
			const data = doc.data() as CreatorWorkMapping;
			workIds.add(data.workId);
			data.types?.forEach((type) => allTypes.add(type));
			if (data.creatorName && !creatorInfo.name) {
				creatorInfo.name = data.creatorName;
			}
		});

		creatorInfo.types = Array.from(allTypes);
		creatorInfo.workCount = workIds.size;

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
export async function getCreatorWorks(
	creatorId: string,
): Promise<OptimizedFirestoreDLsiteWorkData[]> {
	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return [];
	}

	try {
		// creatorWorkMappings から作品IDを取得
		const firestore = getFirestore();
		const mappingsSnapshot = await firestore
			.collection("creatorWorkMappings")
			.where("creatorId", "==", creatorId)
			.get();

		if (mappingsSnapshot.empty) {
			return [];
		}

		const workIds = Array.from(
			new Set(mappingsSnapshot.docs.map((doc) => doc.data().workId as string)),
		);

		// 作品詳細を取得（バッチ処理）
		const works: OptimizedFirestoreDLsiteWorkData[] = [];

		// Firestoreの whereIn 制限により、一度に10件まで
		for (let i = 0; i < workIds.length; i += 10) {
			const batch = workIds.slice(i, i + 10);
			const workRefs = batch.map((id) => firestore.collection("dlsiteWorks").doc(id));
			const workDocs = await firestore.getAll(...workRefs);

			for (const doc of workDocs) {
				if (doc.exists) {
					const data = doc.data();
					works.push({
						...data,
						id: doc.id,
						// registDate: 文字列またはFirestore Timestampに対応
						registDate: data?.registDate?.toDate ? data.registDate.toDate() : data?.registDate,
					} as OptimizedFirestoreDLsiteWorkData);
				}
			}
		}

		// 登録日でソート（新しい順）
		works.sort((a, b) => compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, "newest"));

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
): Promise<{ works: OptimizedFirestoreDLsiteWorkData[]; totalCount: number }> {
	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return { works: [], totalCount: 0 };
	}

	try {
		// creatorWorkMappings から作品IDを取得
		const firestore = getFirestore();
		const mappingsSnapshot = await firestore
			.collection("creatorWorkMappings")
			.where("creatorId", "==", creatorId)
			.get();

		if (mappingsSnapshot.empty) {
			return { works: [], totalCount: 0 };
		}

		const workIds = Array.from(
			new Set(mappingsSnapshot.docs.map((doc) => doc.data().workId as string)),
		);

		const totalCount = workIds.length;

		// 作品詳細を取得（すべて取得してからソート・ページネーション）
		const allWorks: OptimizedFirestoreDLsiteWorkData[] = [];

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
						// registDate: 文字列またはFirestore Timestampに対応
						registDate: data?.registDate?.toDate ? data.registDate.toDate() : data?.registDate,
					} as OptimizedFirestoreDLsiteWorkData);
				}
			}
		}

		// ソート処理
		allWorks.sort((a, b) => compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = allWorks.slice(startIndex, endIndex);

		return { works: paginatedWorks, totalCount };
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
	creator: CreatorInfo;
	works: OptimizedFirestoreDLsiteWorkData[];
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
): Promise<{ creator: CreatorInfo; works: OptimizedFirestoreDLsiteWorkData[] } | null> {
	const [creator, works] = await Promise.all([
		getCreatorInfo(creatorId),
		getCreatorWorks(creatorId),
	]);

	if (!creator) {
		return null;
	}

	return { creator, works };
}
