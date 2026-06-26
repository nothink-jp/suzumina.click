/**
 * dlsite サイクルの作品処理順ユーティリティ（SPR-225 Stage 3a）
 *
 * collector のスクレイプ結果は作品 ID が概ね登録順で、**最新作ほど末尾**に来る。バッチを
 * 先頭から処理すると、最新作は末尾バッチ（タイムアウトで次 tick 持ち越し）になり、登録直後に
 * `works` 不在＝「集計/ページに出ない」原因になる（SPR-225 #4 の実害）。
 *
 * そこで新作（`works` に未登録）をサイクル先頭へ並べ替え、run がタイムアウトしても**最初の
 * バッチで作成**されるようにする（fast-lane）。skip ではなく優先順の変更なので戻しやすい。
 */

/**
 * 新作（`known` に含まれない ID）を先頭へ、既存作を後ろへ並べ替える。
 * 各グループ内の相対順は入力（scrape 順）を保つ。
 *
 * @param workIds スクレイプで得た全作品 ID（scrape 順）
 * @param known 既存 `works` の productId を引ける集合（Set / Map いずれも可）
 * @returns 並べ替え後の ID 配列と新作件数
 */
export function orderNewWorksFirst(
	workIds: string[],
	known: { has: (id: string) => boolean },
): { ordered: string[]; newCount: number } {
	const newWorkIds: string[] = [];
	const knownWorkIds: string[] = [];

	for (const id of workIds) {
		if (known.has(id)) {
			knownWorkIds.push(id);
		} else {
			newWorkIds.push(id);
		}
	}

	return {
		ordered: [...newWorkIds, ...knownWorkIds],
		newCount: newWorkIds.length,
	};
}
