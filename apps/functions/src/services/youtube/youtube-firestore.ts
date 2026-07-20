/**
 * YouTube Firestore Service
 *
 * VideoPlainObject形式でFirestoreに動画データを保存する
 * 新規データには_v2Migrationフラグを自動付与
 */

import { videoToFirestore } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import { chunkArray } from "../../shared/array-utils";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
import * as logger from "../../shared/logger";
import { VideoMapper } from "../mappers/video-mapper";
import { getStatsTierCutoffDate } from "./video-tiering";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限
/** SPR-261/262: playlist→videoマッピングキャッシュ・動画統計ティアのメタデータ保存先 */
const YOUTUBE_METADATA_COLLECTION = "youtubeMetadata";
const PLAYLIST_MAPPING_CACHE_DOC_ID = "playlist_video_mapping_cache";

/** videoIdバルク存在確認（getAll）を分割するチャンクサイズ */
const KNOWN_VIDEO_IDS_CHUNK_SIZE = 300;

/**
 * 指定した動画IDのうち、Firestoreに既に存在する（=既知の）IDの集合を返す
 *
 * SPR-230: uploads playlistは新着順なので、ページ内の動画IDがこの集合に
 * 含まれていれば「既に発見済みの旧動画」と判定できる（incremental discoveryの
 * early-stop判定に使う）。`videos`コレクションはdoc ID=video.idのため、
 * DLsiteの`getExistingWorksMap`（productIdフィールドでの`in`クエリ）と違い
 * `firestore.getAll(...refs)`によるバルク直接取得がそのまま使える。
 *
 * @param videoIds 確認対象の動画ID
 * @returns 既にFirestoreに存在する動画IDの集合
 */
export async function getKnownVideoIdsSet(videoIds: string[]): Promise<Set<string>> {
	const knownIds = new Set<string>();
	if (videoIds.length === 0) {
		return knownIds;
	}

	const refs = videoIds.map((id) => firestore.collection(VIDEOS_COLLECTION).doc(id));
	const chunks = chunkArray(refs, KNOWN_VIDEO_IDS_CHUNK_SIZE);

	const chunkResults = await Promise.all(chunks.map((chunk) => firestore.getAll(...chunk)));

	for (const docs of chunkResults) {
		for (const doc of docs) {
			if (doc.exists) {
				knownIds.add(doc.id);
			}
		}
	}

	return knownIds;
}

/**
 * Firestoreに保存されている全動画IDの集合を返す（`videos`コレクション全件のID一覧）
 *
 * SPR-230: 週次フルスイープでの取りこぼし検知（uploads playlist全走査で見つからなかった
 * 既知動画IDが無いか）に使う。`select()`でフィールド取得を省きID一覧のみを取得することで
 * 読み取りコストを抑える。対象は~550件程度の小規模コレクションのため全件取得で十分。
 *
 * @returns Firestoreに存在する全動画IDの集合
 */
export async function getAllVideoIds(): Promise<Set<string>> {
	const snapshot = await firestore.collection(VIDEOS_COLLECTION).select().get();
	return new Set(snapshot.docs.map((doc) => doc.id));
}

/** stale判定で再取得対象とする件数上限（暴走防止） */
const MAX_STALE_LIVE_VIDEO_IDS = 50;

/**
 * Firestore上で`liveBroadcastContent`が"live"または"upcoming"のまま残っている動画IDを返す
 *
 * SPR-230回帰対応: incremental discoveryは新着（未知）動画IDしか返さないため、一度保存された
 * 動画は配信終了後も再取得されず、liveBroadcastContent/liveStreamingDetails.actualEndTimeが
 * 固着する（video-firestore.tsのisLive/isUpcomingはliveBroadcastContent自体をOR条件に使うため
 * フロントエンド側では直せない）。対象は通常0〜数件だが、異常系の暴走防止として
 * MAX_STALE_LIVE_VIDEO_IDSで打ち切る。`lastFetchedAt`昇順にすることで、50件を超える固着が
 * 発生した場合でも最も長く再取得されていない動画から優先的に救済され、再取得後は
 * `lastFetchedAt`が更新され順位が下がるため複数runでローテーションし全件が解消に向かう
 * （`where(in)`+`orderBy(別フィールド)`のため複合インデックスが必要。
 * terraform/firestore_indexes.tfに追加済み）。
 *
 * @returns liveBroadcastContentが"live"/"upcoming"のまま残っている動画IDと、
 *   件数上限に達したため今回救済しきれなかった可能性があるかどうか（truncated）
 */
