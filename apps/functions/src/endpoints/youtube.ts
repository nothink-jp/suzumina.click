import type { CloudEvent } from "@google-cloud/functions-framework";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import {
	extractVideoIds,
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchUploadsPlaylistId,
	fetchUploadsPlaylistPage,
	fetchVideoDetails,
	initializeYouTubeClient,
	searchVideos,
} from "../services/youtube/youtube-api";
import {
	getAllVideoIds,
	getKnownVideoIdsSet,
	saveVideosToFirestore,
} from "../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../shared/common";
import * as logger from "../shared/logger";

// メタデータ保存用のドキュメントID
const METADATA_DOC_ID = "fetch_metadata";

// Firestore関連の定数
const METADATA_COLLECTION = "youtubeMetadata";

// 実行制限関連の定数
const MAX_PAGES_PER_EXECUTION = 3; // 1回の実行での最大ページ数（search.listベース経路用）
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // ロックのタイムアウト（30分）

// SPR-230: uploads playlistベースdiscoveryのページ数上限（1 unit/ページと安価なため緩め。
// 初回バックフィル(~550件≈11ページ)を1runで完了できる余裕を持たせる）
const MAX_DISCOVERY_PAGES = 20;

// メタデータの型定義
interface FetchMetadata {
	lastFetchedAt: Timestamp;
	nextPageToken?: string;
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: Timestamp;
	/** SPR-230: uploads playlist ID（チャンネル固定のため一度取得したらキャッシュする） */
	uploadsPlaylistId?: string;
}

/**
 * SPR-230: discovery方式の切り替えフラグ。呼び出し時に都度`process.env`を読む
 * （DLsiteの`isTierFilteringEnabled()`パターン踏襲・テストで環境変数を切り替えられるように）。
 *
 * - "search"（既定）: 現行のsearch.listベース（変更なし）
 * - "shadow": search.list経路は維持しつつ、uploads playlist全走査との差分をログ出力のみ行う
 * - "playlist": uploads playlistベースのincremental discoveryに完全移行
 */
function getDiscoveryMode(): "search" | "shadow" | "playlist" {
	const raw = process.env.YOUTUBE_DISCOVERY_MODE;
	return raw === "shadow" || raw === "playlist" ? raw : "search";
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
 * Pub/SubメッセージのPubsubMessage型定義
 */
interface PubsubMessage {
	data?: string;
	attributes?: Record<string, string>;
}

/**
 * SPR-230: Pub/Subペイロードから`mode`を取り出す（DLsite側`decodePubsubMode`と同型）。
 * 週次フルスイープ（`mode==="weekly_full_sweep"`）かどうかの判定に使う。
 * デコード失敗時は安全側（通常run）にフォールバックする。
 */
function decodePubsubMode(message: PubsubMessage | undefined): string | undefined {
	if (!message?.data) {
		return undefined;
	}
	try {
		const decoded = Buffer.from(message.data, "base64").toString("utf-8");
		const parsed = JSON.parse(decoded) as { mode?: unknown };
		return typeof parsed.mode === "string" ? parsed.mode : undefined;
	} catch (err) {
		logger.warn("Pub/Subペイロードのデコードに失敗（modeなしとして通常runを続行します）", {
			error: err instanceof Error ? err.message : String(err),
		});
		return undefined;
	}
}

/**
 * メタデータの取得または初期化
 *
 * @returns Promise<FetchMetadata> - 取得または初期化されたメタデータ
 */
async function getOrCreateMetadata(): Promise<FetchMetadata> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);
	const doc = await metadataRef.get();

	if (doc.exists) {
		return doc.data() as FetchMetadata;
	}
	// 初期メタデータの作成
	const initialMetadata: FetchMetadata = {
		lastFetchedAt: Timestamp.now(),
		isInProgress: false,
	};
	await metadataRef.set(initialMetadata);
	return initialMetadata;
}

/**
 * メタデータの更新
 *
 * @param updates - 更新するメタデータのフィールド
 * @returns Promise<void>
 */
