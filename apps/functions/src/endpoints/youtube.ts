import type { CloudEvent } from "@google-cloud/functions-framework";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { getJSTDate } from "../services/price-history";
import { RECENT_WINDOW_DAYS } from "../services/youtube/video-tiering";
import {
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchUploadsPlaylistId,
	fetchUploadsPlaylistPage,
	fetchVideoDetails,
	initializeYouTubeClient,
} from "../services/youtube/youtube-api";
import {
	getAllVideoIds,
	getKnownVideoIdsSet,
	getOldTierDueVideoIds,
	getPlaylistMappingCache,
	getRecentTierVideoIds,
	getStaleLiveVideoIds,
	savePlaylistMappingCache,
	saveVideosToFirestore,
} from "../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../shared/common";
import * as logger from "../shared/logger";
import { decodePubsubMode, type MessagePublishedData } from "../shared/pubsub-utils";
import { createRunMetadataStore } from "../shared/run-metadata";

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const METADATA_COLLECTION = "youtubeMetadata";

// 実行制限関連の定数
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // ロックのタイムアウト（30分）

// SPR-230: uploads playlistベースdiscoveryのページ数上限（1 unit/ページと安価なため緩め。
// 初回バックフィル(~550件≈11ページ)を1runで完了できる余裕を持たせる）
const MAX_DISCOVERY_PAGES = 20;

