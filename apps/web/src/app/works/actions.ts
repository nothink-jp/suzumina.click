"use server";

import type {
	WorkDocument,
	WorkListResultPlain,
	WorkPlainObject,
} from "@suzumina.click/shared-types";
import {
	convertToWorkPlainObject,
	filterR18Content,
	filterWorksByLanguage,
} from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";

/**
 * データ取得戦略の定義（統合データ構造対応）
 */
type DataFetchStrategy = "minimal" | "standard" | "comprehensive";

/**
 * 拡張検索パラメータ（統合データ構造対応）
 */
interface EnhancedSearchParams {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	category?: string;
	language?: string; // 言語フィルター
	// 統合データ構造による新機能
	voiceActors?: string[]; // 声優検索
	genres?: string[]; // ジャンル検索
	priceRange?: {
		// 価格範囲
		min?: number;
		max?: number;
	};
	ratingRange?: {
		// 評価範囲
		min?: number;
		max?: number;
	};
	hasHighResImage?: boolean; // 高解像度画像有無
	_strategy?: DataFetchStrategy; // データ取得戦略（未使用）
	// 年齢制限フィルター
	ageRating?: string[]; // 特定のレーティングのみ
	excludeR18?: boolean; // R18作品を除外
}

// ヘルパー関数：2つの作品間の類似スコアを計算
function calculateSimilarityScore(
	work: WorkDocument,
	baseWork: WorkDocument,
	byCircle: boolean,
	byVoiceActors: boolean,
	byGenres: boolean,
): number {
	let score = 0;

	// サークル一致（高優先度）
	if (byCircle && work.circle === baseWork.circle) {
		score += 10;
	}

	// 声優一致（統合データ活用）
	if (byVoiceActors && baseWork.creators?.voice_by && work.creators?.voice_by) {
		const baseVoiceActorNames = baseWork.creators.voice_by.map((v) => v.name);
		const workVoiceActorNames = work.creators.voice_by.map((v) => v.name);
		const commonVoiceActors = baseVoiceActorNames.filter(
			(va) =>
				typeof va === "string" &&
				workVoiceActorNames.some(
					(wva) => typeof wva === "string" && (wva.includes(va) || va.includes(wva)),
				),
		);
		score += commonVoiceActors.length * 3;
	}

	// ジャンル一致（統合データ活用）
	if (byGenres && Array.isArray(baseWork.genres) && Array.isArray(work.genres)) {
		const commonGenres = baseWork.genres.filter(
			(genre: string) =>
				typeof genre === "string" &&
				(work.genres?.some(
					(workGenre) => typeof workGenre === "string" && workGenre.includes(genre),
				) ??
					false),
		);
		score += commonGenres.length * 2;
	}

	// カテゴリ一致
	if (work.category === baseWork.category) {
		score += 1;
	}

	// 価格帯類似性
	if (work.price && baseWork.price) {
		const priceDiff = Math.abs(work.price.current - baseWork.price.current);
		if (priceDiff < 500) score += 1;
	}

	return score;
}

// ヘルパー関数：検索テキストで作品をフィルタリング
function filterWorksBySearchText(works: WorkDocument[], searchText: string) {
	const lowerSearch = searchText.toLowerCase();
	return works.filter((work) => {
		const searchableText = [
			work.title,
			work.circle,
			work.description,
			...(work.creators?.voice_by?.map((c) => c.name) || []),
			...(work.creators?.scenario_by?.map((c) => c.name) || []),
			...(work.creators?.illust_by?.map((c) => c.name) || []),
			...(work.creators?.music_by?.map((c) => c.name) || []),
			...(work.creators?.others_by?.map((c) => c.name) || []),
			...(Array.isArray(work.genres) ? work.genres.filter((g) => typeof g === "string") : []),
		]
			.filter((text) => typeof text === "string")
			.join(" ")
			.toLowerCase();

		return searchableText.includes(lowerSearch);
	});
}

/**
 * 統合データ構造による拡張検索フィルタリング
 */