export async function getStaleLiveVideoIds(): Promise<{
	videoIds: string[];
	truncated: boolean;
}> {
	const snapshot = await firestore
		.collection(VIDEOS_COLLECTION)
		.where("liveBroadcastContent", "in", ["live", "upcoming"])
		.orderBy("lastFetchedAt", "asc")
		.select()
		.limit(MAX_STALE_LIVE_VIDEO_IDS)
		.get();
	return {
		videoIds: snapshot.docs.map((doc) => doc.id),
		truncated: snapshot.docs.length >= MAX_STALE_LIVE_VIDEO_IDS,
	};
}

/**
 * Entity 形式でYouTube動画をFirestoreに保存
 *
 * @param videos - YouTube APIから取得した動画の配列
 * @returns 保存に成功した動画数
 */
export async function saveVideosToFirestore(videos: youtube_v3.Schema$Video[]): Promise<number> {
	if (videos.length === 0) {
		return 0;
	}

	// 許可されたチャンネルIDの動画のみをフィルタリング
	const filteredVideos: youtube_v3.Schema$Video[] = [];
	let skippedCount = 0;

	for (const video of videos) {
		const channelId = video.snippet?.channelId;
		if (!channelId) {
			logger.warn("動画にチャンネルIDがありません", { videoId: video.id });
			skippedCount++;
			continue;
		}

		// 許可されたチャンネルIDかチェック
		if (channelId !== SUZUKA_MINASE_CHANNEL_ID) {
			logger.warn("許可されていないチャンネルの動画をスキップしました", {
				videoId: video.id,
				videoTitle: video.snippet?.title,
				channelId,
				expectedChannelId: SUZUKA_MINASE_CHANNEL_ID,
			});
			skippedCount++;
			continue;
		}

		filteredVideos.push(video);
	}

	if (skippedCount > 0) {
		logger.info(
			`チャンネルIDフィルタリング完了: ${filteredVideos.length}件保存対象、${skippedCount}件スキップ`,
		);
	}

	if (filteredVideos.length === 0) {
		logger.warn("保存対象の動画がありません（すべてフィルタリングされました）");
		return 0;
	}

	// チャンネルIDでグループ化（フィルタリング済みなので基本的に1チャンネルのみ）
	const videosByChannel = new Map<string, youtube_v3.Schema$Video[]>();
	for (const video of filteredVideos) {
		const channelId = video.snippet?.channelId;
		if (!channelId) {
			continue;
		}

		const channelVideos = videosByChannel.get(channelId) || [];
		channelVideos.push(video);
		videosByChannel.set(channelId, channelVideos);
	}

	// Entity 形式で動画を保存開始

	let totalSaved = 0;

	// チャンネル別に処理
	for (const [channelId, channelVideos] of videosByChannel) {
		const result = await saveChannelVideos(channelId, channelVideos);
		totalSaved += result.savedCount;
	}

	// 保存に失敗した場合のみログを出力
	if (totalSaved < filteredVideos.length) {
		logger.warn("一部の動画保存に失敗", {
			total: filteredVideos.length,
			saved: totalSaved,
			failed: filteredVideos.length - totalSaved,
		});
	}

	return totalSaved;
}

/**
 * 動画をFirestoreバッチに追加
 */