// メタデータの型定義
interface FetchMetadata {
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
 * SPR-261/262: playlist→videoマッピングのFirestoreキャッシュ利用フラグ。
 * dlsiteの`isTierFilteringEnabled`と同型（緊急時はfalseにして再デプロイするだけで
 * 旧挙動＝毎run全playlist再取得に戻せる。Firestoreスキーマ変更を伴わないためロールバックの障害はない）。
 */
function isPlaylistCacheEnabled(): boolean {
	return process.env.YOUTUBE_PLAYLIST_CACHE_ENABLED !== "false";
}

/**
 * SPR-261/262: 動画統計（videos.list）のティア差分再取得フラグ。
 * falseにすると新着discovery・stale live救済のみ（旧挙動）に戻る。
 */
function isStatsTierRefreshEnabled(): boolean {
	return process.env.YOUTUBE_STATS_TIER_REFRESH_ENABLED !== "false";
}

/**
 * 処理結果の型定義
 *
 * @interface FetchResult
 * @property {number} videoCount - 取得した動画数
 * @property {string} [error] - エラーメッセージ（エラー発生時のみ）
 */
interface FetchResult {
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
async function getOrCreateMetadata(): Promise<FetchMetadata> {
	return fetchMetadataStore.getOrCreate();
}

/**
 * メタデータの更新
 *
 * @param updates - 更新するメタデータのフィールド
 * @returns Promise<void>
 */
async function updateMetadata(updates: Partial<FetchMetadata>): Promise<void> {
	await fetchMetadataStore.update(updates);
}

// 注：initializeYouTubeClientはutils/youtube-apiから利用

/**
 * 処理開始前のメタデータチェックと初期化
 *
 * @returns Promise<[FetchMetadata | undefined, FetchResult | undefined]> - メタデータと結果オブジェクトのタプル
 */
async function prepareExecution(): Promise<[FetchMetadata | undefined, FetchResult | undefined]> {
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
 * uploads playlist IDを解決する（メタデータにキャッシュ済みならそれを使い、無ければ取得して保存）
 *
 * SPR-230: 対象は`SUZUKA_MINASE_CHANNEL_ID`固定チャンネルで、uploads playlist IDは
 * 実質不変のため、一度取得すればメタデータ経由で以後の呼び出しコストはゼロになる。
 */
async function resolveUploadsPlaylistId(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<string> {
	if (metadata.uploadsPlaylistId) {
		return metadata.uploadsPlaylistId;
	}

	const uploadsPlaylistId = await fetchUploadsPlaylistId(youtube, SUZUKA_MINASE_CHANNEL_ID);
	if (!uploadsPlaylistId) {
		throw new Error("uploads playlist IDの取得に失敗しました");
	}

	await updateMetadata({ uploadsPlaylistId });
	return uploadsPlaylistId;
}

/**
 * uploads playlistを新着順にページングし、Firestoreに未登録の（＝新着の）動画IDだけを返す
 *
 * SPR-230 Phase②: uploads playlistは新着順（reverse-chronological）なので、
 * ページ内に1件でも既知IDがあれば、それより後ろ（時系列的に古い動画）はすべて
 * 既知のはずと判断してそのページで打ち切る（early-stop）。Firestoreが空の場合
 * （初回バックフィル）は全ページが「既知IDなし」と判定され続けるため、
 * 特別分岐なしで自然に全件取得になる。
 *
 * @returns `videoIds`（新着の動画ID）と、`MAX_DISCOVERY_PAGES`到達により本来まだ
 *   後続ページが残っていた状態で打ち切られたかどうか（`truncated`）。レビュー指摘対応:
 *   early-stop（既知IDに当たって正常に打ち切り）とページ上限による強制打ち切りを
 *   区別しないと、チャンネル動画数が上限（20ページ=1,000件）を超えた際に
 *   超過分の旧動画が「発見完了」扱いのまま恒久的に見つからなくなる。
 */
async function fetchVideoIdsViaPlaylistIncremental(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<{ videoIds: string[]; truncated: boolean }> {
	const newVideoIds: string[] = [];
	let pageToken: string | undefined;
	let page = 0;

	do {
		const page_ = await fetchUploadsPlaylistPage(youtube, uploadsPlaylistId, pageToken);
		if (page_.videoIds.length === 0) {
			return { videoIds: newVideoIds, truncated: false };
		}

		const knownIds = await getKnownVideoIdsSet(page_.videoIds);
		const unknownInPage = page_.videoIds.filter((id) => !knownIds.has(id));
		newVideoIds.push(...unknownInPage);

		if (unknownInPage.length < page_.videoIds.length) {
			// このページ内に既知IDが混ざっていた＝新着はここまで（正常なearly-stop）
			return { videoIds: newVideoIds, truncated: false };
		}

		pageToken = page_.nextPageToken;
		page++;
	} while (pageToken && page < MAX_DISCOVERY_PAGES);

	// ループを抜けた時点でpageTokenが残っている＝ページ上限による強制打ち切り
	const truncated = Boolean(pageToken);
	if (truncated) {
		logger.warn(
			`uploads playlistのページ上限(${MAX_DISCOVERY_PAGES})に達したため打ち切りました。後続ページが未処理のまま残っています`,
			{ processedPages: page, newVideoIdsCount: newVideoIds.length },
		);
	}
	return { videoIds: newVideoIds, truncated };
}

/**
 * uploads playlistを（early-stopせず）全件ページングして動画IDを取得する
 *
 * SPR-230: shadowモードでの発見集合突合、および週次フルスイープの取りこぼし検知に使う。
 *
 * @returns `videoIds`と、`MAX_DISCOVERY_PAGES`到達により打ち切られたかどうか（`truncated`）。
 *   レビュー指摘対応: `fetchVideoIdsViaPlaylistIncremental`と同じ理由で、打ち切りを
 *   検知しないと、チャンネル動画数が上限を超えた際にこの関数を使う取りこぼし検知
 *   （shadow比較・週次フルスイープ）自体が「未走査分をすべて取りこぼし」と誤検知し続ける。
 */
async function fetchVideoIdsViaPlaylistFull(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<{ videoIds: string[]; truncated: boolean }> {
	const allVideoIds: string[] = [];
	let pageToken: string | undefined;
	let page = 0;

	do {
		const result = await fetchUploadsPlaylistPage(youtube, uploadsPlaylistId, pageToken);
		allVideoIds.push(...result.videoIds);
		pageToken = result.nextPageToken;
		page++;
	} while (pageToken && page < MAX_DISCOVERY_PAGES);

	const truncated = Boolean(pageToken);
	if (truncated) {
		logger.warn(
			`uploads playlist全件走査がページ上限(${MAX_DISCOVERY_PAGES})に達したため打ち切りました。取りこぼし検知の比較は不完全です`,
			{ processedPages: page, videoIdsCount: allVideoIds.length },
		);
	}
	return { videoIds: allVideoIds, truncated };
}

/**
 * uploads playlist全走査の発見集合とFirestoreの既知集合を比較し、対称差をログ出力する
 * （週次フルスイープの取りこぼし検知）。比較自体が失敗しても本処理には影響させない
 * （ログのみ・例外を投げない）。ログの「SPR-230 shadow:」接頭辞は Cloud Logging の
 * 検索キーとして定着しているため互換維持する（shadowモード自体は撤去済み）。
 *
 * ページ上限で全走査自体が打ち切られた場合（`truncated`）、未走査分は「Firestoreにあるが
 * playlist走査で見つからない」＝missing判定に必ず引っかかってしまい偽陽性になるため、
 * その回はmissing判定をスキップする（レビュー指摘対応）。
 */
async function logDiscoveryComparison(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<void> {
	try {
		const [{ videoIds: playlistVideoIds, truncated }, knownIds] = await Promise.all([
			fetchVideoIdsViaPlaylistFull(youtube, uploadsPlaylistId),
			getAllVideoIds(),
		]);
		const playlistIdSet = new Set(playlistVideoIds);
		const extraInPlaylist = playlistVideoIds.filter((id) => !knownIds.has(id));

		if (truncated) {
			logger.warn(
				"SPR-230 shadow: uploads playlist全走査がページ上限で打ち切られたため、今回はmissing判定をスキップします",
				{
					uploadsPlaylist走査件数: playlistVideoIds.length,
					Firestore既知件数: knownIds.size,
					uploadsPlaylistのみに存在する件数: extraInPlaylist.length,
				},
			);
			return;
		}

		const missingInPlaylist = [...knownIds].filter((id) => !playlistIdSet.has(id));

		if (missingInPlaylist.length === 0 && extraInPlaylist.length === 0) {
			logger.info("SPR-230 shadow: discovery方式の発見集合が一致しました", {
				uploadsPlaylist件数: playlistVideoIds.length,
				Firestore既知件数: knownIds.size,
			});
		} else {
			logger.warn("SPR-230 shadow: discovery方式の発見集合に差分があります", {
				uploadsPlaylistに無いFirestore既知件数: missingInPlaylist.length,
				uploadsPlaylistのみに存在する件数: extraInPlaylist.length,
				missingSample: missingInPlaylist.slice(0, 10),
				extraSample: extraInPlaylist.slice(0, 10),
			});
		}
	} catch (error) {
		logger.warn("SPR-230 shadow: discovery方式の比較に失敗しました（本処理には影響しません）", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * YouTube動画IDを取得する（uploads playlistベースのincremental discovery）
 *
 * SPR-230で search.list 経路から完全移行済み。旧経路（"search"/"shadow"モード切替）は
 * 本番検証完了を経て撤去した。
 */
async function fetchVideoIds(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<{
	videoIds: string[];
	isComplete: boolean;
}> {
	const uploadsPlaylistId = await resolveUploadsPlaylistId(youtube, metadata);
	const { videoIds, truncated } = await fetchVideoIdsViaPlaylistIncremental(
		youtube,
		uploadsPlaylistId,
	);
	// truncated=true（ページ上限による強制打ち切り）の場合はisComplete:falseとし、
	// lastSuccessfulCompleteFetchを誤って更新しないようにする（レビュー指摘対応）。
	return { videoIds, isComplete: !truncated };
}

// 注：動画詳細取得機能はutils/youtube-apiから利用
// 注：動画データ保存機能はutils/youtube-firestoreから利用

/**
 * プレイリスト→動画のマッピングを構築
 *
 * @param youtube - YouTube APIクライアント
 * @param channelId - チャンネルID
 * @returns プレイリスト名のマップ（動画ID → プレイリスト名の配列）
 */
async function buildPlaylistVideoMapping(
	youtube: youtube_v3.Youtube,
	channelId: string,
): Promise<Map<string, string[]>> {
	const videoPlaylistMap = new Map<string, string[]>();

	try {
		// プレイリスト一覧を取得
		const playlists = await fetchChannelPlaylists(youtube, channelId);
		logger.info(`${playlists.length}個のプレイリストを取得しました`);

		// 各プレイリストの動画を取得
		for (const playlist of playlists) {
			try {
				const videoIds = await fetchPlaylistItems(youtube, playlist.id);
				logger.debug(`プレイリスト「${playlist.title}」から${videoIds.length}件の動画を取得`);

				// 動画IDごとにプレイリスト名を記録
				for (const videoId of videoIds) {
					const current = videoPlaylistMap.get(videoId) || [];
					if (!current.includes(playlist.title)) {
						current.push(playlist.title);
					}
					videoPlaylistMap.set(videoId, current);
				}
			} catch (_error) {
				logger.warn(`プレイリスト「${playlist.title}」の動画取得に失敗`);
				// 個別のプレイリストエラーは継続
			}
		}

		logger.info(`${videoPlaylistMap.size}件の動画にプレイリストタグをマッピング`);
	} catch (error) {
		logger.error("プレイリスト情報の取得に失敗:", error);
		// プレイリスト取得に失敗しても処理は継続（空のマップを返す）
	}

	return videoPlaylistMap;
}

/**
 * playlist→videoマッピングを解決する（キャッシュ有効時は日次1回だけ再構築する）
 *
 * SPR-261/262: `buildPlaylistVideoMapping`（全playlist+playlistItemsの再走査）は
 * 定常runの大半のクォータ消費要因だったため、Firestoreに日次キャッシュして
 * 同日中の再run（毎時30分）ではAPI呼び出しを行わない。キャッシュ読み書き自体の
 * 失敗は本処理を壊さず、フォールバックとして毎回再構築する
 * （shadow比較・stale live救済と同じ「本処理を壊さない」方針を踏襲）。
 *
 * レビュー指摘対応: 日次キャッシュのままだと、キャッシュ構築後に新規発見された動画の
 * `playlistTags`が翌日の再構築まで空欄のまま残ってしまう。`discoveredVideoIds`
 * （このrunで新着として発見された動画）のうち1件でもキャッシュ未反映のものがあれば、
 * 当日中でも再構築する。新着discoveryが起きたrunでしか再構築は走らないため、
 * 定常run（新着0件）のクォータ削減効果は維持される。
 */
async function resolvePlaylistVideoMapping(
	youtube: youtube_v3.Youtube,
	channelId: string,
	discoveredVideoIds: string[],
): Promise<Map<string, string[]>> {
	if (!isPlaylistCacheEnabled()) {
		return buildPlaylistVideoMapping(youtube, channelId);
	}

	const todayJST = getJSTDate();

	try {
		const cache = await getPlaylistMappingCache();
		if (cache && cache.updatedAtJST === todayJST) {
			const hasUncoveredNewVideo = discoveredVideoIds.some((id) => !cache.mapping.has(id));
			if (!hasUncoveredNewVideo) {
				logger.debug("playlist→videoマッピングのキャッシュを再利用します", { todayJST });
				return cache.mapping;
			}
			logger.info(
				"新着動画がキャッシュに未反映のため、当日中でもplaylist→videoマッピングを再構築します",
				{ todayJST, discoveredVideoIds },
			);
		}
	} catch (error) {
		logger.warn("playlist→videoマッピングキャッシュの読み取りに失敗しました（再構築します）", {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	const mapping = await buildPlaylistVideoMapping(youtube, channelId);

	try {
		await savePlaylistMappingCache(mapping, todayJST);
	} catch (error) {
		logger.warn(
			"playlist→videoマッピングキャッシュの保存に失敗しました（今回の結果には影響しません）",
			{
				error: error instanceof Error ? error.message : String(error),
			},
		);
	}

	return mapping;
}

/**
 * SPR-261/262: 動画統計ティア差分（recent-tier・old-tier）の対象動画IDを取得する
 *
 * 新着discovery・stale live救済に加え、動画統計（再生数等）の恒久的な陳腐化を防ぐため、
 * recent-tier（毎run）・old-tier（日次ローテーション）の動画も対象に合流させる。
 * クエリ自体の失敗はこの回のティア差分をスキップするに留め、run全体は失敗させない
 * （stale live救済と同様の方針）。
 */
async function fetchStatsTierVideoIds(): Promise<{
	recentTierVideoIds: string[];
	oldTierDueVideoIds: string[];
}> {
	if (!isStatsTierRefreshEnabled()) {
		return { recentTierVideoIds: [], oldTierDueVideoIds: [] };
	}

	try {
		const today = new Date();
		const todayJST = getJSTDate();
		const [recentTierVideoIds, oldTierDueVideoIds] = await Promise.all([
			getRecentTierVideoIds(RECENT_WINDOW_DAYS, today),
			getOldTierDueVideoIds(RECENT_WINDOW_DAYS, today, todayJST),
		]);
		logger.info("動画統計ティア差分の対象を取得しました", {
			recent: recentTierVideoIds.length,
			oldDue: oldTierDueVideoIds.length,
		});
		return { recentTierVideoIds, oldTierDueVideoIds };
	} catch (error) {
		logger.warn("動画統計ティア差分の取得に失敗しました（今回はスキップします）", {
			error: error instanceof Error ? error.message : String(error),
		});
		return { recentTierVideoIds: [], oldTierDueVideoIds: [] };
	}
}

/**
 * 動画にプレイリストタグをマッピング
 *
 * @param videos - YouTube動画の配列
 * @param playlistMap - プレイリスト名のマップ
 * @returns プレイリストタグ付き動画の配列
 */
function mapPlaylistTagsToVideos(
	videos: youtube_v3.Schema$Video[],
	playlistMap: Map<string, string[]>,
): youtube_v3.Schema$Video[] {
	return videos.map((video) => {
		if (video.id) {
			const playlistTags = playlistMap.get(video.id) || [];
			// プレイリストタグを動画データに追加（カスタムプロパティとして）
			return {
				...video,
				_playlistTags: playlistTags,
			} as youtube_v3.Schema$Video & { _playlistTags: string[] };
		}
		return video;
	});
}

/**
 * SPR-230: 週次フルスイープ（early-stopなし全ページ走査＋Firestore既知IDとの突合）
 *
 * discovery方式（uploads playlist経由）の取りこぼし検知のみが目的で、通常の動画詳細取得・
 * 保存フローは実行しない（統計取得のティア化はPhase③のスコープ外）。コストは
 * uploads playlist全走査（現在の動画数~550件なら~11ページ=11 units、上限
 * `MAX_DISCOVERY_PAGES`=20ページ=20 unitsまで）程度と軽量。
 */
async function runWeeklyFullSweep(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<FetchResult> {
	try {
		logger.info(
			"週次フルスイープを開始します（discovery取りこぼし検知のみ、動画詳細取得は行いません）",
		);
		const uploadsPlaylistId = await resolveUploadsPlaylistId(youtube, metadata);
		await logDiscoveryComparison(youtube, uploadsPlaylistId);
		await updateMetadata({ isInProgress: false, lastError: undefined });
		logger.info("週次フルスイープが完了しました");
		return { videoCount: 0 };
	} catch (error: unknown) {
		logger.error("週次フルスイープでエラーが発生しました:", error);
		await updateMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : String(error),
		});
		return {
			videoCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * FetchMetadataドキュメントに既にキャッシュされているuploads playlist IDを読むだけの
 * 純粋な読み取り（`getOrCreateMetadata`と異なり、ドキュメントが存在しない場合でも
 * 新規作成しない）。`tryFastDiscovery`が「共有メタデータを一切更新しない」という
 * 前提を保つために、ここでは書き込みを一切行わない。
 */
async function getCachedUploadsPlaylistId(): Promise<string | undefined> {
	const doc = await firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID).get();
	if (!doc.exists) {
		return undefined;
	}
	return (doc.data() as FetchMetadata).uploadsPlaylistId;
}

/**
 * 新着動画の軽量発見（uploads playlistのincremental early-stop走査）を試みる。
 *
 * uploads playlist IDはFetchMetadataにキャッシュ済みの値を読むだけで、未キャッシュの場合は
 * 何も書き込まずスキップする（`runFastRecheck`が共有メタデータを一切更新しないという
 * 前提を保つため。初回キャッシュはhourly run側の責務のまま）。
 */
async function tryFastDiscovery(youtube: youtube_v3.Youtube): Promise<{ videoIds: string[] }> {
	try {
		const uploadsPlaylistId = await getCachedUploadsPlaylistId();
		if (!uploadsPlaylistId) {
			logger.debug(
				"fast_recheck: uploads playlist IDが未キャッシュのため今回は新着発見をスキップします（hourly runでキャッシュされます）",
			);
			return { videoIds: [] };
		}

		const { videoIds, truncated } = await fetchVideoIdsViaPlaylistIncremental(
			youtube,
			uploadsPlaylistId,
		);
		if (videoIds.length > 0) {
			logger.info(`fast_recheckで新着動画を発見しました: ${videoIds.length}件`, { videoIds });
		}
		if (truncated) {
			logger.warn(
				"fast_recheckでのuploads playlist走査がページ上限に達しました（続きは次回以降のrunで発見されます）",
			);
		}
		return { videoIds };
	} catch (error) {
		logger.warn("fast_recheckでの新着発見に失敗しました（今回は発見をスキップします）", {
			error: error instanceof Error ? error.message : String(error),
		});
		return { videoIds: [] };
	}
}

/**
 * 配信中/配信予定の高速反映専用フロー（15分毎スケジューラ向け）
 *
 * 目的は2つ:
 *   1. 配信中→配信済みの遷移をhourly runより速く反映する（一度配信済みになった動画は
 *      基本的に変化しないため、対象は`getStaleLiveVideoIds`が返すliveBroadcastContent
 *      in ["live","upcoming"]の動画のみ）
 *   2. 新着動画（配信予定として新規作成された動画）の発見自体もhourly run（最大1時間律速）
 *      より速く反映する（`tryFastDiscovery`、discoveryモードが"playlist"のときのみ）
 *
 * 統計ティア更新は行わない（hourly runの役割のまま）。
 *
 * 通常runの`FetchMetadata`（nextPageToken等のページネーション状態・isInProgressロック）は
 * 一切更新しない（uploads playlist IDの読み取りのみ行う）。理由は2つ:
 *   1. このフローはページネーション状態を持たず、共有ロックを取ると15分毎の頻度で
 *      hourly runとの間欠的なブロッキングが発生しうる
 *   2. 対象は通常0〜数件で処理は数秒以内に完了するため、hourly runとの単純な重複実行
 *      （同一動画への冪等なmerge書き込み）は実害がない
 */
async function runFastRecheck(youtube: youtube_v3.Youtube): Promise<FetchResult> {
	try {
		const { videoIds: discoveredVideoIds } = await tryFastDiscovery(youtube);
		const { videoIds: staleLiveVideoIds, truncated } = await getStaleLiveVideoIds();

		const videoIds = Array.from(new Set([...discoveredVideoIds, ...staleLiveVideoIds]));

		if (videoIds.length === 0) {
			logger.debug("fast_recheckの対象（新着・配信中/配信予定の再チェック）はありません");
			return { videoCount: 0 };
		}

		logger.info(`fast_recheck対象の合計: ${videoIds.length}件`, {
			discoveredCount: discoveredVideoIds.length,
			staleLiveCount: staleLiveVideoIds.length,
		});
		if (truncated) {
			logger.warn(
				"stale live/upcoming動画が上限件数に達しました。配信状態の固着が広範囲化している可能性があります",
				{ count: staleLiveVideoIds.length },
			);
		}

		// discoveredVideoIdsをそのまま渡す（新着分がキャッシュ未反映ならその場で
		// マッピングを再構築させる。通常runのresolvePlaylistVideoMapping呼び出しと同じ扱い）。
		// 当日キャッシュが未構築のまま本フローが最初に走った場合（例: hourly runより先に
		// このジョブが発火する深夜配信時間帯）はbuildPlaylistVideoMappingのフルスキャンが
		// 発生しうるが、これは既存のキャッシュ機構が持つ「1日1回はどちらかのジョブが
		// 再構築する」という前提どおりの挙動であり、本フロー追加による新規コストではない。
		const playlistVideoMap = await resolvePlaylistVideoMapping(
			youtube,
			SUZUKA_MINASE_CHANNEL_ID,
			discoveredVideoIds,
		);

		const videoDetails = await fetchVideoDetails(youtube, videoIds);
		const videosWithPlaylistTags = mapPlaylistTagsToVideos(videoDetails, playlistVideoMap);
		const savedCount = await saveVideosToFirestore(videosWithPlaylistTags);

		return { videoCount: savedCount };
	} catch (error: unknown) {
		logger.error("fast_recheckでエラーが発生しました:", error);
		return {
			videoCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * 通常の動画ID取得〜詳細取得〜Firestore保存フロー（旧`fetchYouTubeVideosLogic`本体・SPR-230で分離）
 */
async function runNormalFetchAndSave(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<FetchResult> {
	// 3. 動画IDの取得
	logger.info(`チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画情報取得を開始します`);
	const { videoIds: discoveredVideoIds, isComplete } = await fetchVideoIds(youtube, metadata);

	logger.info(`新着として発見した動画ID: ${discoveredVideoIds.length}件`);

	// SPR-230回帰対応: incremental discoveryは新着（未知）動画IDしか返さないため、
	// 一度保存された動画は配信終了後も再取得されずliveBroadcastContentが固着する
	// （services/youtube/youtube-firestore.tsのgetStaleLiveVideoIds参照）。
	// 新着0件でも救済対象は毎run拾う＝早期returnより前に合流させるのが要点。
	// クエリ自体の失敗はこの回のstale救済をスキップするに留め、run全体を失敗させない
	// （shadowモード比較と同様、本処理への影響を切り離す）。
	let staleLiveVideoIds: string[] = [];
	try {
		const result = await getStaleLiveVideoIds();
		staleLiveVideoIds = result.videoIds;
		if (staleLiveVideoIds.length > 0) {
			logger.info(
				`配信中/配信予定のまま更新が止まっている動画を再取得対象に追加: ${staleLiveVideoIds.length}件`,
				{ videoIds: staleLiveVideoIds },
			);
		}
		if (result.truncated) {
			logger.warn(
				"stale live/upcoming動画が上限件数に達しました。配信状態の固着が広範囲化している可能性があります",
				{ count: staleLiveVideoIds.length },
			);
		}
	} catch (error) {
		logger.warn("stale live/upcoming動画の取得に失敗しました（今回はstale救済をスキップします）", {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	const { recentTierVideoIds, oldTierDueVideoIds } = await fetchStatsTierVideoIds();

	const videoIds = Array.from(
		new Set([
			...discoveredVideoIds,
			...staleLiveVideoIds,
			...recentTierVideoIds,
			...oldTierDueVideoIds,
		]),
	);
	logger.info(`動画詳細取得対象の合計: ${videoIds.length}件`);

	if (videoIds.length === 0) {
		logger.info("チャンネルに動画が見つかりませんでした");
		await updateMetadata({ isInProgress: false });
		return { videoCount: 0 };
	}

	// 4. プレイリスト情報の取得
	logger.info("プレイリスト情報を取得中...");
	const playlistVideoMap = await resolvePlaylistVideoMapping(
		youtube,
		SUZUKA_MINASE_CHANNEL_ID,
		discoveredVideoIds,
	);

	// 5. 動画の詳細情報取得
	const videoDetails = await fetchVideoDetails(youtube, videoIds);

	// 6. プレイリストタグを動画にマッピング
	const videosWithPlaylistTags = mapPlaylistTagsToVideos(videoDetails, playlistVideoMap);

	// 7. Firestoreにデータ保存
	const savedCount = await saveVideosToFirestore(videosWithPlaylistTags);

	// 8. メタデータを更新
	if (isComplete) {
		await updateMetadata({
			lastSuccessfulCompleteFetch: Timestamp.now(),
		});
	}

	// 9. 処理完了を記録
	await updateMetadata({
		isInProgress: false,
		lastError: undefined,
	});

	return { videoCount: savedCount };
}

/**
 * fetchYouTubeVideosLogicの実行モード
 * - normal: 通常run（新着発見＋stale live救済＋統計ティア更新）
 * - weekly_full_sweep: SPR-230 discovery取りこぼし検知のみ
 * - fast_recheck: 配信中/配信予定の高速反映のみ（新着発見＋stale liveの再チェック、15分毎スケジューラ向け）
 */
type FetchMode = "normal" | "weekly_full_sweep" | "fast_recheck";

/**
 * fetchYouTubeVideosLogicの予期しない例外を処理する（ログ出力＋共有ロックの解除）
 *
 * fast_recheckは共有メタデータ（isInProgressロック）を持たないため触らない
 * （他モードの実行中ロックを誤って解除しないため）
 */
async function handleFetchYouTubeVideosError(
	mode: FetchMode,
	error: unknown,
): Promise<FetchResult> {
	logger.error("YouTube動画情報取得中にエラーが発生しました:", error);

	if (mode !== "fast_recheck") {
		try {
			await updateMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗しました:", updateError);
		}
	}

	return {
		videoCount: 0,
		error: error instanceof Error ? error.message : "不明なエラーが発生しました",
	};
}

/**
 * YouTube動画情報取得の共通処理
 *
 * @param mode 実行モード（既定は通常run）
 * @returns Promise<FetchResult> - 処理結果
 */
async function fetchYouTubeVideosLogic(mode: FetchMode = "normal"): Promise<FetchResult> {
	try {
		// 1. YouTube APIクライアントの初期化
		const [youtube, initError] = initializeYouTubeClient();
		if (initError) {
			return initError;
		}
		if (!youtube) {
			return {
				videoCount: 0,
				error: "YouTubeクライアントの初期化に失敗しました",
			};
		}

		// fast_recheckは通常runの二重実行ロック・ページネーション状態を共有しない
		// （runFastRecheckのJSDoc参照）
		if (mode === "fast_recheck") {
			return await runFastRecheck(youtube);
		}

		// 2. 実行前準備（メタデータ確認）
		const [metadata, prepError] = await prepareExecution();
		if (prepError) {
			return prepError;
		}
		if (!metadata) {
			return { videoCount: 0, error: "メタデータの準備に失敗しました" };
		}

		if (mode === "weekly_full_sweep") {
			return await runWeeklyFullSweep(youtube, metadata);
		}

		return await runNormalFetchAndSave(youtube, metadata);
	} catch (error: unknown) {
		return await handleFetchYouTubeVideosError(mode, error);
	}
}

/**
 * YouTubeから涼花みなせチャンネルの動画情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 *
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (
	event: CloudEvent<MessagePublishedData>,
): Promise<void> => {
	logger.info("fetchYouTubeVideos 関数を開始しました (GCFv2 CloudEvent Handler)");

	try {
		// CloudEvent（Pub/Sub）の場合
		logger.info("Pub/Subトリガーからの実行を検出しました");

		if (!event.data) {
			logger.error("CloudEventデータが不足しています", { event });
			return;
		}

		// SPR-230/SPR-263: ペイロードのmodeを確認し、実行モードを判定する
		const decodedMode = decodePubsubMode(event.data);
		const fetchMode: FetchMode =
			decodedMode === "weekly_full_sweep" || decodedMode === "fast_recheck"
				? decodedMode
				: "normal";
		if (fetchMode === "weekly_full_sweep") {
			logger.info("週次フルスイープトリガーを検出しました");
		} else if (fetchMode === "fast_recheck") {
			logger.info("配信中/配信予定の高速反映（fast_recheck）トリガーを検出しました");
		}

		// 共通のロジックを実行
		const result = await fetchYouTubeVideosLogic(fetchMode);

		if (result.error) {
			logger.warn(`YouTube動画取得処理でエラーが発生しました: ${result.error}`);
		} else {
			logger.info(
				`YouTube動画取得処理が正常に完了しました。取得した動画数: ${result.videoCount}件`,
			);
		}

		logger.info("fetchYouTubeVideos 関数の処理を完了しました");
		return;
	} catch (error: unknown) {
		// 例外処理
		logger.error("fetchYouTubeVideos 関数で例外が発生しました:", error);

		// エラー状態を記録
		try {
			await updateMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗しました:", updateError);
		}
	}
};
