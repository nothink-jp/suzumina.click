/**
 * 定期実行関数の run metadata ストア（SPR-231 段階①）
 *
 * dlsite / youtube の定期実行関数が持つ「メタデータ doc の get-or-create + update」の
 * 骨格は完全同一だったため、ここに集約する。作成は create()（原子的・存在時は
 * ALREADY_EXISTS）で行い、get→書き込み間の TOCTOU 競合は敗者側の再取得で解決する。
 *
 * 一方で update 時のサニタイズ戦略は endpoint ごとに非対称で、これは統一しない:
 * - dlsite: undefined を FieldValue.delete() に変換（フィールドを実際に削除）
 * - youtube: undefined を null に変換し、lastFetchedAt を常時注入（フィールドは残る）
 * この差は Firestore に残る値の差＝挙動そのものであるため、統一は挙動変更（SPR-231 の対象外）。
 * サニタイズは `sanitizeUpdate` として呼び出し側から注入し、各 endpoint の現行挙動を温存する。
 *
 * あわせて、Pub/Sub の重複配信・再送で run を走らせ直さないための判定（`claimRunEventFailOpen`・
 * SPR-368 / SPR-369）も持つ。dlsite / youtube / 整合性 cron の 3 関数が共有する。
 */

import firestore from "../infrastructure/database/firestore";
import * as logger from "./logger";

/** gRPC ステータスコード: ドキュメントが既に存在する（並行 create の敗者側が受け取る） */
const GRPC_ALREADY_EXISTS = 6;

function isAlreadyExistsError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		(error as { code?: unknown }).code === GRPC_ALREADY_EXISTS
	);
}

export interface RunMetadataStore<T extends object> {
	/** メタデータ doc を取得し、存在しなければ初期値で作成して返す */
	getOrCreate(): Promise<T>;
	/** sanitizeUpdate を通した部分更新を適用する */
	update(updates: Partial<T>): Promise<void>;
}

/**
 * メタデータ doc への get-or-create / update を提供するストアを作る
 *
 * doc 参照は呼び出しの都度組み立てる（モジュール読み込み時に固定しない）。
 * テストが firestore モックを beforeEach でリセットする前提と、現行実装の
 * 呼び出しパターン（各関数内で collection().doc() を構築）を両方保つため。
 */
export function createRunMetadataStore<T extends object>(options: {
	/** メタデータ doc のコレクション名（例: "dlsiteMetadata"） */
	collection: string;
	/** メタデータ doc の ID */
	docId: string;
	/** doc 不在時にのみ評価される初期値の生成（Timestamp.now() を含むため遅延評価） */
	createInitial: () => T;
	/** update 前の変換。endpoint ごとの undefined の扱い（delete vs null）をここで温存する */
	sanitizeUpdate: (updates: Partial<T>) => Record<string, unknown>;
}): RunMetadataStore<T> {
	const metadataRef = () => firestore.collection(options.collection).doc(options.docId);

	return {
		async getOrCreate(): Promise<T> {
			const doc = await metadataRef().get();
			if (doc.exists) {
				return doc.data() as T;
			}
			const initial = options.createInitial();
			try {
				// set() でなく create()（doc 存在時に ALREADY_EXISTS で失敗する原子的作成）を使い、
				// get→set 間の TOCTOU（並行呼び出しの両者が「不在」を観測して二重作成する競合）を防ぐ
				await metadataRef().create(initial);
				return initial;
			} catch (error) {
				if (isAlreadyExistsError(error)) {
					// 並行呼び出しが先に作成した（本呼び出しは競合の敗者）→ 勝者の doc を正として再取得
					const winner = await metadataRef().get();
					if (winner.exists) {
						return winner.data() as T;
					}
				}
				throw error;
			}
		},
		async update(updates: Partial<T>): Promise<void> {
			await metadataRef().update(options.sanitizeUpdate(updates));
		},
	};
}

/**
 * SPR-368 / SPR-369: 重複配信の判定に使うメタデータ doc と保持件数
 */
