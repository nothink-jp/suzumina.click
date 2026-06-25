/**
 * dlsite creator 同期の run-scoped 再計算キュー（SPR-225 Stage 1）
 *
 * 旧設計は `updateCreatorWorkMapping` が **work ごと・dedup なし**で、影響 creator 全員
 * （new ∪ existing）に `recomputeCreatorStats`（全作品スキャン）を発火していた。多作 creator
 * （声優 N=数百〜千作）が処理対象 work に現れるたびフルスキャンが反復し、SPR-224 の
 * 「1実行 6k〜60k QUERY」の主因になっていた。
 *
 * 新設計: `updateCreatorWorkMapping` は recompute せず、**stat に影響する mapping 変化**
 * （relation の追加/削除/roles 変化）のあった creator だけをここに enqueue する。
 * エンドポイントが batch loop 後（run 末尾）に {@link takeQueuedCreators} で取り出し、
 * **creator ごと 1 回だけ** recompute する。これで全スキャンは「実際に変わった少数 creator ×1」
 * に限定され、reads の主因を解消する。
 *
 * 正本: dlsite 関数はスケジュール起動（2h毎・単発）で並行実行が実質ゼロのため、run 単位の
 * 集約は module レベルの Set で足りる。run 開始で {@link resetCreatorRecomputeQueue}、
 * run 末尾（完走・中断・例外いずれの経路でも）に drain する前提。
 *
 * この「単発実行」前提はデプロイ設定 `max-instances=1`（`terraform/function_dlsite_individual_info_api.tf`
 * のヘッダに明記・関数本体は out-of-band 管理）で担保される。将来 concurrency > 1 へ移行する場合は、
 * 別 run が互いのキューを `resetCreatorRecomputeQueue()` で潰しうるため、module-level の Set でなく
 * run-scoped state を引数で引き回す設計へ作り替えること。
 */

const queued = new Set<string>();

/**
 * stat 影響変化のあった creator を再計算対象として登録する（重複は Set で吸収）。
 */
export function enqueueChangedCreators(creatorIds: Iterable<string>): void {
	for (const id of creatorIds) {
		queued.add(id);
	}
}

/**
 * 登録済みの creator を重複排除した配列で取り出し、キューを空にする。
 * run 末尾で 1 回だけ呼び、各 creator を 1 回ずつ recompute する。
 */
export function takeQueuedCreators(): string[] {
	const ids = Array.from(queued);
	queued.clear();
	return ids;
}

/** 現在キューに積まれた creator 数（ログ/テスト用）。 */
export function queuedCreatorCount(): number {
	return queued.size;
}

/** run 開始時に呼び、前 run の残骸をクリアする。 */
export function resetCreatorRecomputeQueue(): void {
	queued.clear();
}
