/**
 * 同じサークルの他の作品を選ぶ純関数（SPR-302 第2弾）。
 *
 * 表示件数の上限をここに置くのは、これが**読み取りコストの上限そのもの**だから。
 * サークルには最大 789 作品あり、workIds を全件引くと #917 で潰した全件スキャンが
 * 別経路で復活する。ID を絞ってから `fetchWorksByIds` に渡すこと。
 */
export interface RelatedWork {
	productId: string;
	title: string;
	formattedPrice: string;
}

/** 1 作品あたりの追加読み取り数の上限（circles/{id} の 1 read は別途） */
export const RELATED_WORKS_LIMIT = 6;

/**
 * 表示対象の作品 ID を選ぶ。
 *
 * 並びは workIds の**末尾から**取る。DLsite 取り込みが arrayUnion で追記するため
 * 末尾ほど新しく、新しい作品の方が検索需要があるという想定（順序が保証された
 * フィールドではないので、これは best-effort であって仕様ではない）。
 */
export function pickRelatedWorks(workIds: string[], currentWorkId: string): string[] {
	const others = workIds.filter((id) => id !== currentWorkId);
	if (others.length === 0) return [];

	return others.slice(-RELATED_WORKS_LIMIT).reverse();
}
