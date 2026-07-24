/**
 * 未取込動画の backfill ツール（SPR-263）
 *
 * 旧 discovery（search.list、インデックス不完全）時代に一度も Firestore へ
 * 取り込まれなかった公開動画5件を、videos.list で ID 指定取得して
 * 本番の書き込み経路（saveVideosToFirestore、merge:true）にそのまま渡す。
 * 新しい書き込みパスは増やさない（backfill-video-status.ts と同型）。
 *
 * 対象IDは SPR-230 の週次フルスイープ初回発火（2026-07-12）で検出された
 * 「uploadsPlaylistのみに存在する件数」と一致する固定リスト。
 */

import type { youtube_v3 } from "googleapis";
import {
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchVideoDetails,
	initializeYouTubeClient,
} from "../services/youtube/youtube-api";
import { getKnownVideoIdsSet, saveVideosToFirestore } from "../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../shared/common";
import * as logger from "../shared/logger";

/** SPR-230 週次フルスイープで検出された未取込動画ID（固定リスト） */
export const MISSING_VIDEO_IDS = [
	"pbYmFamK9lE",
	"AFc0vAj__dA",
	"FM9Z0l7sT44",
	"gLYSr3MlXyk",
	"J_Whs7Lf76c",
] as const;

/**
 * buildPlaylistVideoMapping（youtube.ts、非 export）と同じロジックの再計算。
 * 対象動画に限定せずチャンネル全体を走査する（既存の毎時クロールと同一コスト）。
 */
async function buildPlaylistVideoMapping(
	youtube: youtube_v3.Youtube,
): Promise<Map<string, string[]>> {
	const videoPlaylistMap = new Map<string, string[]>();
	const playlists = await fetchChannelPlaylists(youtube, SUZUKA_MINASE_CHANNEL_ID);
	logger.info(`${playlists.length}個のプレイリストを取得しました`);

	for (const playlist of playlists) {
		try {
			const videoIds = await fetchPlaylistItems(youtube, playlist.id);
			for (const videoId of videoIds) {
				const current = videoPlaylistMap.get(videoId) || [];
				if (!current.includes(playlist.title)) {
					current.push(playlist.title);
				}
				videoPlaylistMap.set(videoId, current);
			}
		} catch (_error) {
			logger.warn(`プレイリスト「${playlist.title}」の動画取得に失敗`);
		}
	}
	return videoPlaylistMap;
}

export async function backfillMissingVideos(): Promise<void> {
	const targetIds = [...MISSING_VIDEO_IDS];

	const knownIds = await getKnownVideoIdsSet(targetIds);
	const alreadyKnown = targetIds.filter((id) => knownIds.has(id));
	if (alreadyKnown.length > 0) {
		logger.info(`既に取り込み済みのためスキップ: ${alreadyKnown.length}件`, { alreadyKnown });
	}
	const missingIds = targetIds.filter((id) => !knownIds.has(id));
	logger.info(`backfill 対象: ${missingIds.length}件`, { missingIds });

	if (missingIds.length === 0) {
		logger.info("backfill 対象なし。終了します");
		return;
	}

	const [youtube, initError] = initializeYouTubeClient();
	if (initError || !youtube) {
		logger.error("YouTube クライアント初期化に失敗しました", { initError });
		throw new Error(initError?.error || "YouTube クライアント初期化に失敗しました");
	}

	const playlistMap = await buildPlaylistVideoMapping(youtube);
	const videoDetails = await fetchVideoDetails(youtube, missingIds);
	logger.info(`videos.list で ${videoDetails.length}/${missingIds.length} 件を取得`);

	const foundIds = new Set(videoDetails.map((v) => v.id).filter((id): id is string => !!id));
	const notFound = missingIds.filter((id) => !foundIds.has(id));
	if (notFound.length > 0) {
		logger.warn("videos.list で見つからなかった ID（非公開化・削除の可能性）", { notFound });
	}

	const videosWithTags = videoDetails.map((video) => {
		if (!video.id) return video;
		const playlistTags = playlistMap.get(video.id) || [];
		return { ...video, _playlistTags: playlistTags };
	});

	const savedCount = await saveVideosToFirestore(videosWithTags);
	logger.info(`保存完了: ${savedCount}件`);

	// 検証: 対象IDが取り込まれたか再確認
	const finalKnown = await getKnownVideoIdsSet(missingIds);
	const stillMissing = missingIds.filter((id) => !finalKnown.has(id));
	logger.info(`backfill 後の残存: ${stillMissing.length}件`, { stillMissing });
}

if (require.main === module) {
	backfillMissingVideos()
		.then(() => {
			logger.info("backfill-missing-videos 完了");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("backfill-missing-videos エラー:", error);
			process.exit(1);
		});
}
