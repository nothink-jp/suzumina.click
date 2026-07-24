/**
 * 定期実行関数の run metadata ストア（SPR-231 段階①）
 *
 * dlsite / youtube の定期実行関数が持つ「メタデータ doc の get-or-create + update」の
 * 骨格（get → exists ? data : set(initial)）は完全同一だったため、ここに集約する。
 *
 * 一方で update 時のサニタイズ戦略は endpoint ごとに非対称で、これは統一しない:
 * - dlsite: undefined を FieldValue.delete() に変換（フィールドを実際に削除）
 * - youtube: undefined を null に変換し、lastFetchedAt を常時注入（フィールドは残る）
 * この差は Firestore に残る値の差＝挙動そのものであるため、統一は挙動変更（SPR-231 の対象外）。
 * サニタイズは `sanitizeUpdate` として呼び出し側から注入し、各 endpoint の現行挙動を温存する。
 */

import firestore from "../infrastructure/database/firestore";

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
			await metadataRef().set(initial);
			return initial;
		},
		async update(updates: Partial<T>): Promise<void> {
			await metadataRef().update(options.sanitizeUpdate(updates));
		},
	};
}
