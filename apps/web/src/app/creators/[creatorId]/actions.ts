"use server";

import type { CreatorPageInfo, WorkPlainObject } from "@suzumina.click/shared-types";
import { isValidCreatorId } from "@suzumina.click/shared-types";
import { compareWorks, searchWorks } from "@/lib/circle-creator-works";
import { loadCreatorInfo, loadCreatorWorks } from "./creator-works-source";

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
		return await loadCreatorInfo(creatorId);
	} catch (_error) {
		// エラー発生時はnullを返す
		return null;
	}
}

/**
 * クリエイター作品リストを取得（ConfigurableList用）
 *
 * ページ送り・ソート・検索は `loadCreatorWorks` が返す全作品に対する純粋な導出。
 * Firestore へは行かない（キャッシュ境界の内側で 1 日 1 回）。
 * @param params パラメータ
 * @returns 作品一覧と総件数
 */
export async function getCreatorWorksList(params: {
	creatorId: string;
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<{ works: WorkPlainObject[]; totalCount: number; filteredCount?: number }> {
	const { creatorId, page = 1, limit = 12, sort = "newest", search } = params;

	// 入力検証
	if (!isValidCreatorId(creatorId)) {
		return { works: [], totalCount: 0 };
	}

	try {
		const allWorks = await loadCreatorWorks(creatorId);
		if (!allWorks) {
			return { works: [], totalCount: 0 };
		}

		// 検索フィルター適用
		const { filtered: filteredWorks, count: filteredCount } = searchWorks(allWorks, search);

		// ソート処理。`searchWorks` は検索語が無いと入力配列をそのまま返すため、
		// ここで複製しないと **キャッシュ済みの配列を破壊的に並べ替える**（以降の全リクエストに漏れる）。
		const sortedWorks = [...filteredWorks].sort((a, b) => compareWorks(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedWorks = sortedWorks.slice(startIndex, endIndex);

		return { works: paginatedWorks, totalCount: allWorks.length, filteredCount };
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { works: [], totalCount: 0 };
	}
}
