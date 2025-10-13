"use server";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { workTransformers } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { withErrorHandling } from "@/lib/server-action-wrapper";

// Internal modules
import type { EnhancedSearchParams } from "./lib/work-filtering";
import { filterWorksByUnifiedData, needsComplexFiltering } from "./lib/work-filtering";
import { buildWorksQuery } from "./lib/work-query-builder";
import { calculateSimilarityScore } from "./lib/work-similarity";
import { sortWorks } from "./lib/work-sorting";
import { generateDataQualityReport, generateWorksStats } from "./lib/work-statistics";
import { convertDocsToWorks, convertWorksToPlainObjects } from "./utils/work-converters";

/**
 * シンプルなクエリで作品を取得
 */
async function getWorksWithSimpleQuery(
	firestore: FirebaseFirestore.Firestore,
	params: EnhancedSearchParams,
): Promise<WorkListResultPlain> {
	const { page = 1, limit = 12, sort = "newest", category, showR18, ageRating } = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, showR18, ageRating, sort });
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
	let query = buildWorksQuery(firestore, { category, showR18, ageRating, sort });

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
 * 関連作品を取得するServer Action（統合データ構造活用）
 */
export async function getRelatedWorks(
	workId: string,
	options: {
		byCircle?: boolean;
		byVoiceActors?: boolean;
		byGenres?: boolean;
		limit?: number;
	} = {},
): Promise<WorkPlainObject[]> {
	const { byCircle = true, byVoiceActors = true, byGenres = true, limit = 6 } = options;

	return withErrorHandling(
		async () => {
			const firestore = getFirestore();

			// 基準作品を取得
			const baseDoc = await firestore.collection("works").doc(workId).get();
			if (!baseDoc.exists) return [];

			const baseWork = {
				id: baseDoc.id,
				...baseDoc.data(),
			} as import("@suzumina.click/shared-types").WorkDocument;

			const allSnapshot = await firestore.collection("works").get();

			let allWorks = allSnapshot.docs.map((doc) => ({
				...doc.data(),
				id: doc.id,
			})) as import("@suzumina.click/shared-types").WorkDocument[];

			// 自身を除外
			allWorks = allWorks.filter((work) => work.id !== workId);

			// 関連度スコア計算
			const scoredWorks = allWorks.map((work) => ({
				work,
				score: calculateSimilarityScore(work, baseWork, byCircle, byVoiceActors, byGenres),
			}));

			// スコア順でソート、上位を取得
			const topRelated = scoredWorks
				.filter((item) => item.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, limit)
				.map((item) => item.work);

			// フロントエンド形式に変換
			const relatedWorks: WorkPlainObject[] = [];
			for (const work of topRelated) {
				if (!work.id) work.id = work.productId;
				const converted = workTransformers.fromFirestore(work);
				relatedWorks.push(converted);
			}

			return relatedWorks;
		},
		{
			action: "getRelatedWorks",
			errorMessage: "関連作品の取得に失敗しました",
			logContext: { workId, options },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		return [];
	});
}

/**
 * 作品統計情報を取得するServer Action
 */
export async function getWorksStats(
	options: { period?: "7d" | "30d" | "90d" | "1y"; groupBy?: "category" | "circle" | "price" } = {},
) {
	return withErrorHandling(
		async () => {
			const firestore = getFirestore();
			const allSnapshot = await firestore.collection("works").get();

			const allWorks = allSnapshot.docs.map((doc) => ({
				...doc.data(),
				id: doc.id,
			})) as import("@suzumina.click/shared-types").WorkDocument[];

			return await generateWorksStats(allWorks);
		},
		{
			action: "getWorksStats",
			errorMessage: "作品統計の取得に失敗しました",
			logContext: { options },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		// エラーの場合は空の統計を返す
		return {
			overview: {
				totalWorks: 0,
				totalValue: 0,
				averagePrice: 0,
				averageRating: 0,
			},
			byCategory: {},
			trends: {
				popularTags: [],
				popularVoiceActors: [],
			},
		};
	});
}

/**
 * 統合データ品質レポートを取得するServer Action
 */
export async function getDataQualityReport() {
	return withErrorHandling(
		async () => {
			const firestore = getFirestore();
			const allSnapshot = await firestore.collection("works").get();

			const allWorks = allSnapshot.docs.map((doc) => ({
				...doc.data(),
				id: doc.id,
			})) as import("@suzumina.click/shared-types").WorkDocument[];

			return generateDataQualityReport(allWorks);
		},
		{
			action: "getDataQualityReport",
			errorMessage: "データ品質レポートの取得に失敗しました",
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		return null;
	});
}

/**
 * 作品詳細と関連作品をまとめて取得するServer Action
 */
export async function getWorkWithRelated(
	workId: string,
	includeRelated = true,
): Promise<{
	work: WorkPlainObject | null;
	related?: WorkPlainObject[];
}> {
	return withErrorHandling(
		async () => {
			const work = await getWorkById(workId);
			if (!work) {
				return { work: null };
			}

			if (!includeRelated) {
				return { work };
			}

			const related = await getRelatedWorks(workId, { limit: 6 });

			return { work, related };
		},
		{
			action: "getWorkWithRelated",
			errorMessage: "作品詳細の取得に失敗しました",
			logContext: { workId, includeRelated },
		},
	).then((result) => {
		if (result.success) {
			return result.data;
		}
		return { work: null };
	});
}

/**
 * 人気声優リストを取得するServer Action
 */
export async function getPopularVoiceActors(limit = 20): Promise<
	Array<{
		voiceActor: string;
		count: number;
		works: string[];
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

			const voiceActorMap = new Map<
				string,
				{
					count: number;
					works: string[];
				}
			>();

			// Extract voice actors from works
			const processVoiceActor = (vaName: string, workTitle: string) => {
				if (!vaName || vaName.trim() === "") return;

				if (!voiceActorMap.has(vaName)) {
					voiceActorMap.set(vaName, { count: 0, works: [] });
				}
				const entry = voiceActorMap.get(vaName);
				if (entry) {
					entry.count++;
					entry.works.push(workTitle);
				}
			};

			// Process all works
			for (const work of allWorks) {
				if (!work.creators?.voice_by) continue;

				for (const va of work.creators.voice_by) {
					processVoiceActor(va.name, work.title);
				}
			}

			return Array.from(voiceActorMap.entries())
				.sort((a, b) => b[1].count - a[1].count)
				.slice(0, limit)
				.map(([voiceActor, data]) => ({
					voiceActor,
					count: data.count,
					works: data.works.slice(0, 5), // 最大5作品を表示
				}));
		},
		{
			action: "getPopularVoiceActors",
			errorMessage: "人気声優リストの取得に失敗しました",
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
