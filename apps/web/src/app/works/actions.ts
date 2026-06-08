"use server";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { workTransformers } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { withErrorHandling } from "@/lib/server-action-wrapper";

// Internal modules
import type { EnhancedSearchParams } from "./lib/work-filtering";
import { filterWorksByUnifiedData, needsComplexFiltering } from "./lib/work-filtering";
import { buildWorksQuery } from "./lib/work-query-builder";
import { sortWorks } from "./lib/work-sorting";
import { convertDocsToWorks, convertWorksToPlainObjects } from "./utils/work-converters";

/**
 * シンプルなクエリで作品を取得
 */
async function getWorksWithSimpleQuery(
	firestore: FirebaseFirestore.Firestore,
	params: EnhancedSearchParams,
): Promise<WorkListResultPlain> {
	const { page = 1, limit = 12, sort = "newest", category, ageRating } = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, ageRating, sort });
	query = query.limit(limit);

	// オフセット処理
	const startOffset = (page - 1) * limit;
	if (startOffset > 0) {
		const offsetSnapshot = await firestore
			.collection("works")
			.orderBy("releaseDateISO", sort === "oldest" ? "asc" : "desc")
			.limit(startOffset)
			.get();

		if (offsetSnapshot.size > 0) {
			const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
			query = query.startAfter(lastDoc);
		}
	}

	const snapshot = await query.get();
	const works = await convertDocsToWorks(snapshot.docs);

	// カテゴリフィルタを適用したクエリで全件数を取得
	let countQuery = buildWorksQuery(firestore, { category, ageRating, sort });
	// ソートを削除（countクエリでは不要）
	countQuery = firestore.collection("works");
	if (category && category !== "all") {
		countQuery = countQuery.where("category", "==", category);
	}
	if (ageRating && ageRating.length === 1) {
		countQuery = countQuery.where("ageRating", "==", ageRating[0]);
	}
	const countSnapshot = await countQuery.count().get();
	const totalCount = countSnapshot.data().count;

	return {
		works,
		hasMore: snapshot.size === limit,
		lastWork: works[works.length - 1],
		totalCount,
		filteredCount: totalCount,
	};
}

/**
 * 複雑なフィルタリングで作品を取得
 */
async function getWorksWithComplexFiltering(
	firestore: FirebaseFirestore.Firestore,
	params: EnhancedSearchParams,
): Promise<WorkListResultPlain> {
	const {
		page = 1,
		limit = 12,
		sort = "newest",
		search,
		category,
		language,
		voiceActors,
		genres,
		priceRange,
		ratingRange,
		hasHighResImage,
		ageRating,
		showR18,
	} = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, ageRating, sort });

	// ページネーション用のオフセット
	const startOffset = (page - 1) * limit;

	// メモリ上での処理が必要かどうかを判定
	const requiresFullDataFetch =
		showR18 === false ||
		(language && language !== "all") ||
		!!search ||
		(genres && genres.length > 0) ||
		(voiceActors && voiceActors.length > 0);

	if (requiresFullDataFetch) {
		// 全件取得（limitを設定しない）
		// 注: Firestoreには約1500件なので問題ない
	} else {
		// その他の複雑フィルタリングの場合は、必要な分+余裕を取得
		const fetchLimit = Math.min(startOffset + limit * 10, 3000);
		query = query.limit(fetchLimit);
	}

	const snapshot = await query.get();
	let allWorks = snapshot.docs.map((doc) => ({
		...doc.data(),
		id: doc.id,
	})) as import("@suzumina.click/shared-types").WorkDocument[];

	// メモリ上でのフィルタリング
	allWorks = filterWorksByUnifiedData(allWorks, {
		search,
		language,
		voiceActors,
		genres,
		priceRange,
		ratingRange,
		hasHighResImage,
		ageRating: ageRating && ageRating.length > 1 ? ageRating : undefined,
		showR18, // R18フィルタリングも適用する
	});

	// フィルタリング後にソートを適用
	allWorks = sortWorks(allWorks, sort);

	const filteredCount = allWorks.length;
	const paginatedWorks = allWorks.slice(startOffset, startOffset + limit);

	// 変換処理
	const works = convertWorksToPlainObjects(paginatedWorks);

	// 全件数はフィルタリング後の件数
	const totalCount = filteredCount;
	const hasMore = startOffset + limit < filteredCount;

	return {
		works,
		hasMore,
		lastWork: works[works.length - 1],
		totalCount,
		filteredCount,
	};
}

/**
 * DLsite作品データをページネーション付きで取得するServer Action（統合データ構造対応）
 */
export async function getWorks(params: EnhancedSearchParams = {}): Promise<WorkListResultPlain> {
	return withErrorHandling(
		async () => {
			const firestore = getFirestore();

			// 複雑なフィルタリングが必要かチェック
			if (needsComplexFiltering(params)) {
				return await getWorksWithComplexFiltering(firestore, params);
			}

			// シンプルなクエリの場合
			return await getWorksWithSimpleQuery(firestore, params);
		},
		{
			action: "getWorks",
			errorMessage: "作品データの取得に失敗しました",
			logContext: { params },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		// エラーの場合は空のデータを返す
		return {
			works: [],
			hasMore: false,
			totalCount: 0,
		};
	});
}

/**
 * 特定の作品IDで作品データを取得するServer Action
 */
export async function getWorkById(workId: string): Promise<WorkPlainObject | null> {
	return withErrorHandling(
		async () => {
			const firestore = getFirestore();
			const doc = await firestore.collection("works").doc(workId).get();

			if (!doc.exists) {
				return null;
			}

			const data = doc.data() as import("@suzumina.click/shared-types").WorkDocument;

			// データにIDが設定されていない場合、ドキュメントIDを使用
			if (!data.id) {
				data.id = doc.id;
			}

			// フロントエンド形式に変換
			return workTransformers.fromFirestore(data);
		},
		{
			action: "getWorkById",
			errorMessage: "作品の取得に失敗しました",
			logContext: { workId },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		return null;
	});
}

/**
 * 人気ジャンルリストを取得するServer Action
 */
export async function getPopularGenres(limit = 30): Promise<
	Array<{
		genre: string;
		count: number;
	}>
> {
	return withErrorHandling(
		async () => {
			const firestore = getFirestore();
			const allSnapshot = await firestore.collection("works").get();

			const allWorks = allSnapshot.docs.map((doc) => ({
				...doc.data(),
				id: doc.id,
			})) as import("@suzumina.click/shared-types").WorkDocument[];

			const genreCounts = new Map<string, number>();

			allWorks.forEach((work) => {
				if (Array.isArray(work.genres)) {
					work.genres.forEach((genre) => {
						if (typeof genre === "string" && genre.trim() !== "") {
							genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
						}
					});
				}
			});

			return Array.from(genreCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, limit)
				.map(([genre, count]) => ({ genre, count }));
		},
		{
			action: "getPopularGenres",
			errorMessage: "人気ジャンルの取得に失敗しました",
			logContext: { limit },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		return [];
	});
}

/**
 * 後方互換性のための従来シグネチャサポート
 * @deprecated 新しいEnhancedSearchParamsを使用してください
 */
export async function getWorksLegacy({
	page = 1,
	limit = 12,
	sort = "newest",
	search,
	category,
}: {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	category?: string;
} = {}): Promise<WorkListResultPlain> {
	return getWorks({ page, limit, sort, search, category });
}
