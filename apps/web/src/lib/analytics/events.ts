/**
 * GA4 カスタムイベントの語彙（SPR-149: 成功指標の計器化）。
 *
 * 送信は consent ゲート内蔵の sendGoogleAnalyticsEvent（lib/consent/）に一本化し、
 * イベント名・パラメータ形はこの層でのみ定義する（呼び出し側に文字列を組ませない＝計測語彙のドリフト防止）。
 *
 * オーナー除外はイベント抑止ではなく traffic_type=internal のタグ付けで行う（internal-traffic.ts）。
 * 成功指標「労力あたりの作成ボタン数」はオーナー自身の行動が主データのため、抑止すると測れなくなる。
 */

import { sendGoogleAnalyticsEvent } from "@/lib/consent/google-consent-mode";

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
export function trackCreateStart(videoId: string, fromDraft: boolean): void {
	sendGoogleAnalyticsEvent("create_start", { video_id: videoId, from_draft: fromDraft });
}

/** 作成ファネル: 成功。from_draft は SPR-146 下書きフローの効果測定に使う */
export function trackCreateSuccess(input: {
	audioButtonId: string;
	videoId: string;
	fromDraft: boolean;
}): void {
	sendGoogleAnalyticsEvent("create_success", {
		audio_button_id: input.audioButtonId,
		video_id: input.videoId,
		from_draft: input.fromDraft,
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
