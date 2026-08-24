"use server";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { workTransformers } from "@suzumina.click/shared-types";
import { unstable_cache } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { withErrorHandling } from "@/lib/server-action-wrapper";

// Internal modules
import type { EnhancedSearchParams } from "./lib/work-filtering";
import { filterWorksByUnifiedData, needsComplexFiltering } from "./lib/work-filtering";
import { buildNonR18WorksQuery, buildWorksQuery } from "./lib/work-query-builder";
import { sortWorks } from "./lib/work-sorting";
import {
	convertDocsToWorks,
	convertWorksToPlainObjects,
	parseWorkDocument,
} from "./utils/work-converters";

/**
 * シンプルなクエリで作品を取得
 */
async function getWorksWithSimpleQuery(
	firestore: FirebaseFirestore.Firestore,
	params: EnhancedSearchParams,
): Promise<WorkListResultPlain> {
	const { page = 1, limit = 12, sort = "newest", category } = params;

	// クエリ構築
	let query = buildWorksQuery(firestore, { category, sort });
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

	// 全件数取得用クエリ（ソート不要。category フィルタのみ適用）
	let countQuery: FirebaseFirestore.Query = firestore.collection("works");
	if (category && category !== "all") {
		countQuery = countQuery.where("category", "==", category);
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
		showR18,
	} = params;

	// クエリ構築。
	// 匿名・年齢未確認（showR18 === false）は表示対象が非 R18 の 37 件しかないので、
	// 全件を読んでから in-memory で落とすのをやめ、Firestore 側で絞る（SPR-321）。
	const excludeR18 = showR18 === false;
	let query = excludeR18
		? buildNonR18WorksQuery(firestore, { category })
		: buildWorksQuery(firestore, { category, sort });

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
		// limit を設定しない。
		// excludeR18 のときは上のクエリが既に 37 件程度まで絞っている。
		// それ以外（検索・ジャンル・声優・言語）は絞り込み条件を Firestore で表現できないため
		// 全件（2,191 件）を読む。ここは残っている増幅で、実トラフィックでの利用率が低いため据え置き。
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

	// メモリ上でのフィルタリング。
	// excludeR18 のときは既にクエリ側で非 R18 に絞られているため、この中の `showR18 === false`
	// 分岐（filterR18Content = denylist）は実質 no-op になる（"全年齢" / "R15" はどちらも
	// isR18Content で false）。**冗長に見えるが意図的に残している**: allowlist（クエリ）と
	// denylist（判定）が将来食い違ったとき、R18 が匿名一覧へ漏れるのをここで止める安全網になる。
	// 対象は 37 件程度なのでコストは無視できる。消さないこと（SPR-321）。
	allWorks = filterWorksByUnifiedData(allWorks, {
		search,
		language,
		voiceActors,
		genres,
		priceRange,
		ratingRange,
		hasHighResImage,
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

			// raw に id: doc.id を常に含めるため、data.id は設定済み
			const data = parseWorkDocument({ ...doc.data(), id: doc.id });

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
type PopularGenre = { genre: string; count: number };

async function fetchPopularGenres(limit?: number): Promise<PopularGenre[]> {
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

			const sorted = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);
			// limit 未指定はフィルタ選択肢を「全ジャンル選択可能」にするための全件返却（ADR-012 Filters拡張）。
			// 呼び出し元（絞り込みUI）は全件、他用途で上位N件だけ要る場合のみ明示的に limit を渡す。
			return (limit === undefined ? sorted : sorted.slice(0, limit)).map(([genre, count]) => ({
				genre,
				count,
			}));
		},
		{
			action: "getPopularGenres",
			errorMessage: "人気ジャンルの取得に失敗しました",
			logContext: { limit },
		},
	).then((result) => (result.success ? result.data : []));
}

// 全 works(約2069件)を読むためコスト大。ジャンルは works 追加（2h DLsite 同期）時のみ変化する低頻度データ。
// SPR-218: reads 実測で、この全件スキャンが Firestore QUERY reads（全体の96%がQUERY）の主因の一つと判明。
// ジャンルは低頻度変化で 6h 鮮度で十分なため TTL を 10分→6h に延長し全件 read 頻度を ~36分の1 に抑える
// （SPR-161 の 10 分は短すぎた）。即時反映が要る場合は works 更新時に revalidateTag("works-list") で対応。
const getPopularGenresCached = unstable_cache(fetchPopularGenres, ["popular-genres"], {
	revalidate: 21600,
	tags: ["works-list"],
});

export async function getPopularGenres(limit?: number): Promise<PopularGenre[]> {
	return getPopularGenresCached(limit);
}
