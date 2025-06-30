"use server";

import type {
	FirestoreDLsiteWorkData,
	FrontendDLsiteWorkData,
	WorkListResult,
} from "@suzumina.click/shared-types/src/work";
import { convertToFrontendWork } from "@suzumina.click/shared-types/src/work";
import { getFirestore } from "@/lib/firestore";

type SortOption = "newest" | "oldest" | "price_low" | "price_high" | "rating" | "popular";

/**
 * ID順ソート処理
 */
function sortById(
	a: FirestoreDLsiteWorkData,
	b: FirestoreDLsiteWorkData,
	isOldest: boolean,
): number {
	if (a.productId.length !== b.productId.length) {
		return isOldest
			? a.productId.length - b.productId.length
			: b.productId.length - a.productId.length;
	}
	return isOldest ? a.productId.localeCompare(b.productId) : b.productId.localeCompare(a.productId);
}

/**
 * 作品ソート処理
 */
function sortWorks(works: FirestoreDLsiteWorkData[], sort: SortOption): FirestoreDLsiteWorkData[] {
	return works.sort((a, b) => {
		switch (sort) {
			case "oldest":
				return sortById(a, b, true);
			case "price_low":
				return (a.price?.current || 0) - (b.price?.current || 0);
			case "price_high":
				return (b.price?.current || 0) - (a.price?.current || 0);
			case "rating":
				return (b.rating?.stars || 0) - (a.rating?.stars || 0);
			case "popular":
				return (b.rating?.count || 0) - (a.rating?.count || 0);
			default:
				return sortById(a, b, false);
		}
	});
}

/**
 * DLsite作品データをページネーション付きで取得するServer Action（ユーザー向け）
 * @param params - ページネーション用パラメータ
 * @returns 作品リスト結果
 */
export async function getWorks({
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
	try {
		const firestore = getFirestore();

		// まず全てのデータを取得して、クライアント側で並び替え
		// (DLsiteのIDフォーマットに対応するため)
		const allSnapshot = await firestore.collection("dlsiteWorks").get();

		// 全データを配列に変換
		let allWorks = allSnapshot.docs.map((doc) => ({
			...doc.data(),
			id: doc.id,
		})) as FirestoreDLsiteWorkData[];

		// 検索フィルタリング
		if (search) {
			const lowerSearch = search.toLowerCase();
			allWorks = allWorks.filter((work) => {
				const lowerTitle = work.title.toLowerCase();
				return lowerTitle.includes(lowerSearch);
			});
		}

		// カテゴリーフィルタリング
		if (category && category !== "all") {
			allWorks = allWorks.filter((work) => work.category === category);
		}

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

				// フロントエンド形式に変換
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

		const data = doc.data() as FirestoreDLsiteWorkData;

		// データにIDが設定されていない場合、ドキュメントIDを使用
		if (!data.id) {
			data.id = doc.id;
		}

		// フロントエンド形式に変換
		const frontendData = convertToFrontendWork(data);

		return frontendData;
	} catch (_error) {
		return null;
	}
}