export interface RunEventClaimOptions {
	/** メタデータ doc のコレクション名 */
	collection: string;
	/** メタデータ doc の ID（`recentEventIds` を持つ） */
	docId: string;
	/**
	 * 保持する event.id の件数（新しい順）。「重複・再送が届きうる遅れ」の間に届く
	 * publish の数より大きくする（小さいと、古い id の重複を取りこぼす）
	 */
	limit: number;
	/** doc が無いときの初期値（省略時は `recentEventIds` だけを持つ doc を作る） */
	createInitial?: () => object;
}

/**
 * CloudEvent の id（= Pub/Sub messageId）で run を始めてよいかを判定し、よければ id を記録する
 *
 * Eventarc（Pub/Sub push）は at-least-once で、同じメッセージが元の run の処理中にも再 push される。
 * さらに購読の retryPolicy（10〜600 秒・保持 24 時間）により、タイムアウト・5xx の push も再送される
 * （関数の `RETRY_POLICY_DO_NOT_RETRY` は Cloud Functions 宛てトリガーの購読には効いていない・SPR-369）。
 * 記録を run の終了時でなく開始時に行うのは、元の run の処理中に届いた重複も、落ちた run の再送も弾くため。
 * 落ちた run のやり直しは次の定期 run が担う。
 *
 * 判定と記録は 1 トランザクションで行う（max-instances を一時的に超えた並行実行でも二重に通さない）。
 * 書き込むのは `recentEventIds` だけ（`sanitizeUpdate` を通さない＝lastFetchedAt 等は変えない）。
 * 副作用: doc が無ければ `createInitial` の値で作成する。
 *
 * @returns 初めて見る id なら true（記録済み）。記録済みの id（重複配信）なら false。
 *   id が空なら判定できないので記録せずに true（空文字を記録すると以後の空 id を全部弾くため）
 * @throws Firestore のエラーはそのまま投げる（ハンドラは `claimRunEventFailOpen` を使う）
 */
export async function claimRunEvent(
	eventId: string,
	options: RunEventClaimOptions,
): Promise<boolean> {
	if (!eventId) {
		return true;
	}

	const metadataRef = firestore.collection(options.collection).doc(options.docId);
	return firestore.runTransaction(async (transaction) => {
		const snapshot = await transaction.get(metadataRef);
		const stored = snapshot.exists ? snapshot.data()?.recentEventIds : undefined;
		const recentEventIds: string[] = Array.isArray(stored) ? stored : [];
		if (recentEventIds.includes(eventId)) {
			return false;
		}

		const nextRecentEventIds = [eventId, ...recentEventIds].slice(0, options.limit);
		if (snapshot.exists) {
			transaction.update(metadataRef, { recentEventIds: nextRecentEventIds });
		} else {
			transaction.set(metadataRef, {
				...options.createInitial?.(),
				recentEventIds: nextRecentEventIds,
			});
		}
		return true;
	});
}

/**
 * `claimRunEvent` の fail-open 版（ハンドラはこちらを使う）。判定そのものが失敗したら、判定せずに true
 *
 * 判定の失敗で run を止めると、変更前なら走っていた run が消える（DLsite の週次フルスイープなら
 * pendingFullSweep を立てる前なので、その週の分がまるごと）。throw（nack）にしないのは、
 * 5xx はプラットフォームの強制終了を拾う監視（dlsite_function_failure 等・SPR-234）の役割を崩さないため。
 * 失敗した配信に限っては id を記録しないので、その後の重複は弾けない（変更前と同じ挙動）。
 */
export async function claimRunEventFailOpen(
	eventId: string,
	options: RunEventClaimOptions,
): Promise<boolean> {
	try {
		return await claimRunEvent(eventId, options);
	} catch (error) {
		logger.warn("重複配信の判定に失敗したため、判定せずに run を実行", {
			eventId,
			docId: options.docId,
			error,
		});
		return true;
	}
}
