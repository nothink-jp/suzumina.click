import type { StandardListParams } from "@suzumina.click/ui/components/custom";

/**
 * 基本的なtoParams関数を作成するユーティリティ
 * @param defaultSort デフォルトのソート順
 * @param extraFields 追加フィールドを返す関数
 * @returns toParams関数
 */
export function createBasicToParams(
	defaultSort = "newest",
	extraFields?: (params: StandardListParams) => Record<string, unknown>,
) {
	return (params: StandardListParams) => {
		const base = {
			page: params.page,
			limit: params.itemsPerPage,
			sort: params.sort || defaultSort,
			search: params.search,
		};

		if (!extraFields) {
			return base;
		}

		const extra = extraFields(params);
		return { ...base, ...extra };
	};
}

/**
 * 標準的なfromResult関数
 */
export const standardFromResult = (result: unknown) => {
	return result as { items: unknown[]; total: number };
};