function filterWorksByUnifiedData(
	works: WorkDocument[],
	params: EnhancedSearchParams,
): WorkDocument[] {
	let filteredWorks = [...works];

	// 基本検索（タイトル・サークル・説明文・統合クリエイター情報）
	if (params.search) {
		filteredWorks = filterWorksBySearchText(filteredWorks, params.search);
	}

	// カテゴリーフィルタリング
	if (params.category && params.category !== "all") {
		filteredWorks = filteredWorks.filter((work) => work.category === params.category);
	}

	// 言語フィルタリング
	if (params.language && params.language !== "all") {
		filteredWorks = filterWorksByLanguage(filteredWorks, params.language);
	}

	// 声優フィルタリング（統合データ活用）
	if (params.voiceActors && params.voiceActors.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workVoiceActorNames = work.creators?.voice_by?.map((c) => c.name) || [];
			return params.voiceActors?.some((va) =>
				workVoiceActorNames.some(
					(wva) => typeof wva === "string" && typeof va === "string" && wva.includes(va),
				),
			);
		});
	}

	// ジャンルフィルタリング（統合ジャンル活用）
	if (params.genres && params.genres.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workGenres = Array.isArray(work.genres) ? work.genres : [];
			return params.genres?.some((genre) =>
				workGenres.some(
					(wg) => typeof wg === "string" && typeof genre === "string" && wg.includes(genre),
				),
			);
		});
	}

	// 価格範囲フィルタリング
	if (params.priceRange) {
		filteredWorks = filteredWorks.filter((work) => {
			const price = work.price?.current || 0;
			const { min = 0, max = Number.MAX_SAFE_INTEGER } = params.priceRange || {};
			return price >= min && price <= max;
		});
	}

	// 評価範囲フィルタリング
	if (params.ratingRange) {
		filteredWorks = filteredWorks.filter((work) => {
			const rating = work.rating?.stars || 0;
			const { min = 0, max = 5 } = params.ratingRange || {};
			return rating >= min && rating <= max;
		});
	}

	// 高解像度画像有無フィルタリング
	if (params.hasHighResImage !== undefined) {
		filteredWorks = filteredWorks.filter((work) => {
			const hasHighRes = !!(work.highResImageUrl && work.highResImageUrl.trim() !== "");
			return hasHighRes === params.hasHighResImage;
		});
	}

	// 年齢制限フィルタリング
	if (params.excludeR18) {
		// 年齢制限を取得する関数（データソースから優先的に取得）
		const getAgeRatingFromWork = (work: WorkDocument): string | undefined => {
			return work.ageRating || undefined;
		};

		filteredWorks = filterR18Content(filteredWorks, getAgeRatingFromWork);
	}

	// 特定の年齢制限でフィルタリング
	if (params.ageRating && params.ageRating.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workAgeRating = work.ageRating || "";
			return params.ageRating?.some(
				(rating) =>
					typeof workAgeRating === "string" &&
					typeof rating === "string" &&
					(workAgeRating.includes(rating) || rating === workAgeRating),
			);
		});
	}

	return filteredWorks;
}

/**
 * Firestoreクエリを構築する
 */
function buildWorksQuery(
	firestore: FirebaseFirestore.Firestore,
	params: {
		category?: string;
		excludeR18?: boolean;
		ageRating?: string[];
		sort?: string;
	},
): FirebaseFirestore.Query {
	let query: FirebaseFirestore.Query = firestore.collection("works");

	// カテゴリーフィルタ
	if (params.category && params.category !== "all") {
		query = query.where("category", "==", params.category);
	}

	// 年齢制限フィルタ
	if (params.excludeR18) {
		query = query.where("isR18", "==", false);
	}

	// 特定の年齢制限フィルタ（単一の場合のみ）
	if (params.ageRating && params.ageRating.length === 1) {
		query = query.where("ageRating", "==", params.ageRating[0]);
	}

	// ソート処理
	switch (params.sort) {
		case "oldest":
			query = query.orderBy("releaseDateISO", "asc");
			break;
		case "price_low":
			query = query.orderBy("price.current", "asc");
			break;
		case "price_high":
			query = query.orderBy("price.current", "desc");
			break;
		case "rating":
			query = query.orderBy("rating.stars", "desc");
			break;
		case "popular":
			query = query.orderBy("rating.count", "desc");
			break;
		default: // "newest"
			query = query.orderBy("releaseDateISO", "desc");
	}

	return query;
}

/**
 * 複雑なフィルタリングが必要かチェック
 */
function needsComplexFiltering(params: EnhancedSearchParams): boolean {
	return !!(
		params.search ||
		params.language ||
		params.voiceActors?.length ||
		params.genres?.length ||
		params.priceRange ||
		params.ratingRange ||
		params.hasHighResImage !== undefined ||
		(params.ageRating && params.ageRating.length > 1)
	);
}

