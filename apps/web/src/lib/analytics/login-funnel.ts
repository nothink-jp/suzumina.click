/**
 * ログインファネルの「開始→結果」を跨いで対応付けるための一時マーカー（sessionStorage）。
 *
 * ログイン開始はボタン押下→フォーム送信→OAuth プロバイダへのフルページ遷移のため、
 * 開始と結果（成功/エラーページ着地）は別ページロードの別 React ツリーで検知する。
 * このマーカーで「直前に自分が開始したログイン試行の結果である」ことを識別し、
 * 既にログイン済みユーザーの通常ページ読み込みで login_success を誤発火させない。
 */

const STORAGE_KEY = "suzumina-login-flow-pending";

/** ログイン開始時（ボタン押下）に呼ぶ */
export function markLoginFlowStarted(): void {
	try {
		window.sessionStorage.setItem(STORAGE_KEY, "1");
	} catch {
		// sessionStorage 不可の環境では諦める（login_success の誤発火防止が効かなくなるだけで許容）
	}
}

/** 結果側（成功検知 / エラーページ）で一度だけ呼ぶ。印があれば消費して true を返す */
export function consumeLoginFlowPending(): boolean {
	try {
		const pending = window.sessionStorage.getItem(STORAGE_KEY) === "1";
		window.sessionStorage.removeItem(STORAGE_KEY);
		return pending;
	} catch {
		return false;
	}
}
