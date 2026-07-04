/**
 * /works の検索パラメータ解析（Server Component の page.tsx と
 * クライアント側の再フェッチ補正の両方から同一ロジックで参照する正本）
 */

interface SearchParamsGetter {
	get(key: string): string | null | undefined;
}

// ジャンルパラメータをパースする関数（複雑度を下げるため分離）
function parseGenres(genresParam: string | null | undefined): string[] | undefined {
	if (typeof genresParam !== "string") return undefined;

	if (genresParam.includes("|")) {
		// 新形式: パイプ区切り
		return genresParam.split("|").filter(Boolean);
	}
	if (genresParam.includes(",") && !genresParam.includes(" ")) {
		// 旧形式: カンマ区切り（スペースを含まない場合のみ）
		return genresParam.split(",").filter(Boolean);
	}
	// 単一の値（スペースを含む可能性がある）
	return [genresParam];
}

export interface ParsedWorksSearchParams {
	page: number;
	limit: number;
	sort: string;
	search?: string;
	category?: string;
	language?: string;
	genres?: string[];
}

export function parseWorksSearchParams(params: SearchParamsGetter): ParsedWorksSearchParams {
	const pageNumber = Number.parseInt(params.get("page") ?? "", 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const sort = params.get("sort") ?? "newest";
	const search = params.get("q") ?? undefined;
	const category = params.get("category") ?? undefined;
	const language = params.get("language") ?? undefined;
	const genres = parseGenres(params.get("genres"));
	const limitValue = Number.parseInt(params.get("limit") ?? "", 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	return {
		page: validPage,
		limit: validLimit,
		sort,
		search,
		category,
		language,
		genres,
	};
}