/**
 * Firestoreドキュメントを作品オブジェクトに変換
 */
async function convertDocsToWorks(
	docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<WorkPlainObject[]> {
	const works: WorkPlainObject[] = [];
	for (const doc of docs) {
		try {
			const data = { ...doc.data(), id: doc.id } as WorkDocument;
			if (!data.id) {
				data.id = data.productId;
			}
			const plainObject = convertToWorkPlainObject(data);
			if (plainObject) {
				works.push(plainObject);
			}
		} catch (_error) {
			// エラーがあっても他のデータの処理は続行
		}
	}
	return works;
}

/**
 * DLsite作品データをページネーション付きで取得するServer Action（統合データ構造対応）
 * @param params - 拡張検索パラメータ
 * @returns 作品リスト結果
 */
export async function getWorks(params: EnhancedSearchParams = {}): Promise<WorkListResultPlain> {
	try {
		const firestore = getFirestore();

		// 複雑なフィルタリングが必要かチェック
		if (needsComplexFiltering(params)) {
			return await getWorksWithComplexFiltering(firestore, params);
		}

		// シンプルなクエリの場合
		return await getWorksWithSimpleQuery(firestore, params);
	} catch (_error) {
		return {
			works: [],
			hasMore: false,
			totalCount: 0,
		};
	}
}

/**
 * シンプルなクエリで作品を取得
 */
async function getWorksWithSimpleQuery(
	firestore: FirebaseFirestore.Firestore,
	params: EnhancedSearchParams,
): Promise<WorkListResultPlain> {
	const { page = 1, limit = 12, sort = "newest", category, excludeR18, ageRating } = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, excludeR18, ageRating, sort });
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

	// 全件数を取得
	const countSnapshot = await firestore.collection("works").count().get();
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
		excludeR18,
	} = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, excludeR18, ageRating, sort });

	// ページネーション用のオフセット
	const startOffset = (page - 1) * limit;
	const fetchLimit = Math.min(startOffset + limit * 3, 500);
	query = query.limit(fetchLimit);

	const snapshot = await query.get();
	let allWorks = snapshot.docs.map((doc) => ({
		...doc.data(),
		id: doc.id,
	})) as WorkDocument[];

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
	});

	const filteredCount = allWorks.length;
	const paginatedWorks = allWorks.slice(startOffset, startOffset + limit);

	// 変換処理
	const works: WorkPlainObject[] = [];
	for (const data of paginatedWorks) {
		try {
			if (!data.id) {
				data.id = data.productId;
			}
			const plainObject = convertToWorkPlainObject(data);
			if (plainObject) {
				works.push(plainObject);
			}
		} catch (_error) {
			// エラーがあっても他のデータの処理は続行
		}
	}

	// 全件数の推定
	const totalCount = snapshot.size < fetchLimit ? filteredCount : filteredCount * 2;
	const hasMore = startOffset + limit < filteredCount || snapshot.size === fetchLimit;

	return {
		works,
		hasMore,
		lastWork: works[works.length - 1],
		totalCount,
		filteredCount,
	};
}

/**
 * 特定の作品IDで作品データを取得するServer Action
 * @param workId - 作品ID
 * @returns 作品データまたはnull
 */
export async function getWorkById(workId: string): Promise<WorkPlainObject | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("works").doc(workId).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data() as WorkDocument;

		// データにIDが設定されていない場合、ドキュメントIDを使用
		if (!data.id) {
			data.id = doc.id;
		}

		// フロントエンド形式に変換
		return convertToWorkPlainObject(data);
	} catch (_error) {
		return null;
	}
}

/**
 * 関連作品を取得するServer Action（統合データ構造活用）
 * @param workId - 基準となる作品ID
 * @param options - 取得オプション
 * @returns 関連作品リスト
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
	try {
		const { byCircle = true, byVoiceActors = true, byGenres = true, limit = 6 } = options;

		const firestore = getFirestore();

		// 基準作品を取得
		const baseDoc = await firestore.collection("works").doc(workId).get();
		if (!baseDoc.exists) return [];

		const baseWork = { id: baseDoc.id, ...baseDoc.data() } as WorkDocument;

		const allSnapshot = await firestore.collection("works").get();

		let allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as WorkDocument[];

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
			try {
				if (!work.id) work.id = work.productId;
				const plainObject = convertToWorkPlainObject(work);
				if (plainObject) {
					relatedWorks.push(plainObject);
				}
			} catch (_error) {
				// エラーがあっても他のデータの処理は続行
			}
		}

		return relatedWorks;
	} catch (_error) {
		return [];
	}
}

/**
 * 作品統計情報を取得するServer Action（統合データ構造活用）
 * @param options - 統計取得オプション
 * @returns 統計情報
 */
