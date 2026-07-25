/**
 * YouTube 動画取得: playlist→video マッピング（3層タグシステム用）
 *
 * 全 playlist 走査によるマッピング構築・日次 Firestore キャッシュ・動画への
 * プレイリストタグ付与を担う。通常 run と fast_recheck の両方から使われる。
 */

import type { youtube_v3 } from "@googleapis/youtube";
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
): Promise<{ mapping: Map<string, string[]>; complete: boolean }> {
	const videoPlaylistMap = new Map<string, string[]>();
	// SPR-274: 「取得できた分だけのマップ」と「全プレイリストを網羅したマップ」を
	// 呼び出し側が区別できるようにする。不完全なマップを完全なものとして永続化すると、
	// 欠けた分のタグが空で上書きされ、その日いっぱい残り続ける。
	let complete = true;

	try {
		// プレイリスト一覧を取得
		const playlists = await fetchChannelPlaylists(youtube, channelId);
		logger.info(`${playlists.length}個のプレイリストを取得しました`);

		// 各プレイリストの動画を取得
		for (const playlist of playlists) {
			try {
				const { videoIds, complete: itemsComplete } = await fetchPlaylistItems(
					youtube,
					playlist.id,
				);
				if (!itemsComplete) {
					// ページングが打ち切られた＝このプレイリストの動画を取りこぼしている
					logger.warn(`プレイリスト「${playlist.title}」の動画取得が打ち切られました`);
					complete = false;
				}
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
				// 個別のプレイリストエラーは継続するが、結果は不完全
				complete = false;
			}
		}

		logger.info(`${videoPlaylistMap.size}件の動画にプレイリストタグをマッピング`);
	} catch (error) {
		// プレイリスト一覧自体が取れなかった＝マップは空。処理は継続するが完全ではない。
		logger.error("プレイリスト情報の取得に失敗:", error);
		complete = false;
	}

	return { mapping: videoPlaylistMap, complete };
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
 *
 * SPR-274: 再構築が不完全（プレイリスト一覧の取得失敗・個別プレイリストの打ち切り等）だった
 * 場合はその結果を**キャッシュしない**。以前は成否に関わらず保存していたため、JST日の最初の
 * runが一過性APIエラーに当たると空マップがその日のキャッシュとして固定され、同日の全runが
 * それを再利用して全動画の`playlistTags`を空で上書きしていた（old-tierのローテーション順の
 * 都合で復旧に約10日かかる）。不完全な場合は直前のキャッシュ（前日以前でも可）を優先して使う。
 * プレイリスト構成は日単位でほぼ変わらないため、空マップより前日の内容の方が実態に近い。
 */
export async function resolvePlaylistVideoMapping(
	youtube: youtube_v3.Youtube,
	channelId: string,
	discoveredVideoIds: string[],
): Promise<Map<string, string[]>> {
	if (!isPlaylistCacheEnabled()) {
		return (await buildPlaylistVideoMapping(youtube, channelId)).mapping;
	}

	const todayJST = getJSTDate();

	// 不完全な再構築だったときのフォールバック元として、読めたキャッシュは保持しておく。
	let cached: Awaited<ReturnType<typeof getPlaylistMappingCache>>;
	try {
		cached = await getPlaylistMappingCache();
		if (cached && cached.updatedAtJST === todayJST) {
			const hasUncoveredNewVideo = discoveredVideoIds.some((id) => !cached?.mapping.has(id));
			if (!hasUncoveredNewVideo) {
				logger.debug("playlist→videoマッピングのキャッシュを再利用します", { todayJST });
				return cached.mapping;
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

	const { mapping, complete } = await buildPlaylistVideoMapping(youtube, channelId);

	if (!complete) {
		// 不完全な結果は永続化しない（当日の全runがこれを再利用してしまうため）。
		logger.error(
			"playlist→videoマッピングの再構築が不完全でした。キャッシュせず、この run 限りで扱います",
			{
				todayJST,
				構築できた件数: mapping.size,
				直前キャッシュを使用: Boolean(cached),
				直前キャッシュ件数: cached?.mapping.size,
			},
		);
		// 前日以前のキャッシュでも、不完全な今回の結果より実態に近い。
		return cached?.mapping ?? mapping;
	}

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
