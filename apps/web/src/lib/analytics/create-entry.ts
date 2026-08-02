/**
 * 音声ボタン作成画面（/buttons/create）へ来た入口の語彙（SPR-296）。
 *
 * PR #892 で作成の本線を「作る起点」から「視聴起点」へ反転した。動画カードから作成を降ろし
 * 狙い撃ちを詳細ページ経由（+1クリック）にした交換が損だったかを判定するには、作成が
 * どの入口から来たかを分けて数える必要がある。既存の from_draft は「draft_id クエリが
 * 付いていたか」に等価で、/watch・マーク棚・動画詳細を区別できない。
 *
 * 値は URL クエリ（?entry=）で運ぶ＝ユーザーが任意に書ける。GA4 のカスタムディメンションは
 * 値のカーディナリティを制限せず、一度入った値は消せないため、parseCreateEntry で
 * 既知の値だけを通す（未知は unknown へ畳む）。
 */

export const CREATE_ENTRY = {
	/** /watch 固定バーの「まとめて仕上げる」 */
	watchBulk: "watch_bulk",
	/** /watch キュー内の個別「仕上げる」 */
	watchSingle: "watch_single",
	/** マーク棚（/drafts）の「まとめて仕上げる」 */
	draftsBulk: "drafts_bulk",
	/** マーク棚（/drafts）の「この1件を仕上げる」 */
	draftsSingle: "drafts_single",
	/** マーク直後チップの「すぐ仕上げる」 */
	chipNow: "chip_now",
	/** 動画詳細の「ここを切り抜く」＝狙い撃ち（S3）。導線転換で +1 クリックになった側 */
	detailClip: "detail_clip",
	/**
	 * 作成画面に留まったままの2本目以降。遷移を伴わないため URL には現れず、実行時に立てる。
	 * 下書きキューを進む場合と素の連続作成の区別は from_draft が持つ
	 * （後者は下書きを消化済みで from_draft=false になる）
	 */
	queueContinue: "queue_continue",
	/** 直リンク・ブックマーク・未知の値。(not set) は本計器の導入前を意味する */
	unknown: "unknown",
} as const;

export type CreateEntry = (typeof CREATE_ENTRY)[keyof typeof CREATE_ENTRY];

/** 入口を作成画面へ運ぶクエリキー */
export const CREATE_ENTRY_PARAM = "entry";

const KNOWN_ENTRIES: readonly string[] = Object.values(CREATE_ENTRY);

/** クエリ由来の入口を既知の値へ畳む（未知・未指定は unknown） */
export function parseCreateEntry(value: string | undefined): CreateEntry {
	return value !== undefined && KNOWN_ENTRIES.includes(value)
		? (value as CreateEntry)
		: CREATE_ENTRY.unknown;
}