export async function getWorksStats(
	_options: {
		period?: "7d" | "30d" | "90d" | "1y";
		groupBy?: "category" | "circle" | "price";
	} = {},
) {
	try {
		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("works").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as WorkDocument[];

		// 基本統計
		const totalWorks = allWorks.length;
		const totalValue = allWorks.reduce((sum, work) => sum + (work.price?.current || 0), 0);
		const averagePrice = totalValue / totalWorks;
		const averageRating = allWorks
			.filter((work) => work.rating?.stars)
			.reduce((sum, work, _, array) => sum + (work.rating?.stars ?? 0) / array.length, 0);

		// カテゴリ別統計
		const byCategory = allWorks.reduce(
			(acc, work) => {
				const category = work.category || "unknown";
				if (!acc[category]) {
					acc[category] = {
						count: 0,
						totalValue: 0,
						totalRating: 0,
						ratingCount: 0,
					};
				}

				acc[category].count++;
				acc[category].totalValue += work.price?.current || 0;

				if (work.rating?.stars) {
					acc[category].totalRating += work.rating.stars;
					acc[category].ratingCount++;
				}

				return acc;
			},
			{} as Record<
				string,
				{
					count: number;
					totalValue: number;
					totalRating: number;
					ratingCount: number;
					averagePrice?: number;
					averageRating?: number;
				}
			>,
		);

		// カテゴリ別平均値を計算
		Object.keys(byCategory).forEach((category) => {
			const stats = byCategory[category];
			if (stats) {
				stats.averagePrice = stats.totalValue / stats.count;
				stats.averageRating = stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0;
			}
		});

		// 人気タグ（統合ジャンル活用）
		const tagCounts = new Map<string, number>();
		allWorks.forEach((work) => {
			if (Array.isArray(work.genres)) {
				work.genres.forEach((genre) => {
					if (typeof genre === "string" && genre.trim() !== "") {
						tagCounts.set(genre, (tagCounts.get(genre) || 0) + 1);
					}
				});
			}
		});

		const popularTags = Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 20)
			.map(([tag, count]) => ({ tag, count }));

		// 人気声優（統合データ活用）
		const voiceActorCounts = new Map<string, number>();
		allWorks.forEach((work) => {
			if (work.creators?.voice_by) {
				work.creators.voice_by.forEach((va) => {
					if (va.name && va.name.trim() !== "") {
						voiceActorCounts.set(va.name, (voiceActorCounts.get(va.name) || 0) + 1);
					}
				});
			}
		});

		const popularVoiceActors = Array.from(voiceActorCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([voiceActor, count]) => ({ voiceActor, count }));

		return {
			overview: {
				totalWorks,
				totalValue,
				averagePrice: Math.round(averagePrice),
				averageRating: Math.round(averageRating * 10) / 10,
			},
			byCategory,
			trends: {
				popularTags,
				popularVoiceActors,
			},
		};
	} catch (_error) {
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
	}
}

// データ品質統計の型定義
interface QualityStats {
	total: number;
	hasHighResImage: number;
	hasVoiceActors: number;
	hasDetailedCreators: number;
	hasRating: number;
	hasGenres: number;
	hasDataSources: number;
	dataSourceCoverage: {
		searchResult: number;
		infoAPI: number;
		detailPage: number;
		allThree: number;
	};
}

// ヘルパー関数：基本的な品質統計を更新
function updateBasicQualityStats(work: WorkDocument, stats: QualityStats) {
	const hasHighRes = !!(work.highResImageUrl && work.highResImageUrl.trim() !== "");
	if (hasHighRes) stats.hasHighResImage++;
	if (work.creators?.voice_by && work.creators.voice_by.length > 0) stats.hasVoiceActors++;
	if (work.rating?.stars) stats.hasRating++;
	if (Array.isArray(work.genres) && work.genres.length > 0) stats.hasGenres++;
}

// ヘルパー関数：クリエイター統計を更新
function updateCreatorStats(work: WorkDocument, stats: QualityStats) {
	const hasDetailedCreators = [
		work.creators?.scenario_by,
		work.creators?.illust_by,
		work.creators?.music_by,
	].some((creators) => creators && creators.length > 0);
	if (hasDetailedCreators) stats.hasDetailedCreators++;
}

