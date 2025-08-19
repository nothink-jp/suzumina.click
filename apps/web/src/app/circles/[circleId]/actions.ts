"use server";

import type {
	CircleDocument,
	CirclePlainObject,
	WorkDocument,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import {
	convertToCirclePlainObject,
	isValidCircleId,
	workTransformers,
} from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { warn } from "@/lib/logger";

/**
 * Compare works by date (newest or oldest)
 */
function compareByDate(a: WorkPlainObject, b: WorkPlainObject, isOldest = false): number {
	const dateA = a.releaseDateISO || "1900-01-01";
	const dateB = b.releaseDateISO || "1900-01-01";
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
 * サークル情報を取得
 * @param circleId サークルID
 * @returns サークル情報、存在しない場合はnull
 */
export async function getCircleInfo(circleId: string): Promise<CirclePlainObject | null> {
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

		const data = circleDoc.data() as CircleDocument;
		return convertToCirclePlainObject(data);
	} catch (_error) {
		// エラー発生時はnullを返す
		return null;
	}
}

/**
 * サークル作品リストを取得（ConfigurableList用）
 * @param params パラメータ
 * @returns 作品一覧と総件数
 */
export async function getCircleWorksList(params: {
	circleId: string;
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<{ works: WorkPlainObject[]; totalCount: number; filteredCount?: number }> {
	const { circleId, page = 1, limit = 12, sort = "newest", search } = params;

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

		const circleData = circleDoc.data() as CircleDocument;
		const circleName = circleData.name;

		// 全作品を取得してクライアント側でフィルタリング
		const allWorksSnapshot = await firestore.collection("works").get();

		const allMatchingWorks = allWorksSnapshot.docs
			.map((doc) => {
				const data = doc.data();
				return {
					...data,
					id: doc.id,
				} as WorkDocument;
			})
			.filter((work) => {
				// circleId が一致するか、circleId がない場合はサークル名で一致判定
				return work.circleId === circleId || work.circle === circleName;
			});

		// WorkPlainObjectに変換
		const convertedWorks: WorkPlainObject[] = [];
		for (const work of allMatchingWorks) {
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

		// 検索フィルタリング
		let filteredWorks = convertedWorks;
		if (search) {
			const searchLower = search.toLowerCase();
			filteredWorks = convertedWorks.filter((work) => {
				const searchableText = [
					work.title,
					work.description,
					...(work.creators?.voiceActors?.map((actor) => actor.name) || []),
					...(work.customGenres || []),
					...(work.genres || []),
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				return searchableText.includes(searchLower);
			});
		}

		// ソート処理
		filteredWorks.sort((a, b) => compareWorks(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = filteredWorks.slice(startIndex, endIndex);

		return {
			works: paginatedWorks,
			totalCount: convertedWorks.length,
			filteredCount: search ? filteredWorks.length : undefined,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}
