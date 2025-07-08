"use server";

import { filterR18Content } from "@suzumina.click/shared-types/src/age-rating";
import type {
	FrontendDLsiteWorkData,
	OptimizedFirestoreDLsiteWorkData,
	WorkListResult,
} from "@suzumina.click/shared-types/src/work";
import {
	convertToFrontendWork,
	filterWorksByLanguage,
} from "@suzumina.click/shared-types/src/work";
import { getFirestore } from "@/lib/firestore";

type SortOption = "newest" | "oldest" | "price_low" | "price_high" | "rating" | "popular";

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

/**
 * 統合データ構造による拡張検索フィルタリング
 */
function filterWorksByUnifiedData(
	works: OptimizedFirestoreDLsiteWorkData[],
	params: EnhancedSearchParams,
): OptimizedFirestoreDLsiteWorkData[] {
	let filteredWorks = [...works];

	// 基本検索（タイトル・サークル・説明文・統合クリエイター情報）
	if (params.search) {
		const lowerSearch = params.search.toLowerCase();
		filteredWorks = filteredWorks.filter((work) => {
			const searchableText = [
				work.title,
				work.circle,
				work.description,
				...(work.voiceActors || []).filter((va) => typeof va === "string"),
				...(work.scenario || []).filter((s) => typeof s === "string"),
				...(work.illustration || []).filter((i) => typeof i === "string"),
				...(work.music || []).filter((m) => typeof m === "string"),
				...(work.author || []).filter((a) => typeof a === "string"),
				...(work.genres || []).filter((g) => typeof g === "string"),
			]
				.filter((text) => typeof text === "string")
				.join(" ")
				.toLowerCase();

			return searchableText.includes(lowerSearch);
		});
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
			const workVoiceActors = work.voiceActors || [];
			return params.voiceActors?.some((va) =>
				workVoiceActors.some(
					(wva) => typeof wva === "string" && typeof va === "string" && wva.includes(va),
				),
			);
		});
	}

	// ジャンルフィルタリング（統合ジャンル活用）
	if (params.genres && params.genres.length > 0) {
		filteredWorks = filteredWorks.filter((work) => {
			const workGenres = work.genres || [];
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
			const hasHighRes = !!work.highResImageUrl;
			return hasHighRes === params.hasHighResImage;
		});
	}

	// 年齢制限フィルタリング
	if (params.excludeR18) {
		// 年齢制限を取得する関数（データソースから優先的に取得）
		const getAgeRatingFromWork = (work: OptimizedFirestoreDLsiteWorkData): string | undefined => {
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
 * 販売日順ソート処理
 */
function sortByReleaseDate(
	a: OptimizedFirestoreDLsiteWorkData,
	b: OptimizedFirestoreDLsiteWorkData,
	isOldest: boolean,
): number {
	// 販売日のISO形式でソート（存在しない場合は末尾に配置）
	const dateA = a.releaseDateISO || "1900-01-01";
	const dateB = b.releaseDateISO || "1900-01-01";

	// 日付が同じ場合は作品IDでセカンダリソート（一意性保証）
	if (dateA === dateB) {
		return isOldest
			? a.productId.localeCompare(b.productId)
			: b.productId.localeCompare(a.productId);
	}

	// 販売日でプライマリソート
	return isOldest ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
}

/**
 * 作品ソート処理
 */
function sortWorks(
	works: OptimizedFirestoreDLsiteWorkData[],
	sort: SortOption,
): OptimizedFirestoreDLsiteWorkData[] {
	return works.sort((a, b) => {
		switch (sort) {
			case "oldest":
				return sortByReleaseDate(a, b, true);
			case "price_low":
				return (a.price?.current || 0) - (b.price?.current || 0);
			case "price_high":
				return (b.price?.current || 0) - (a.price?.current || 0);
			case "rating":
				return (b.rating?.stars || 0) - (a.rating?.stars || 0);
			case "popular":
				return (b.rating?.count || 0) - (a.rating?.count || 0);
			default: // "newest"
				return sortByReleaseDate(a, b, false);
		}
	});
}

/**
 * DLsite作品データをページネーション付きで取得するServer Action（統合データ構造対応）
 * @param params - 拡張検索パラメータ
 * @returns 作品リスト結果
 */
export async function getWorks(params: EnhancedSearchParams = {}): Promise<WorkListResult> {
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
		_strategy = "standard",
		ageRating,
		excludeR18 = false,
	} = params;
	try {
		const firestore = getFirestore();

		// まず全てのデータを取得して、クライアント側で並び替え
		// (DLsiteのIDフォーマットに対応するため)
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		// 全データを配列に変換
		let allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

		// 統合データ構造による拡張検索フィルタリング
		allWorks = filterWorksByUnifiedData(allWorks, {
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
		});

		// ソート処理
		const sortedWorks = sortWorks(allWorks, sort as SortOption);

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = sortedWorks.slice(startIndex, endIndex);

		// 総数は全取得データから算出
		const totalCount = allWorks.length;

		// FirestoreデータをFrontend用に変換
		const works: FrontendDLsiteWorkData[] = [];

		for (const data of paginatedWorks) {
			try {
				// データにIDが設定されていない場合、ドキュメントIDを使用
				if (!data.id) {
					data.id = data.productId; // productIdをフォールバック
				}

				// フロントエンド形式に変換（OptimizedFirestoreDLsiteWorkDataは上位互換）
				const frontendData = convertToFrontendWork(data);
				works.push(frontendData);
			} catch (_error) {
				// エラーがあっても他のデータの処理は続行
			}
		}

		const hasMore = page * limit < totalCount;

		const result: WorkListResult = {
			works,
			hasMore,
			lastWork: works[works.length - 1],
			totalCount,
		};

		return result;
	} catch (_error) {
		// エラー時は空の結果を返す
		return {
			works: [],
			hasMore: false,
			totalCount: 0,
		};
	}
}

/**
 * 特定の作品IDで作品データを取得するServer Action
 * @param workId - 作品ID
 * @returns 作品データまたはnull
 */
export async function getWorkById(workId: string): Promise<FrontendDLsiteWorkData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("dlsiteWorks").doc(workId).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data() as OptimizedFirestoreDLsiteWorkData;

		// データにIDが設定されていない場合、ドキュメントIDを使用
		if (!data.id) {
			data.id = doc.id;
		}

		// フロントエンド形式に変換（OptimizedFirestoreDLsiteWorkDataは上位互換）
		const frontendData = convertToFrontendWork(data);

		return frontendData;
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
): Promise<FrontendDLsiteWorkData[]> {
	try {
		const { byCircle = true, byVoiceActors = true, byGenres = true, limit = 6 } = options;

		// 基準作品を取得
		const baseWork = await getWorkById(workId);
		if (!baseWork) return [];

		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		let allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

		// 自身を除外
		allWorks = allWorks.filter((work) => work.id !== workId);

		// 関連度スコア計算
		const scoredWorks = allWorks.map((work) => {
			let score = 0;

			// サークル一致（高優先度）
			if (byCircle && work.circle === baseWork.circle) {
				score += 10;
			}

			// 声優一致（統合データ活用）
			if (byVoiceActors && baseWork.voiceActors && work.voiceActors) {
				const commonVoiceActors = baseWork.voiceActors.filter(
					(va) =>
						typeof va === "string" &&
						(work.voiceActors?.some(
							(wva) => typeof wva === "string" && (wva.includes(va) || va.includes(wva)),
						) ??
							false),
				);
				score += commonVoiceActors.length * 3;
			}

			// ジャンル一致（統合データ活用）
			if (byGenres && baseWork.tags && work.genres) {
				const commonGenres = baseWork.tags.filter(
					(tag: string) =>
						typeof tag === "string" &&
						(work.genres?.some((genre) => typeof genre === "string" && genre.includes(tag)) ??
							false),
				);
				score += commonGenres.length * 2;
			}

			// カテゴリ一致
			if (work.category === baseWork.category) {
				score += 1;
			}

			// 価格帯類似性
			if (work.price?.current && baseWork.price?.current) {
				const priceDiff = Math.abs(work.price.current - baseWork.price.current);
				if (priceDiff < 500) score += 1;
			}

			return { work, score };
		});

		// スコア順でソート、上位を取得
		const topRelated = scoredWorks
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((item) => item.work);

		// フロントエンド形式に変換
		const relatedWorks: FrontendDLsiteWorkData[] = [];
		for (const work of topRelated) {
			try {
				if (!work.id) work.id = work.productId;
				const frontendData = convertToFrontendWork(work);
				relatedWorks.push(frontendData);
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
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

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
			if (work.genres) {
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
			if (work.voiceActors) {
				work.voiceActors.forEach((va) => {
					if (typeof va === "string" && va.trim() !== "") {
						voiceActorCounts.set(va, (voiceActorCounts.get(va) || 0) + 1);
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

/**
 * 統合データ品質レポートを取得するServer Action
 * @returns データ品質レポート
 */
export async function getDataQualityReport() {
	try {
		const firestore = getFirestore();
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

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
			if (work.highResImageUrl) qualityStats.hasHighResImage++;
			if (work.voiceActors && work.voiceActors.length > 0) qualityStats.hasVoiceActors++;
			if (work.rating) qualityStats.hasRating++;
			if (work.genres && work.genres.length > 0) qualityStats.hasGenres++;

			// 詳細クリエイター情報
			const hasDetailedCreators = [work.scenario, work.illustration, work.music].some(
				(creators) => creators && creators.length > 0,
			);
			if (hasDetailedCreators) qualityStats.hasDetailedCreators++;

			// データソース情報
			if (work.dataSources) {
				qualityStats.hasDataSources++;
				const sources = work.dataSources;

				if (sources.searchResult) qualityStats.dataSourceCoverage.searchResult++;
				if (sources.infoAPI) qualityStats.dataSourceCoverage.infoAPI++;
				if (sources.detailPage) qualityStats.dataSourceCoverage.detailPage++;

				if (sources.searchResult && sources.infoAPI && sources.detailPage) {
					qualityStats.dataSourceCoverage.allThree++;
				}
			}
		});

		// パーセンテージ計算
		const total = qualityStats.total;
		return {
			...qualityStats,
			percentages: {
				hasHighResImage: Math.round((qualityStats.hasHighResImage / total) * 100),
				hasVoiceActors: Math.round((qualityStats.hasVoiceActors / total) * 100),
				hasDetailedCreators: Math.round((qualityStats.hasDetailedCreators / total) * 100),
				hasRating: Math.round((qualityStats.hasRating / total) * 100),
				hasGenres: Math.round((qualityStats.hasGenres / total) * 100),
				dataSourceCoverage: Math.round((qualityStats.dataSourceCoverage.allThree / total) * 100),
			},
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
} = {}): Promise<WorkListResult> {
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
	work: FrontendDLsiteWorkData | null;
	related?: FrontendDLsiteWorkData[];
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
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

		const voiceActorMap = new Map<
			string,
			{
				count: number;
				works: string[];
			}
		>();

		allWorks.forEach((work) => {
			if (work.voiceActors) {
				work.voiceActors.forEach((va) => {
					if (typeof va === "string" && va.trim() !== "") {
						if (!voiceActorMap.has(va)) {
							voiceActorMap.set(va, { count: 0, works: [] });
						}
						const entry = voiceActorMap.get(va);
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
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		const allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as OptimizedFirestoreDLsiteWorkData[];

		const genreCounts = new Map<string, number>();

		allWorks.forEach((work) => {
			if (work.genres) {
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
