/**
 * YouTube 動画取得: playlist→video マッピング（3層タグシステム用）
 *
 * 全 playlist 走査によるマッピング構築・日次 Firestore キャッシュ・動画への
 * プレイリストタグ付与を担う。通常 run と fast_recheck の両方から使われる。
 */

import type { youtube_v3 } from "googleapis";
import { getJSTDate } from "../../services/price-history";
import { fetchChannelPlaylists, fetchPlaylistItems } from "../../services/youtube/youtube-api";
import {
	getPlaylistMappingCache,
	savePlaylistMappingCache,
} from "../../services/youtube/youtube-firestore";
import * as logger from "../../shared/logger";

/**
 * SPR-261/262: playlist→videoマッピングのFirestoreキャッシュ利用フラグ。
 * dlsiteの`isTierFilteringEnabled`と同型（緊急時はfalseにして再デプロイするだけで
 * 旧挙動＝毎run全playlist再取得に戻せる。Firestoreスキーマ変更を伴わないためロールバックの障害はない）。
 */
function isPlaylistCacheEnabled(): boolean {
	return process.env.YOUTUBE_PLAYLIST_CACHE_ENABLED !== "false";
}

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
 * （取りこぼし検知・stale live救済と同じ「本処理を壊さない」方針を踏襲）。
 *
 * レビュー指摘対応: 日次キャッシュのままだと、キャッシュ構築後に新規発見された動画の
 * `playlistTags`が翌日の再構築まで空欄のまま残ってしまう。`discoveredVideoIds`
 * （このrunで新着として発見された動画）のうち1件でもキャッシュ未反映のものがあれば、
 * 当日中でも再構築する。新着discoveryが起きたrunでしか再構築は走らないため、
 * 定常run（新着0件）のクォータ削減効果は維持される。
 */
export async function resolvePlaylistVideoMapping(
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
 * 動画にプレイリストタグをマッピング
 *
 * @param videos - YouTube動画の配列
 * @param playlistMap - プレイリスト名のマップ
 * @returns プレイリストタグ付き動画の配列
 */
export function mapPlaylistTagsToVideos(
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
