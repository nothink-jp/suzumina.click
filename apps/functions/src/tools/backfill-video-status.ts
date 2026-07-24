/**
 * videos.status backfill ツール（SPR-245）
 *
 * search.list（チャンネル検索 + order:date）はインデックスの都合で一部動画を
 * 列挙し損ねることがあり、そうした動画は毎時クロールが二度と触れず
 * video-mapper.ts の status 写像（SPR-243）を適用できないまま残る。
 * このツールは Firestore 側で status 未保有の動画 ID を直接抽出し、
 * videos.list で ID 指定取得して本番の書き込み経路（saveVideosToFirestore、
 * merge:true）にそのまま渡す。新しい書き込みパスは増やさない。
 *
 * プレイリストタグは buildPlaylistVideoMapping と同じソース
 * （fetchChannelPlaylists + fetchPlaylistItems）から再計算する。
 * merge:true は tags のようなネストしたオブジェクトをリーフ単位でマスクするため、
 * 空配列を渡すと既存の playlistTags を消してしまう（実際 555 件中 544 件が
 * 保有）。ここで正しく再計算せず放置すると新しいバグを生む。
 */

import type { youtube_v3 } from "googleapis";
import firestore from "../infrastructure/database/firestore";
import {
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchVideoDetails,
	initializeYouTubeClient,
} from "../services/youtube/youtube-api";
import { saveVideosToFirestore } from "../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../shared/common";
import * as logger from "../shared/logger";

const VIDEOS_COLLECTION = "videos";

/**
 * Firestore を全件走査し、status 未保有の動画 ID を集める
 */
async function findVideosMissingStatus(): Promise<string[]> {
	const snapshot = await firestore.collection(VIDEOS_COLLECTION).get();
	return snapshot.docs.filter((doc) => doc.data().status == null).map((doc) => doc.id);
}

/**
 * buildPlaylistVideoMapping（endpoints/youtube/playlist-mapping.ts、非 export）と同じロジックの再計算。
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

export async function backfillVideoStatus(): Promise<void> {
	const missingIds = await findVideosMissingStatus();
	logger.info(`status 未保有の動画: ${missingIds.length}件`, { missingIds });

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

	// 検証: 対象IDが status を持つようになったか再確認
	const stillMissing = await findVideosMissingStatus();
	const stillMissingTargets = stillMissing.filter((id) => missingIds.includes(id));
	logger.info(`backfill 後の残存: ${stillMissingTargets.length}件`, {
		stillMissingTargets,
	});
}

if (require.main === module) {
	backfillVideoStatus()
		.then(() => {
			logger.info("backfill-video-status 完了");
			process.exit(0);
		})
		.catch((error) => {
			logger.error("backfill-video-status エラー:", error);
			process.exit(1);
		});
}
