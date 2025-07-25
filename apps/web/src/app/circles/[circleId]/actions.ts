"use server";

import type { CircleData, OptimizedFirestoreDLsiteWorkData } from "@suzumina.click/shared-types";
import { isValidCircleId } from "@suzumina.click/shared-types";
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
 * サークル情報を取得
 * @param circleId サークルID
 * @returns サークル情報、存在しない場合はnull
 */
export async function getCircleInfo(circleId: string): Promise<CircleData | null> {
	// 入力検証
	if (!isValidCircleId(circleId)) {
		return null;
	}

	try {
		const firestore = getFirestore();
		const circleDoc = await firestore.collection("circles").doc(circleId).get();

		if (!circleDoc.exists) {
			return null;
		}

		const data = circleDoc.data() as CircleData;
		return {
			...data,
			// Firestore Timestampを Date に変換
			lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
			createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
		};
	} catch (_error) {
		// エラー発生時はnullを返す
		return null;
	}
}

/**
 * サークルの作品一覧を取得
 * @param circleId サークルID
 * @returns 作品一覧
 */
export async function getCircleWorks(
	circleId: string,
): Promise<OptimizedFirestoreDLsiteWorkData[]> {
	// 入力検証
	if (!isValidCircleId(circleId)) {
		return [];
	}

	try {
		const firestore = getFirestore();

		// まずサークル情報を取得してサークル名を確認
		const circleDoc = await firestore.collection("circles").doc(circleId).get();
		if (!circleDoc.exists) {
			return [];
		}

		const circleData = circleDoc.data() as CircleData;
		const circleName = circleData.name;

		// 全作品を取得してクライアント側でフィルタリング
		// circleId が設定されていない作品もサークル名で検索
		const allWorksSnapshot = await firestore.collection("dlsiteWorks").get();

		const matchingWorks = allWorksSnapshot.docs
			.map((doc) => {
				const data = doc.data();
				return {
					...data,
					id: doc.id,
					// registDate: 文字列またはFirestore Timestampに対応
					registDate: data.registDate?.toDate ? data.registDate.toDate() : data.registDate,
				} as OptimizedFirestoreDLsiteWorkData;
			})
			.filter((work) => {
				// circleId が一致するか、circleId がない場合はサークル名で一致判定
				return work.circleId === circleId || work.circle === circleName;
			})
			.sort((a, b) => compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, "newest"));

		return matchingWorks;
	} catch (_error) {
		// エラー発生時は空配列を返す
		return [];
	}
}

/**
 * ページネーション付きサークル作品取得
 * @param circleId サークルID
 * @param page ページ番号（1から開始）
 * @param limit 1ページあたりの件数
 * @param sort ソート順序（newest, oldest, popular, price_low, price_high）
 * @returns 作品一覧と総件数
 */
export async function getCircleWorksWithPagination(
	circleId: string,
	page = 1,
	limit = 12,
	sort = "newest",
): Promise<{ works: OptimizedFirestoreDLsiteWorkData[]; totalCount: number }> {
	// 入力検証
	if (!isValidCircleId(circleId)) {
		return { works: [], totalCount: 0 };
	}

	try {
		const firestore = getFirestore();

		// まずサークル情報を取得してサークル名を確認
		const circleDoc = await firestore.collection("circles").doc(circleId).get();
		if (!circleDoc.exists) {
			return { works: [], totalCount: 0 };
		}

		const circleData = circleDoc.data() as CircleData;
		const circleName = circleData.name;

		// 全作品を取得してクライアント側でフィルタリング
		const allWorksSnapshot = await firestore.collection("dlsiteWorks").get();

		const allMatchingWorks = allWorksSnapshot.docs
			.map((doc) => {
				const data = doc.data();
				return {
					...data,
					id: doc.id,
					// registDate: 文字列またはFirestore Timestampに対応
					registDate: data.registDate?.toDate ? data.registDate.toDate() : data.registDate,
				} as OptimizedFirestoreDLsiteWorkData;
			})
			.filter((work) => {
				// circleId が一致するか、circleId がない場合はサークル名で一致判定
				return work.circleId === circleId || work.circle === circleName;
			});

		const totalCount = allMatchingWorks.length;

		// ソート処理
		allMatchingWorks.sort((a, b) =>
			compareWorks(a as ExtendedWorkData, b as ExtendedWorkData, sort),
		);

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = allMatchingWorks.slice(startIndex, endIndex);

		return { works: paginatedWorks, totalCount };
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}

/**
 * サークル情報と作品一覧を同時に取得（ページネーション付き）
 * @param circleId サークルID
 * @param page ページ番号（1から開始）
 * @param limit 1ページあたりの件数
 * @param sort ソート順序（newest, oldest, popular, price_low, price_high）
 * @returns サークル情報と作品一覧、存在しない場合はnull
 */
export async function getCircleWithWorksWithPagination(
	circleId: string,
	page = 1,
	limit = 12,
	sort = "newest",
): Promise<{
	circle: CircleData;
	works: OptimizedFirestoreDLsiteWorkData[];
	totalCount: number;
} | null> {
	const [circle, worksData] = await Promise.all([
		getCircleInfo(circleId),
		getCircleWorksWithPagination(circleId, page, limit, sort),
	]);

	if (!circle) {
		return null;
	}

	return { circle, works: worksData.works, totalCount: worksData.totalCount };
}

/**
 * サークル情報と作品一覧を同時に取得（後方互換性のため残す）
 * @param circleId サークルID
 * @returns サークル情報と作品一覧、存在しない場合はnull
 */
export async function getCircleWithWorks(
	circleId: string,
): Promise<{ circle: CircleData; works: OptimizedFirestoreDLsiteWorkData[] } | null> {
	const [circle, works] = await Promise.all([getCircleInfo(circleId), getCircleWorks(circleId)]);

	if (!circle) {
		return null;
	}

	return { circle, works };
}
