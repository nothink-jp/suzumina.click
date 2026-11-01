import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { cacheLife, cacheTag } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { convertToVideo } from "./utils/video-converters";

/** 表示可能な動画全件キャッシュのタグ。audioButtonCount を動かす Server Action が updateTag で失効させる */
export const VISIBLE_VIDEOS_TAG = "visible-videos";

/**
 * 一覧に表示できる動画か（公開、または status 未取得）。一覧の表示と総数の正本
 */
export function isVisibleVideo(video: VideoPlainObject): boolean {
	return video.status?.privacyStatus === "public" || !video.status;
}

/**
 * `/videos` 一覧の読み取り正本（SPR-349）。新しい順（publishedAt desc）で返す。
 *
 * 旧実装は絞り込み無しのページ送りを `.limit(startOffset).get()` → `startAfter` の
 * オフセット・エミュレーションで行い、読み捨て分も課金されるため read が page 番号に比例していた。
 * 絞り込み/least_buttons 経路は全件を毎リクエスト読んでいた（キャッシュ無し）。
 *
 * 構造は `creators/creators-source.ts` と同じで、キャッシュ境界を**引数を取らない全件取得**に絞り、
 * 絞り込み・並べ替え・ページ送りは外側の純粋な導出にする。総数もこの結果から出すので、
 * count() 集計（旧 getVisibleVideoCount）と表示フィルタの非対称（SPR-246）が構造的に起きない。
 *
 * 動画は 2h ごとの取り込みでしか増えないので cacheLife("hours") で足りる。audioButtonCount
 * （least_buttons 並べ替え）はボタン作成/削除時に updateTag で書き込みインスタンスだけ失効する。
 *
 * 取得失敗は throw して伝播させる（空配列をキャッシュに載せない）。
 * 戻り値はキャッシュ共有されうるので、呼び出し側は破壊的に並べ替えない。
 */
export async function loadAllVisibleVideos(): Promise<VideoPlainObject[]> {
	"use cache";
	cacheLife("hours");
	cacheTag(VISIBLE_VIDEOS_TAG);

	const firestore = getFirestore();
	const snapshot = await firestore.collection("videos").orderBy("publishedAt", "desc").get();

	return snapshot.docs
		.map((doc) => convertToVideo(doc))
		.filter((video): video is VideoPlainObject => video !== null)
		.filter(isVisibleVideo);
}
