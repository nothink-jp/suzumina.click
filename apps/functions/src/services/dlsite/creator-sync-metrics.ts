/**
 * dlsite creator 同期の run-scoped 計測（SPR-225 Stage 0）
 *
 * 挙動は一切変えず、creator 同期パス（`updateCreatorWorkMapping` /
 * `recomputeCreatorStats`）が 1 run で発生させる Firestore reads の内訳を可視化する。
 * SPR-224 で「dlsite 1実行 = 6k〜60k QUERY」と判明した内訳（collectionGroup QUERY /
 * creator 存在 LOOKUP / recompute 全スキャン）を分解し、後続 Stage の効果を測る基線にする。
 *
 * 正本: dlsite 関数はスケジュール起動（2h毎・単発）で並行実行が実質ゼロのため、
 * run 単位の集計は module レベルのカウンタで足りる。run 開始で {@link resetCreatorSyncMetrics}、
 * run 末尾で {@link getCreatorSyncMetrics} の snapshot を 1 行構造化ログに出す前提。
 *
 * 注意: `recomputeCreatorStats` は data-integrity-check / backfill ツールからも呼ばれるが、
 * それらは reset/log しないため別 run としては観測されない（同 module を読み書きするだけで害はない）。
 */

/**
 * 1 run で蓄積する creator 同期の reads/writes 内訳。
 */
export interface CreatorSyncMetricsSnapshot {
	/** getExistingCreatorMappings の collectionGroup QUERY 回数（work あたり1） */
	existingMappingQueries: number;
	/** 上記 QUERY が返した relation ドキュメント総数（type=QUERY の read 量の代理値） */
	existingMappingDocsRead: number;
	/** creator doc の存在チェック get() 回数（type=LOOKUP） */
	creatorExistenceLookups: number;
	/** recomputeCreatorStats の呼び出し回数 */
	recomputeCalls: number;
	/** recompute の全スキャンが読んだ works サブコレクション ドキュメント総数（QUERY read 量の主因） */
	recomputeDocsRead: number;
	/** relation doc への書き込み回数（実変更の代理値） */
	relationWrites: number;
	/** relation doc の削除回数 */
	relationDeletes: number;
}

function createEmptySnapshot(): CreatorSyncMetricsSnapshot {
	return {
		existingMappingQueries: 0,
		existingMappingDocsRead: 0,
		creatorExistenceLookups: 0,
		recomputeCalls: 0,
		recomputeDocsRead: 0,
		relationWrites: 0,
		relationDeletes: 0,
	};
}

let metrics: CreatorSyncMetricsSnapshot = createEmptySnapshot();

/** run 開始時に呼び、前 run の値をクリアする。 */
export function resetCreatorSyncMetrics(): void {
	metrics = createEmptySnapshot();
}

/** getExistingCreatorMappings の collectionGroup QUERY 1 回と、返った docs 数を記録する。 */
export function recordExistingMappingQuery(docsRead: number): void {
	metrics.existingMappingQueries += 1;
	metrics.existingMappingDocsRead += docsRead;
}

/** creator doc 存在チェックの get()（LOOKUP）1 回を記録する。 */
export function recordCreatorExistenceLookup(): void {
	metrics.creatorExistenceLookups += 1;
}

/** recomputeCreatorStats 1 回と、その全スキャンが読んだ docs 数を記録する。 */
export function recordRecompute(docsRead: number): void {
	metrics.recomputeCalls += 1;
	metrics.recomputeDocsRead += docsRead;
}

/** relation doc 書き込み回数を加算する。 */
export function recordRelationWrites(count: number): void {
	metrics.relationWrites += count;
}

/** relation doc 削除回数を加算する。 */
export function recordRelationDeletes(count: number): void {
	metrics.relationDeletes += count;
}

/** 現在の run の snapshot（コピー）を返す。ログ出力用。 */
export function getCreatorSyncMetrics(): CreatorSyncMetricsSnapshot {
	return { ...metrics };
}