async function updateMetadata(updates: Partial<FetchMetadata>): Promise<void> {
	const metadataRef = firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID);

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

	// 有効な更新データをFirestoreに送信
	await metadataRef.update(sanitizedUpdates);
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
 * YouTube動画IDをsearch.list経由で検索して取得（現行方式・SPR-230移行前の既存ロジック）
 *
 * @param youtube - YouTube APIクライアント
 * @param metadata - 取得済みのメタデータ
 * @returns Promise<{videoIds: string[], nextPageToken: string | undefined, isComplete: boolean}> - 取得した動画IDと関連情報
 */
async function fetchVideoIdsViaSearch(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<{
	videoIds: string[];
	nextPageToken: string | undefined;
	isComplete: boolean;
}> {
	// 初期化
	const allVideoIds: string[] = [];
	let nextPageToken: string | undefined = metadata.nextPageToken;
	const isInitialFetch = !nextPageToken;
	let pageCount = 0;
	let isComplete = false;

	if (nextPageToken) {
		logger.info(`前回の続きから取得を再開します。トークン: ${nextPageToken}`);
	} else {
		logger.debug("新規に全動画の取得を開始します");
	}

	// ページネーションを使用して動画IDを取得（制限付き）
	do {
		try {
			// youtube-api の検索機能を使用
			const searchResult = await searchVideos(youtube, nextPageToken);
			const videoIds = extractVideoIds(searchResult.items);

			allVideoIds.push(...videoIds);
			nextPageToken = searchResult.nextPageToken;

			logger.debug(
				`${videoIds.length}件の動画IDを取得しました。次ページトークン: ${nextPageToken || "なし"}`,
			);

			// メタデータ更新
			await updateMetadata({ nextPageToken });

			// ページカウントを増やす
			pageCount++;

			// 1回の実行で処理するページ数を制限
			if (pageCount >= MAX_PAGES_PER_EXECUTION && nextPageToken) {
				logger.info(
					`最大ページ数(${MAX_PAGES_PER_EXECUTION})に達しました。次回の実行で続きを処理します。`,
				);
				break;
			}
		} catch (error: unknown) {
			// YouTube APIエラー時の処理
			if (error instanceof Error && error.message.includes("YouTube APIクォータを超過")) {
				// クォータ超過の場合
				logger.error("YouTube API クォータを超過しました。処理を中断します:", error);
				await updateMetadata({
					isInProgress: false,
					lastError: "YouTube API quota exceeded",
				});
				throw error; // 元のエラーをそのまま再スロー
			}
			// その他のエラー
			throw error;
		}
	} while (nextPageToken);

	// 全ページ取得完了（nextPageTokenがない）
	if (!nextPageToken && !isInitialFetch) {
		logger.info("全ての動画IDの取得が完了しました");
		isComplete = true;
	}

	return { videoIds: allVideoIds, nextPageToken, isComplete };
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
 */
async function fetchVideoIdsViaPlaylistIncremental(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<string[]> {
	const newVideoIds: string[] = [];
	let pageToken: string | undefined;
	let page = 0;

	do {
		const page_ = await fetchUploadsPlaylistPage(youtube, uploadsPlaylistId, pageToken);
		if (page_.videoIds.length === 0) {
			break;
		}

		const knownIds = await getKnownVideoIdsSet(page_.videoIds);
		const unknownInPage = page_.videoIds.filter((id) => !knownIds.has(id));
		newVideoIds.push(...unknownInPage);

		if (unknownInPage.length < page_.videoIds.length) {
			// このページ内に既知IDが混ざっていた＝新着はここまで
			break;
		}

		pageToken = page_.nextPageToken;
		page++;
	} while (pageToken && page < MAX_DISCOVERY_PAGES);

	return newVideoIds;
}

/**
 * uploads playlistを（early-stopせず）全件ページングして動画IDを取得する
 *
 * SPR-230: shadowモードでの発見集合突合、および週次フルスイープの取りこぼし検知に使う。
 */
async function fetchVideoIdsViaPlaylistFull(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<string[]> {
	const allVideoIds: string[] = [];
	let pageToken: string | undefined;
	let page = 0;

	do {
		const result = await fetchUploadsPlaylistPage(youtube, uploadsPlaylistId, pageToken);
		allVideoIds.push(...result.videoIds);
		pageToken = result.nextPageToken;
		page++;
	} while (pageToken && page < MAX_DISCOVERY_PAGES);

	return allVideoIds;
}

/**
 * SPR-230 shadowモード: uploads playlist全走査の発見集合とFirestoreの既知集合を比較し、
 * 対称差をログ出力する。比較自体が失敗しても本処理には影響させない（ログのみ・例外を投げない）。
 */
async function logDiscoveryShadowComparison(
	youtube: youtube_v3.Youtube,
	uploadsPlaylistId: string,
): Promise<void> {
	try {
		const [playlistVideoIds, knownIds] = await Promise.all([
			fetchVideoIdsViaPlaylistFull(youtube, uploadsPlaylistId),
			getAllVideoIds(),
		]);
		const playlistIdSet = new Set(playlistVideoIds);
		const missingInPlaylist = [...knownIds].filter((id) => !playlistIdSet.has(id));
		const extraInPlaylist = playlistVideoIds.filter((id) => !knownIds.has(id));

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
 * YouTube動画IDを取得する（discoveryモードに応じて経路を切り替える）
 *
 * - "search"/"shadow": 既存のsearch.listベース経路（挙動を変えない）。"shadow"のみ
 *   後続で`logDiscoveryShadowComparison`による比較ログを追加で行う。
 * - "playlist": uploads playlistベースのincremental discoveryに完全移行
 */
async function fetchVideoIds(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<{
	videoIds: string[];
	nextPageToken: string | undefined;
	isComplete: boolean;
}> {
	const mode = getDiscoveryMode();

	if (mode === "playlist") {
		const uploadsPlaylistId = await resolveUploadsPlaylistId(youtube, metadata);
		const videoIds = await fetchVideoIdsViaPlaylistIncremental(youtube, uploadsPlaylistId);
		return { videoIds, nextPageToken: undefined, isComplete: true };
	}

	return fetchVideoIdsViaSearch(youtube, metadata);
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
 * uploads playlist全走査（~11ページ=11 units）程度と軽量。
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
		await logDiscoveryShadowComparison(youtube, uploadsPlaylistId);
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
 * 通常の動画ID取得〜詳細取得〜Firestore保存フロー（旧`fetchYouTubeVideosLogic`本体・SPR-230で分離）
 */
async function runNormalFetchAndSave(
	youtube: youtube_v3.Youtube,
	metadata: FetchMetadata,
): Promise<FetchResult> {
	// 3. 動画IDの取得
	logger.info(`チャンネル ${SUZUKA_MINASE_CHANNEL_ID} の動画情報取得を開始します`);
	const { videoIds, nextPageToken, isComplete } = await fetchVideoIds(youtube, metadata);

	// SPR-230: shadowモードは発見結果に関わらず毎run比較する（0件run＝定常状態こそ
	// 両方式が一致すべき基準ケースのため、videoIds空チェックの前に実行する）。
	// search.list経路の挙動・保存結果には影響させない、比較専用。
	if (getDiscoveryMode() === "shadow") {
		try {
			const uploadsPlaylistId = await resolveUploadsPlaylistId(youtube, metadata);
			await logDiscoveryShadowComparison(youtube, uploadsPlaylistId);
		} catch (error) {
			logger.warn(
				"SPR-230 shadow: uploads playlist ID解決に失敗しました（本処理には影響しません）",
				{ error: error instanceof Error ? error.message : String(error) },
			);
		}
	}

	logger.info(`取得した動画ID合計: ${videoIds.length}件`);
	if (videoIds.length === 0) {
		logger.info("チャンネルに動画が見つかりませんでした");
		await updateMetadata({ isInProgress: false });
		return { videoCount: 0 };
	}

	// 4. プレイリスト情報の取得
	logger.info("プレイリスト情報を取得中...");
	const playlistVideoMap = await buildPlaylistVideoMapping(youtube, SUZUKA_MINASE_CHANNEL_ID);

	// 5. 動画の詳細情報取得
	const videoDetails = await fetchVideoDetails(youtube, videoIds);

	// 6. プレイリストタグを動画にマッピング
	const videosWithPlaylistTags = mapPlaylistTagsToVideos(videoDetails, playlistVideoMap);

	// 7. Firestoreにデータ保存
	const savedCount = await saveVideosToFirestore(videosWithPlaylistTags);

	// 8. メタデータを更新
	if (isComplete) {
		await updateMetadata({
			nextPageToken: undefined,
			lastSuccessfulCompleteFetch: Timestamp.now(),
		});
	} else if (nextPageToken) {
		// 明示的にnextPageTokenを使用（既にfetchVideoIds内で保存されているが、変数使用のため記述）
		logger.debug(`次回の実行のためにページトークンを保存: ${nextPageToken}`);
	}

	// 9. 処理完了を記録
	await updateMetadata({
		isInProgress: false,
		lastError: undefined,
	});

	return { videoCount: savedCount };
}

/**
 * YouTube動画情報取得の共通処理
 *
 * @param isWeeklyFullSweep SPR-230: 週次フルスイープ実行時true（discovery取りこぼし検知のみ行う）
 * @returns Promise<FetchResult> - 処理結果
 */
async function fetchYouTubeVideosLogic(isWeeklyFullSweep = false): Promise<FetchResult> {
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

		// 2. 実行前準備（メタデータ確認）
		const [metadata, prepError] = await prepareExecution();
		if (prepError) {
			return prepError;
		}
		if (!metadata) {
			return { videoCount: 0, error: "メタデータの準備に失敗しました" };
		}

		if (isWeeklyFullSweep) {
			return await runWeeklyFullSweep(youtube, metadata);
		}

		return await runNormalFetchAndSave(youtube, metadata);
	} catch (error: unknown) {
		// エラー発生時はログ出力して処理終了
		logger.error("YouTube動画情報取得中にエラーが発生しました:", error);

		// 可能な場合はメタデータ更新
		try {
			await updateMetadata({
				isInProgress: false,
				lastError: error instanceof Error ? error.message : String(error),
			});
		} catch (updateError) {
			logger.error("エラー状態の記録に失敗しました:", updateError);
		}

		return {
			videoCount: 0,
			error: error instanceof Error ? error.message : "不明なエラーが発生しました",
		};
	}
}

/**
 * YouTubeから涼花みなせチャンネルの動画情報を取得し、Firestoreに保存する関数（Pub/Sub向け）
 *
 * @param event - Pub/SubトリガーからのCloudEvent
 * @returns Promise<void> - 非同期処理の完了を表すPromise
 */
export const fetchYouTubeVideos = async (event: CloudEvent<PubsubMessage>): Promise<void> => {
	logger.info("fetchYouTubeVideos 関数を開始しました (GCFv2 CloudEvent Handler)");

	try {
		// CloudEvent（Pub/Sub）の場合
		logger.info("Pub/Subトリガーからの実行を検出しました");
		const message = event.data;

		if (!message) {
			logger.error("CloudEventデータが不足しています", { event });
			return;
		}

		// 属性情報の処理 - テストに合わせてフォーマットを変更
		if (message.attributes) {
			logger.info("受信した属性情報:", message.attributes);
		}

		// Base64エンコードされたデータがあれば復号 - テストに合わせてフォーマットを変更
		if (message.data) {
			try {
				const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
				// TypeScriptの型チェックに合格するようオブジェクト形式で渡す
				logger.info("デコードされたメッセージデータ:", {
					message: decodedData,
				});
			} catch (err) {
				logger.error("Base64メッセージデータのデコードに失敗しました:", err);
				return;
			}
		}

		// SPR-230: ペイロードのmodeを確認し、週次フルスイープかどうかを判定する
		const mode = decodePubsubMode(message);
		const isWeeklyFullSweep = mode === "weekly_full_sweep";
		if (isWeeklyFullSweep) {
			logger.info("週次フルスイープトリガーを検出しました");
		}

		// 共通のロジックを実行
		const result = await fetchYouTubeVideosLogic(isWeeklyFullSweep);

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
