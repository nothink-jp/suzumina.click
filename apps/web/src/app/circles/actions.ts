"use server";

import type { CirclePlainObject } from "@suzumina.click/shared-types";
import { loadAllCircles } from "./circles-source";

type GetCirclesParams = {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
};

function compareCircles(a: CirclePlainObject, b: CirclePlainObject, sort: string): number {
	switch (sort) {
		case "nameDesc":
			return b.name.localeCompare(a.name, "ja");
		case "workCount":
			return b.workCount - a.workCount;
		case "workCountAsc":
			return a.workCount - b.workCount;
		default:
			// name / 未知の値ともに名前順（昇順）
			return a.name.localeCompare(b.name, "ja");
	}
}

/**
 * サークル一覧を取得（ConfigurableList用）
 *
 * 絞り込み・並べ替え・ページ送りは `loadAllCircles` が返す全件に対する純粋な導出。
 * Firestore へは行かない（キャッシュ境界の内側）。
 * @param params パラメータ
 * @returns サークル一覧と総件数
 */
export async function getCircles(
	params: GetCirclesParams,
): Promise<{ circles: CirclePlainObject[]; totalCount: number }> {
	const { page = 1, limit = 12, sort = "name", search } = params;

	try {
		const allCircles = await loadAllCircles();

		// 検索フィルタリング
		let filteredCircles = allCircles;
		if (search) {
			const searchLower = search.toLowerCase();
			filteredCircles = allCircles.filter((circle) => {
				const searchableText = [circle.name, circle.nameEn].filter(Boolean).join(" ").toLowerCase();
				return searchableText.includes(searchLower);
			});
		}

		// ソート処理。検索が無いと filteredCircles は `loadAllCircles` の戻り値そのものなので、
		// ここで複製しないと **キャッシュ済みの配列を破壊的に並べ替える**（以降の全リクエストに漏れる）。
		const sortedCircles = [...filteredCircles].sort((a, b) => compareCircles(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		return {
			circles: sortedCircles.slice(startIndex, endIndex),
			totalCount: sortedCircles.length,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { circles: [], totalCount: 0 };
	}
}
