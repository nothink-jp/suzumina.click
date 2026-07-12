/**
 * AudioButtonDraft Type Definitions（SPR-146 第1段）
 *
 * 配信視聴中の「ここ！」マークを保持する下書き。正本は生の捕捉信号
 * （playerTime / markedAt）であり、開始秒の推奨値は表示時に導出する
 * （導出値を保存すると生信号との二重管理になるため保存しない）。
 *
 * Entity ゲート（CLAUDE.md §0）に従い、Entity 化せず plain type + 純関数に留める。
 */

/**
 * プリロール定数（秒）。
 * SPR-145 実測: 発言を聞いてからマークするまでの人間の反応遅れは 0〜13.8 秒。
 * 下書きの推奨開始位置はクリック位置からこの秒数だけ巻き戻す（仕上げは前方 trim のみで完結）。
 */
export const AUDIO_BUTTON_DRAFT_PREROLL_SECONDS = 15;

/**
 * Firestore document structure（users/{discordId}/buttonDrafts/{draftId}）
 *
 * 日時フィールドは Firestore Timestamp で保存する（CLAUDE.md §1 新規コレクション規約）。
 * shared-types は Firestore SDK に依存しないため型上は unknown。
 */
export interface AudioButtonDraftDocument {
	videoId: string;
	/** 表示用に非正規化（audioButtons.videoTitle と同じ前例。タイトル変更の追従はしない） */
	videoTitle: string;
	/**
	 * マーク時のライブプレイヤー再生位置（秒）= VOD 秒の主信号（SPR-145 実測で ±1s 一致）。
	 * プレイヤーから取得できなかった場合は null（壁時計のみモード）。
	 */
	playerTime: number | null;
	/** マーク時の壁時計（クライアント時刻）。検算・playerTime 欠損時のフォールバック用に常時併記保存 */
	markedAt: unknown; // Firestore Timestamp
	createdAt: unknown; // Firestore Timestamp（サーバ時刻）
}

/**
 * RSC 境界を越えるプレーンオブジェクト（日時は ISO string）
 */
export interface AudioButtonDraft {
	id: string;
	videoId: string;
	videoTitle: string;
	playerTime: number | null;
	markedAt: string;
	createdAt: string;
	/** 仕上げ画面へ渡す推奨開始秒（playerTime − プリロール、0 未満は 0） */
	suggestedStartTime: number;
}

/**
 * 下書き作成入力（Server Action の引数）
 */
export interface CreateAudioButtonDraftInput {
	videoId: string;
	videoTitle: string;
	playerTime: number | null;
	/** クリック時の壁時計（epoch ms・クライアント時刻） */
	markedAtMs: number;
}

/**
 * 推奨開始秒を導出する。playerTime が無い場合は 0（仕上げ側で頭出し）。
 */
export function calculateDraftSuggestedStartTime(playerTime: number | null): number {
	if (playerTime == null || !Number.isFinite(playerTime)) {
		return 0;
	}
	return Math.max(0, Math.floor(playerTime) - AUDIO_BUTTON_DRAFT_PREROLL_SECONDS);
}
