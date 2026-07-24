/**
 * YouTube 動画取得: uploads playlist ベースの discovery
 *
 * incremental（early-stop）走査による新着発見、全件走査＋既知集合突合による
 * 取りこぼし検知（週次フルスイープ）、fast_recheck 向けの軽量新着発見を担う。
 */

import type { youtube_v3 } from "googleapis";
import {
	fetchUploadsPlaylistId,
	fetchUploadsPlaylistPage,
} from "../../services/youtube/youtube-api";
import { getAllVideoIds, getKnownVideoIdsSet } from "../../services/youtube/youtube-firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
import * as logger from "../../shared/logger";
import { type FetchMetadata, getCachedUploadsPlaylistId, updateMetadata } from "./fetch-metadata";

// SPR-230: uploads playlistベースdiscoveryのページ数上限（1 unit/ページと安価なため緩め。
// 初回バックフィル(~550件≈11ページ)を1runで完了できる余裕を持たせる）
const MAX_DISCOVERY_PAGES = 20;

/**
 * uploads playlist IDを解決する（メタデータにキャッシュ済みならそれを使い、無ければ取得して保存）
 *
 * SPR-230: 対象は`SUZUKA_MINASE_CHANNEL_ID`固定チャンネルで、uploads playlist IDは
 * 実質不変のため、一度取得すればメタデータ経由で以後の呼び出しコストはゼロになる。
 */
export async function resolveUploadsPlaylistId(
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
 * SPR-230: 週次フルスイープの取りこぼし検知に使う。
 *
 * @returns `videoIds`と、`MAX_DISCOVERY_PAGES`到達により打ち切られたかどうか（`truncated`）。
 *   レビュー指摘対応: `fetchVideoIdsViaPlaylistIncremental`と同じ理由で、打ち切りを
 *   検知しないと、チャンネル動画数が上限を超えた際にこの関数を使う取りこぼし検知
 *   （週次フルスイープ）自体が「未走査分をすべて取りこぼし」と誤検知し続ける。
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
export async function logDiscoveryComparison(
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
export async function fetchVideoIds(
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

/**
 * 新着動画の軽量発見（uploads playlistのincremental early-stop走査）を試みる。
 *
 * uploads playlist IDはFetchMetadataにキャッシュ済みの値を読むだけで、未キャッシュの場合は
 * 何も書き込まずスキップする（`runFastRecheck`が共有メタデータを一切更新しないという
 * 前提を保つため。初回キャッシュはhourly run側の責務のまま）。
 */
export async function tryFastDiscovery(
	youtube: youtube_v3.Youtube,
): Promise<{ videoIds: string[] }> {
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
