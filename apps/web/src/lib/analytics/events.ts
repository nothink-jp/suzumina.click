/**
 * GA4 カスタムイベントの語彙（SPR-149: 成功指標の計器化）。
 *
 * 送信は sendGoogleAnalyticsEvent（lib/consent/）に一本化し、イベント名・パラメータ形は
 * この層でのみ定義する（呼び出し側に文字列を組ませない＝計測語彙のドリフト防止）。
 * SPR-299 以降、同送信関数は consent ゲートを持たない。同意の有無で送信可否は変わらず、
 * Cookie/識別子を保存するかどうかだけが GA4 の consent mode 側で切り替わる。
 *
 * オーナー除外はイベント抑止ではなく traffic_type=internal のタグ付けで行う（internal-traffic.ts）。
 * 成功指標「労力あたりの作成ボタン数」はオーナー自身の行動が主データのため、抑止すると測れなくなる。
 */

import { sendGoogleAnalyticsEvent } from "@/lib/consent/google-consent-mode";
import type { CreateEntry } from "./create-entry";
import type { HomeSection } from "./home-section";

/** GA4 のイベントパラメータ値上限（100文字）に収める */
const MAX_PARAM_LENGTH = 100;

/**
 * ボタン再生。呼び出し元は usePlayCount.handlePlay のデデュープ通過後
 * （30秒デバウンス）＝ stats.playCount のインクリメントと同じ意味論。
 */
export function trackPlayButton(audioButtonId: string): void {
	sendGoogleAnalyticsEvent("play_button", { audio_button_id: audioButtonId });
}

/** 作成ファネル: 送信開始（バリデーション通過後） */
export function trackCreateStart(input: {
	videoId: string;
	fromDraft: boolean;
	entry: CreateEntry;
}): void {
	sendGoogleAnalyticsEvent("create_start", {
		video_id: input.videoId,
		from_draft: input.fromDraft,
		create_entry: input.entry,
	});
}

/**
 * 作成ファネル: 成功。from_draft は SPR-146 下書きフローの効果測定に、
 * create_entry は視聴起点への導線転換（PR #892）の当否判定に使う（SPR-296）
 */
export function trackCreateSuccess(input: {
	audioButtonId: string;
	videoId: string;
	fromDraft: boolean;
	entry: CreateEntry;
}): void {
	sendGoogleAnalyticsEvent("create_success", {
		audio_button_id: input.audioButtonId,
		video_id: input.videoId,
		from_draft: input.fromDraft,
		create_entry: input.entry,
	});
}

/** 作成ファネル: 失敗（理由つき。導線・UI の詰まり所を特定する） */
export function trackCreateError(videoId: string, reason: string): void {
	sendGoogleAnalyticsEvent("create_error", {
		video_id: videoId,
		reason: reason.slice(0, MAX_PARAM_LENGTH),
	});
}

/** お気に入りトグル。追加/削除でイベント名を分ける（GA4 上でそのまま数えられるように） */
export function trackFavoriteToggle(audioButtonId: string, isFavorited: boolean): void {
	sendGoogleAnalyticsEvent(isFavorited ? "add_to_favorite" : "remove_from_favorite", {
		audio_button_id: audioButtonId,
	});
}

/** 配信中マーキングの下書き作成（SPR-146）。has_player_time=false は壁時計のみの劣化モード */
export function trackMarkDraft(videoId: string, hasPlayerTime: boolean): void {
	sendGoogleAnalyticsEvent("mark_draft", {
		video_id: videoId,
		has_player_time: hasPlayerTime,
	});
}

/**
 * AI候補生成（SPR-148）。success=false の reason は Server Action のエラー文言
 * （「ログインが必要です」等）。Phase 2（マーク時事前生成）投資判断の実測データ。
 */
export function trackSuggestionGenerate(input: {
	videoId: string;
	success: boolean;
	reason?: string;
}): void {
	sendGoogleAnalyticsEvent("suggestion_generate", {
		video_id: input.videoId,
		success: input.success,
		...(input.reason ? { reason: input.reason.slice(0, MAX_PARAM_LENGTH) } : {}),
	});
}

/**
 * 動画一覧のビュー切替タブのクリック（SPR-305）。
 * 「拾える配信」(pickable) が S4「どの配信を拾うか決める」の入口として機能しているかを見る。
 * tab の語彙の正本は app/videos/components/video-view-tabs.tsx の VideoViewTab
 * （provider と同じく、語彙を持つ層が別にあるため型はここで縛らない）。
 * クリックのみを数える＝リロードや戻るでは増えない（consent_update をクリック数と
 * 読み違えた SPR-149 の反省）。アクティブなタブの再クリックは数に入る
 */
export function trackVideoTabSelect(tab: string): void {
	sendGoogleAnalyticsEvent("video_tab_select", { video_tab: tab });
}

/**
 * トップページのセクションが画面の上半分に入った（1 ページ表示につき各セクション 1 回）。
 * 到達率の分母は section_view{hero} ではなく、トップの page_view にする。hero は通常は表示直後に届くが、
 * リロードや「戻る」でスクロール位置が復元された訪問・アンカー付きの流入では hero が画面の上半分に入らず、
 * 下のセクションだけが届く（hero を分母にすると到達率が 100% を超える）。
 * GA4 拡張計測の scroll は 90% 到達の 1 点しか取れず、どこで離脱したかが見えなかったため足した
 */
export function trackSectionView(section: HomeSection): void {
	sendGoogleAnalyticsEvent("section_view", { section });
}

/**
 * トップページのセクション内のリンククリック。destination は toLinkDestination で丸めた行き先
 * （サイト内は `/works/:id` のようなパス、外部はホスト名）。GA4 拡張計測の click は外部リンクだけで
 * セクションも分からないため、サイト内の導線はこれで測る
 */
export function trackSectionClick(section: HomeSection, destination: string): void {
	sendGoogleAnalyticsEvent("section_click", {
		section,
		destination: destination.slice(0, MAX_PARAM_LENGTH),
	});
}

/** AI候補の採用（タイトルクリック or タグクリック）。target で内訳を分ける */
export function trackSuggestionApply(videoId: string, target: "title" | "tag"): void {
	sendGoogleAnalyticsEvent("suggestion_apply", { video_id: videoId, target });
}

/**
 * ログインファネル: ボタン押下（OAuth プロバイダへのリダイレクト直前）。
 * ページ遷移前の最後のタイミングで送るため、他イベントより取りこぼしのリスクが高い点に留意。
 */
export function trackLoginStart(provider: string): void {
	sendGoogleAnalyticsEvent("login_start", { provider });
}

/** ログインファネル: OAuth コールバック後、セッションが初めて確立した時点（成功） */
export function trackLoginSuccess(provider: string): void {
	sendGoogleAnalyticsEvent("login_success", { provider });
}

/** ログインファネル: OAuth コールバックがエラーで返ってきた場合（reason=better-auth のエラーコード） */
export function trackLoginError(reason: string): void {
	sendGoogleAnalyticsEvent("login_error", { reason: reason.slice(0, MAX_PARAM_LENGTH) });
}

// SPR-276: 動画ユーザータグ機能の撤去に伴い trackUserTagEditOpen / trackUserTagSave を削除した。
// `tag_count` の GA4 カスタムディメンション宣言（ga4-custom-dimensions.json）は**残す**。
// GA4 のディメンションは API で削除できずアーカイブのみで、宣言から外すと
// `pnpm check:ga4-drift` が「管理外」として恒久的に警告し続けるため（CLAUDE.md）。