// ヘルパー関数：データソース統計を更新
function updateDataSourceStats(work: WorkDocument, stats: QualityStats) {
	if (work.dataSources) {
		stats.hasDataSources++;
		const sources = work.dataSources;

		if (sources.searchResult) stats.dataSourceCoverage.searchResult++;
		if (sources.infoAPI) stats.dataSourceCoverage.infoAPI++;

		if (sources.searchResult && sources.infoAPI) {
			stats.dataSourceCoverage.allThree++;
		}
	}
}

// ヘルパー関数：パーセンテージ計算
function calculateQualityPercentages(stats: QualityStats) {
	const total = stats.total;
	return {
		hasHighResImage: Math.round((stats.hasHighResImage / total) * 100),
		hasVoiceActors: Math.round((stats.hasVoiceActors / total) * 100),
		hasDetailedCreators: Math.round((stats.hasDetailedCreators / total) * 100),
		hasRating: Math.round((stats.hasRating / total) * 100),
		hasGenres: Math.round((stats.hasGenres / total) * 100),
		dataSourceCoverage: Math.round((stats.dataSourceCoverage.allThree / total) * 100),
	};
}

/**
 * 統合データ品質レポートを取得するServer Action
 * @returns データ品質レポート
 */
export async function getDataQualityReport() {
	try {
		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("works").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as WorkDocument[];

		const qualityStats = {
			total: allWorks.length,
			hasHighResImage: 0,
			hasVoiceActors: 0,
			hasDetailedCreators: 0,
			hasRating: 0,
			hasGenres: 0,
			hasDataSources: 0,
			dataSourceCoverage: {
				searchResult: 0,
				infoAPI: 0,
				detailPage: 0,
				allThree: 0,
			},
		};

		allWorks.forEach((work) => {
			updateBasicQualityStats(work, qualityStats);
			updateCreatorStats(work, qualityStats);
			updateDataSourceStats(work, qualityStats);
		});

		return {
			...qualityStats,
			percentages: calculateQualityPercentages(qualityStats),
		};
	} catch (_error) {
		return null;
	}
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

/**
 * 作品詳細と関連作品をまとめて取得するServer Action
 * @param workId - 作品ID
 * @param includeRelated - 関連作品を含むか
 * @returns 作品詳細と関連作品
 */
export async function getWorkWithRelated(
	workId: string,
	includeRelated = true,
): Promise<{
	work: WorkPlainObject | null;
	related?: WorkPlainObject[];
}> {
	try {
		const work = await getWorkById(workId);
		if (!work) {
			return { work: null };
		}

		if (!includeRelated) {
			return { work };
		}

		const related = await getRelatedWorks(workId, { limit: 6 });

		return { work, related };
	} catch (_error) {
		return { work: null };
	}
}

/**
 * 人気声優リストを取得するServer Action（統合データ活用）
 * @param limit - 取得件数
 * @returns 人気声優リスト
 */
export async function getPopularVoiceActors(limit = 20): Promise<
	Array<{
		voiceActor: string;
		count: number;
		works: string[];
	}>
> {
	try {
		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("works").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as WorkDocument[];

		const voiceActorMap = new Map<
			string,
			{
				count: number;
				works: string[];
			}
		>();

		allWorks.forEach((work) => {
			if (work.creators?.voice_by) {
				work.creators.voice_by.forEach((va) => {
					if (va.name && va.name.trim() !== "") {
						if (!voiceActorMap.has(va.name)) {
							voiceActorMap.set(va.name, { count: 0, works: [] });
						}
						const entry = voiceActorMap.get(va.name);
						if (entry) {
							entry.count++;
							entry.works.push(work.title);
						}
					}
				});
			}
		});

		return Array.from(voiceActorMap.entries())
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, limit)
			.map(([voiceActor, data]) => ({
				voiceActor,
				count: data.count,
				works: data.works.slice(0, 5), // 最大5作品を表示
			}));
	} catch (_error) {
		return [];
	}
}

/**
 * 人気ジャンルリストを取得するServer Action（統合データ活用）
 * @param limit - 取得件数
 * @returns 人気ジャンルリスト
 */
export async function getPopularGenres(limit = 30): Promise<
	Array<{
		genre: string;
		count: number;
	}>
> {
	try {
		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("works").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as WorkDocument[];

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
	} catch (_error) {
		return [];
	}
}
