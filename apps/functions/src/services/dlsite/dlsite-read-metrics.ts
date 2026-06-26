/**
 * dlsite 同期 run の Firestore reads 計測（SPR-225 Stage 0 → P0 で一般化）
 *
 * SPR-224 の「dlsite 1実行 = 6k〜60k QUERY」の内訳を、挙動を変えず可視化する。Stage 0 では
 * creator-sync（`updateCreatorWorkMapping` / `recomputeCreatorStats`）のみ計測していたが、
 * Stage 1 で creator recompute storm を解消した後、run 窓の QUERY が依然 17k 規模だったため
 * **dlsite 関数の自前 QUERY を網羅計測**する必要が出た（集計 Monitoring は DB 単位で web と
 * 分離できないため、in-process 計測が唯一の確定手段）。本モジュールはその run-scoped 集計。
 *
 * 正本: dlsite 関数はスケジュール起動（2h毎・単発・`max-instances=1`）で並行実行が実質ゼロのため、
 * run 単位の集計は module レベルのカウンタで足りる。run 開始で {@link resetDlsiteReadMetrics}、
 * run 末尾で {@link getDlsiteReadMetrics} の snapshot を 1 行構造化ログに出す前提。
 *
 * 注意: `recomputeCreatorStats` は data-integrity-check / backfill からも呼ばれるが、それらは
 * reset/log しないため別 run としては観測されない（同 module を読み書きするだけで害はない）。
 */

/**
 * 1 run で蓄積する dlsite 同期の Firestore reads/writes 内訳。
 */
export interface DlsiteReadMetricsSnapshot {
	/** getExistingWorksMap の `where("productId","in",...)` クエリ回数（チャンク数） */
	worksMapQueries: number;
	/** 上記クエリが返した work ドキュメント総数（type=QUERY の read 量の主因候補） */
	worksMapDocsRead: number;
	/** getExistingCreatorMappings の collectionGroup QUERY 回数（work あたり1） */
	existingMappingQueries: number;
	/** 上記 QUERY が返した relation ドキュメント総数 */
	existingMappingDocsRead: number;
	/** creator doc の存在チェック get() 回数（type=LOOKUP） */
	creatorExistenceLookups: number;
	/** recomputeCreatorStats の呼び出し回数 */
	recomputeCalls: number;
	/** recompute の全スキャンが読んだ works サブコレクション ドキュメント総数 */
	recomputeDocsRead: number;
	/** relation doc への書き込み回数（実変更の代理値） */
	relationWrites: number;
	/** relation doc の削除回数 */
	relationDeletes: number;
}

function createEmptySnapshot(): DlsiteReadMetricsSnapshot {
	return {
		worksMapQueries: 0,
		worksMapDocsRead: 0,
		existingMappingQueries: 0,
		existingMappingDocsRead: 0,
		creatorExistenceLookups: 0,
		recomputeCalls: 0,
		recomputeDocsRead: 0,
		relationWrites: 0,
		relationDeletes: 0,
	};
}

let metrics: DlsiteReadMetricsSnapshot = createEmptySnapshot();

/** run 開始時に呼び、前 run の値をクリアする。 */
export function resetDlsiteReadMetrics(): void {
	metrics = createEmptySnapshot();
}

/** getExistingWorksMap の `where in` クエリ回数と、返った docs 数を記録する。 */
export function recordWorksMapRead(queries: number, docsRead: number): void {
	metrics.worksMapQueries += queries;
	metrics.worksMapDocsRead += docsRead;
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
export function getDlsiteReadMetrics(): DlsiteReadMetricsSnapshot {
	return { ...metrics };
}
