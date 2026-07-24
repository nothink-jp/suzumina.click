/**
 * YouTube 動画取得: run metadata と排他ロックのライフサイクル
 *
 * メタデータ doc（youtubeMetadata/fetch_metadata）の取得/更新と、
 * isInProgress ロック（prepareExecution）・キャッシュ済み uploads playlist ID の
 * 読み取り専用アクセスを担う。
 */

import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { createRunMetadataStore } from "../../shared/run-metadata";

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const METADATA_COLLECTION = "youtubeMetadata";

// 実行制限関連の定数
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // ロックのタイムアウト（30分）

// メタデータの型定義
export interface FetchMetadata {
	lastFetchedAt: Timestamp;
	isInProgress: boolean;
	lastError?: string;
	/**
	 * 直近で「打ち切りなく完了した」run の時刻。
	 * その run のincremental走査が`MAX_DISCOVERY_PAGES`上限に達さず終えられたこと
	 * （＝early-stopで正常終了、または上限に達さず全件終了）を意味するに留まる。
	 * 定常運用では早期にearly-stopするため、「全カタログを検証済み」という意味では
	 * 読めない（そこまでの保証が要る場合は週次フルスイープの`truncated`判定を見る）。
	 */
	lastSuccessfulCompleteFetch?: Timestamp;
	/** SPR-230: uploads playlist ID（チャンネル固定のため一度取得したらキャッシュする） */
	uploadsPlaylistId?: string;
}

/**
 * 処理結果の型定義
 *
 * run（run-video-fetch.ts）の戻り値であると同時に、排他ロック（prepareExecution）が
 * スキップ結果を返すためここに置く（依存方向を run-video-fetch → fetch-metadata の
 * 一方向に保つ）。
 *
 * @interface FetchResult
 * @property {number} videoCount - 取得した動画数
 * @property {string} [error] - エラーメッセージ（エラー発生時のみ）
 */
export interface FetchResult {
	videoCount: number;
	error?: string;
}

/**
 * メタデータのストア（SPR-231: 骨格は shared/run-metadata に集約）
 *
 * update 時は undefined 値を null に変換し、lastFetchedAt を常時注入する（現行挙動の温存）。
 * dlsite 側（undefined → FieldValue.delete()）との非対称は意図的に統一しない
 * （Firestore に残る値が変わる＝挙動変更のため。shared/run-metadata.ts 参照）。
 */
const fetchMetadataStore = createRunMetadataStore<FetchMetadata>({
	collection: METADATA_COLLECTION,
	docId: METADATA_DOC_ID,
	createInitial: () => ({
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
	}),
	sanitizeUpdate: (updates) => {
		// undefined値を持つプロパティをnullに変換する（テストに合わせるため）
		const sanitizedUpdates: Record<string, Timestamp | boolean | string | null> = {
			lastFetchedAt: Timestamp.now(), // 常に最終実行時間を更新
		};

		// updatesの各プロパティをチェックし、undefined値をnullに変換
		// lastFetchedAtは常に上記で設定した値を使用するため、処理から除外する
		for (const [key, value] of Object.entries(updates)) {
			if (key !== "lastFetchedAt") {
				// lastFetchedAtは上書きしない
				// undefinedの場合はnullを設定（テスト互換性のため）
				sanitizedUpdates[key] = value === undefined ? null : value;
			}
		}
		return sanitizedUpdates;
	},
});

/**
 * メタデータの取得または初期化
 *
 * @returns Promise<FetchMetadata> - 取得または初期化されたメタデータ
 */
export async function getOrCreateMetadata(): Promise<FetchMetadata> {
	return fetchMetadataStore.getOrCreate();
}

/**
 * メタデータの更新
 *
 * @param updates - 更新するメタデータのフィールド
 * @returns Promise<void>
 */
export async function updateMetadata(updates: Partial<FetchMetadata>): Promise<void> {
	await fetchMetadataStore.update(updates);
}

/**
 * 処理開始前のメタデータチェックと初期化
 *
 * @returns Promise<[FetchMetadata | undefined, FetchResult | undefined]> - メタデータと結果オブジェクトのタプル
 */
export async function prepareExecution(): Promise<
	[FetchMetadata | undefined, FetchResult | undefined]
> {
	// 前回の実行状態を取得
	let metadata: FetchMetadata;
	try {
		metadata = await getOrCreateMetadata();

		// 既に実行中の場合のチェック（二重実行防止）
		if (metadata.isInProgress) {
			// ロックのタイムアウトチェック
			const lastFetchedTime = metadata.lastFetchedAt.toMillis();
			const currentTime = Date.now();
			const elapsedMs = currentTime - lastFetchedTime;

			if (elapsedMs < LOCK_TIMEOUT_MS) {
				// タイムアウト前：まだ処理中と判断
				logger.warn("前回の実行が完了していません。処理をスキップします。");
				return [undefined, { videoCount: 0, error: "前回の処理が完了していません" }];
			}

			// タイムアウト経過：ロックが古いためリセットして続行
			logger.warn(
				`前回の実行ロックがタイムアウトしました（${Math.round(elapsedMs / 60000)}分経過）。ロックをリセットして処理を開始します。`,
			);
		}

		// 処理開始を記録
		await updateMetadata({ isInProgress: true });
		return [metadata, undefined];
	} catch (error) {
		logger.error("メタデータの取得に失敗しました:", error);
		return [undefined, { videoCount: 0, error: "メタデータの取得に失敗しました" }];
	}
}

/**
 * FetchMetadataドキュメントに既にキャッシュされているuploads playlist IDを読むだけの
 * 純粋な読み取り（`getOrCreateMetadata`と異なり、ドキュメントが存在しない場合でも
 * 新規作成しない）。`tryFastDiscovery`が「共有メタデータを一切更新しない」という
 * 前提を保つために、ここでは書き込みを一切行わない。
 */
export async function getCachedUploadsPlaylistId(): Promise<string | undefined> {
	const doc = await firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID).get();
	if (!doc.exists) {
		return undefined;
	}
	return (doc.data() as FetchMetadata).uploadsPlaylistId;
}