function addVideoToBatch(
	video: youtube_v3.Schema$Video & { _playlistTags?: string[] },
	batch: FirebaseFirestore.WriteBatch,
	videoRef: FirebaseFirestore.CollectionReference,
): boolean {
	if (!video.id) {
		logger.warn("動画IDがありません", { videoId: video.id });
		return false;
	}

	// プレイリストタグを抽出
	const playlistTags = video._playlistTags || [];

	// VideoPlainObjectに変換（プレイリストタグも渡す）
	const videoPlainObject = VideoMapper.fromYouTubeAPIWithTags(video, playlistTags);
	if (!videoPlainObject) {
		// 変換失敗（ログはエラーハンドリングで出力済み）
		return false;
	}

	// Firestore用データに変換
	const firestoreData = videoToFirestore(videoPlainObject);

	// 動画IDをドキュメントIDとして使用
	const docRef = videoRef.doc(video.id);
	batch.set(docRef, firestoreData, { merge: true });
	return true;
}

/**
 * バッチ単位で動画を保存
 */
async function saveBatchVideos(
	batchVideos: youtube_v3.Schema$Video[],
	videoRef: FirebaseFirestore.CollectionReference,
	channelId: string,
	batchNumber: number,
): Promise<number> {
	const batch = firestore.batch();
	let batchCount = 0;

	for (const video of batchVideos) {
		try {
			if (addVideoToBatch(video, batch, videoRef)) {
				batchCount++;
			}
		} catch (error) {
			logger.error("動画のEntity変換に失敗", {
				videoId: video.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// バッチをコミット
	if (batchCount > 0) {
		try {
			await batch.commit();
			return batchCount;
		} catch (error) {
			logger.error("バッチ保存エラー", {
				channelId,
				batchNumber,
				error: error instanceof Error ? error.message : String(error),
			});
			return 0;
		}
	}

	return 0;
}

/**
 * チャンネル別に動画を保存（Entity 形式）
 */
async function saveChannelVideos(
	channelId: string,
	videos: youtube_v3.Schema$Video[],
): Promise<{ savedCount: number }> {
	const videoRef = firestore.collection(VIDEOS_COLLECTION);
	let savedCount = 0;

	// バッチサイズごとに分割して処理
	for (let i = 0; i < videos.length; i += MAX_FIRESTORE_BATCH_SIZE) {
		const batchVideos = videos.slice(i, i + MAX_FIRESTORE_BATCH_SIZE);
		const batchNumber = Math.floor(i / MAX_FIRESTORE_BATCH_SIZE) + 1;
		const batchSavedCount = await saveBatchVideos(batchVideos, videoRef, channelId, batchNumber);
		savedCount += batchSavedCount;
	}

	return { savedCount };
}

// ==============================================================================
// SPR-261/262: playlist→videoマッピングのFirestoreキャッシュ
// ==============================================================================

interface PlaylistMappingCacheDoc {
	mapping: Record<string, string[]>;
	updatedAtJST: string;
	updatedAt: Timestamp;
}

/**
 * playlist→videoマッピングのキャッシュを読む
 *
 * SPR-261/262: `buildPlaylistVideoMapping`（playlists+playlistItemsの全走査）は
 * 毎run再取得すると定常状態のクォータ消費の大半を占めるため、日次1回だけ再構築し
 * Firestoreにキャッシュする。呼び出し側（youtube.ts）が`updatedAtJST`を見て
 * 当日分として再利用可能かを判定する。
 *
 * @returns キャッシュが存在しない場合は`undefined`
 */
export async function getPlaylistMappingCache(): Promise<
	{ mapping: Map<string, string[]>; updatedAtJST: string } | undefined
> {
	const doc = await firestore
		.collection(YOUTUBE_METADATA_COLLECTION)
		.doc(PLAYLIST_MAPPING_CACHE_DOC_ID)
		.get();

	if (!doc.exists) {
		return undefined;
	}

	const data = doc.data() as PlaylistMappingCacheDoc;
	return {
		mapping: new Map(Object.entries(data.mapping ?? {})),
		updatedAtJST: data.updatedAtJST,
	};
}

/**
 * playlist→videoマッピングのキャッシュを保存する（常に全件で上書き）
 */
export async function savePlaylistMappingCache(
	mapping: Map<string, string[]>,
	updatedAtJST: string,
): Promise<void> {
	const doc: PlaylistMappingCacheDoc = {
		mapping: Object.fromEntries(mapping),
		updatedAtJST,
		updatedAt: Timestamp.now(),
	};
	await firestore
		.collection(YOUTUBE_METADATA_COLLECTION)
		.doc(PLAYLIST_MAPPING_CACHE_DOC_ID)
		.set(doc);
}

// ==============================================================================
// SPR-261/262: 動画統計（videos.list）取得のティア化
// ==============================================================================

/** recent-tierクエリの安全弁（暴走防止の上限件数） */
export const MAX_RECENT_TIER_VIDEO_IDS = 200;
/** old-tierの1日あたり再取得上限（ローテーションで解消していく前提の件数） */
export const MAX_OLD_TIER_DUE_VIDEO_IDS = 50;

/**
 * DateをJST（Asia/Tokyo）の"YYYY-MM-DD"に変換する
 *
 * `getJSTDate()`（price-history-saver.ts）は「現在時刻」専用のため、Firestoreから読んだ
 * 任意の`lastFetchedAt`をJST日付文字列化するためにここでローカル定義する。
 */
function toJSTDateString(date: Date): string {
	const jstDateStr = date.toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const [year, month, day] = jstDateStr.split("/");
	return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
}

/**
 * recent-tier（直近windowDays日以内に公開された動画）の動画IDを全件返す
 *
 * recentは「毎run（毎時）再取得」が仕様のため、日付によるdueフィルタは行わない。
 * `publishedAt`の単一フィールド範囲クエリのため複合indexは不要。
 */
export async function getRecentTierVideoIds(
	windowDays: number,
	today: Date,
	limit: number = MAX_RECENT_TIER_VIDEO_IDS,
): Promise<string[]> {
	const cutoff = getStatsTierCutoffDate(windowDays, today);

	const snapshot = await firestore
		.collection(VIDEOS_COLLECTION)
		.where("publishedAt", ">=", Timestamp.fromDate(cutoff))
		.select()
		.limit(limit)
		.get();

	return snapshot.docs.map((doc) => doc.id);
}

/**
 * old-tier（windowDays日より前に公開された動画）のうち、当日JSTでまだ再取得していない
 * ものを`lastFetchedAt`昇順（最も長く放置されている順）に`limit`件返す
 *
 * `publishedAt`の単一フィールド範囲クエリで候補を絞り込み、当日再取得済みかどうかの
 * 判定と最終的な優先順ソートはin-memoryで行う（`lastFetchedAt`との複合indexを避けるため）。
 * 対象規模（数百件程度）ではFirestore読み取りコストは軽微。
 */
export async function getOldTierDueVideoIds(
	windowDays: number,
	today: Date,
	todayJST: string,
	limit: number = MAX_OLD_TIER_DUE_VIDEO_IDS,
): Promise<string[]> {
	const cutoff = getStatsTierCutoffDate(windowDays, today);

	const snapshot = await firestore
		.collection(VIDEOS_COLLECTION)
		.where("publishedAt", "<", Timestamp.fromDate(cutoff))
		.select("lastFetchedAt")
		.get();

	const candidates = snapshot.docs
		.map((doc) => {
			const lastFetchedAt = doc.get("lastFetchedAt");
			const lastFetchedAtDate =
				lastFetchedAt instanceof Timestamp ? lastFetchedAt.toDate() : new Date(0);
			return { id: doc.id, lastFetchedAtDate };
		})
		.filter((candidate) => toJSTDateString(candidate.lastFetchedAtDate) !== todayJST);

	candidates.sort((a, b) => a.lastFetchedAtDate.getTime() - b.lastFetchedAtDate.getTime());

	return candidates.slice(0, limit).map((candidate) => candidate.id);
}
