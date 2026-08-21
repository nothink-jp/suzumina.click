"use server";

import type { CreatorPageInfo } from "@suzumina.click/shared-types";
import { loadAllCreators } from "./creators-source";

type GetCreatorsParams = {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	role?: string;
};

type GetCreatorsResult = { creators: CreatorPageInfo[]; totalCount: number };

function compareCreators(a: CreatorPageInfo, b: CreatorPageInfo, sort: string): number {
	switch (sort) {
		case "nameDesc":
			return b.name.localeCompare(a.name, "ja");
		case "workCount":
			// 作品数順（多い順）。同数なら名前順
			return b.workCount - a.workCount || a.name.localeCompare(b.name, "ja");
		case "workCountAsc":
			// 作品数順（少ない順）。同数なら名前順
			return a.workCount - b.workCount || a.name.localeCompare(b.name, "ja");
		default:
			// name / 未知の値ともに名前順（昇順）
			return a.name.localeCompare(b.name, "ja");
	}
}

/**
 * クリエイター一覧を取得（ConfigurableList用）
 *
 * 絞り込み・並べ替え・ページ送りは `loadAllCreators` が返す全件に対する純粋な導出。
 * Firestore へは行かない（キャッシュ境界の内側）。
 * @param params パラメータ
 * @returns クリエイター一覧と総件数
 */
export async function getCreators(params: GetCreatorsParams): Promise<GetCreatorsResult> {
	const { page = 1, limit = 12, sort = "name", search, role } = params;

	try {
		const allCreators = await loadAllCreators();

		// 役割でフィルタリング
		let filteredCreators =
			role && role !== "all"
				? allCreators.filter((creator) => creator.types.includes(role))
				: allCreators;

		// 検索フィルタリング
		if (search) {
			const searchLower = search.toLowerCase();
			filteredCreators = filteredCreators.filter((creator) =>
				creator.name.toLowerCase().includes(searchLower),
			);
		}

		// ソート処理。フィルタが無いと filteredCreators は `loadAllCreators` の戻り値そのものなので、
		// ここで複製しないと **キャッシュ済みの配列を破壊的に並べ替える**（以降の全リクエストに漏れる）。
		const sortedCreators = [...filteredCreators].sort((a, b) => compareCreators(a, b, sort));

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		return {
			creators: sortedCreators.slice(startIndex, endIndex),
			totalCount: sortedCreators.length,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { creators: [], totalCount: 0 };
	}
}
