/**
 * エラー値（catch した unknown）をメッセージ文字列にする
 *
 * 文字列が要る箇所（戻り値・Firestore に保存する値・投げ直すエラーのメッセージ・`result.errors`）で使う。
 * ログに渡すだけなら文字列にせず、Error をそのまま payload に入れる
 * （logger が message / stack / cause を展開する。SPR-347）。
 */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
