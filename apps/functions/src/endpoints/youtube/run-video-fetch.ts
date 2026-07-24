/**
 * YouTube 動画取得: オーケストレータ（この関数群が run の本処理）
 *
 * 通常 run（新着発見→stale live救済→統計ティア合流→タグ付与→保存）・
 * 週次フルスイープ（取りこぼし検知のみ）・fast_recheck（配信中/配信予定の高速反映）の
 * 3モードを組み立てる。ハンドラ（fetch-youtube-videos.ts）から
 * `fetchYouTubeVideosLogic` が呼ばれる。
 */

import type { youtube_v3 } from "googleapis";
import { Timestamp } from "../../infrastructure/database/firestore";
import { getJSTDate } from "../../services/price-history";
import { RECENT_WINDOW_DAYS } from "../../services/youtube/video-tiering";
import { fetchVideoDetails, initializeYouTubeClient } from "../../services/youtube/youtube-api";
import {
	getOldTierDueVideoIds,
	getRecentTierVideoIds,
	getStaleLiveVideoIds,
	saveVideosToFirestore,
} from "../../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
import * as logger from "../../shared/logger";
import {
	type FetchMetadata,
	type FetchResult,
	prepareExecution,
	updateMetadata,
} from "./fetch-metadata";
import { mapPlaylistTagsToVideos, resolvePlaylistVideoMapping } from "./playlist-mapping";
import {
	fetchVideoIds,
	logDiscoveryComparison,
	resolveUploadsPlaylistId,
	tryFastDiscovery,
} from "./video-discovery";

/**
 * SPR-261/262: 動画統計（videos.list）のティア差分再取得フラグ。
 * falseにすると新着discovery・stale live救済のみ（旧挙動）に戻る。
 */
function isStatsTierRefreshEnabled(): boolean {
	return process.env.YOUTUBE_STATS_TIER_REFRESH_ENABLED !== "false";
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
 * 配信中/配信予定の高速反映専用フロー（15分毎スケジューラ向け）
 *
 * 目的は2つ:
 *   1. 配信中→配信済みの遷移をhourly runより速く反映する（一度配信済みになった動画は
 *      基本的に変化しないため、対象は`getStaleLiveVideoIds`が返すliveBroadcastContent
 *      in ["live","upcoming"]の動画のみ）
 *   2. 新着動画（配信予定として新規作成された動画）の発見自体もhourly run（最大1時間律速）
 *      より速く反映する（`tryFastDiscovery`）
 *
 * 統計ティア更新は行わない（hourly runの役割のまま）。
 *
 * 通常runの`FetchMetadata`（isInProgressロック）は一切更新しない
 * （uploads playlist IDの読み取りのみ行う）。理由は2つ:
 *   1. 共有ロックを取ると15分毎の頻度でhourly runとの間欠的なブロッキングが発生しうる
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
	// （取りこぼし検知比較と同様、本処理への影響を切り離す）。
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
export type FetchMode = "normal" | "weekly_full_sweep" | "fast_recheck";

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
export async function fetchYouTubeVideosLogic(mode: FetchMode = "normal"): Promise<FetchResult> {
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

		// fast_recheckは通常runの二重実行ロックを共有しない（runFastRecheckのJSDoc参照）
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
