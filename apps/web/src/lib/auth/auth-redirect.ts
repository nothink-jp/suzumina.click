/**
 * ログイン/ログアウト後の遷移先を決めるための純関数ヘルパ（client/server 両用・副作用なし）。
 *
 * 設計意図:
 * - ログイン/ログアウトとも「公開ページなら現在地に留まり、認証必須ページならトップへ」を一貫させる。
 * - `isAuthGatedPath` は **UX 上のヒントであって認可境界ではない**。実際のアクセス制御は各 page.tsx の
 *   `redirect()` / `ProtectedRoute` が正本（＝セキュリティ境界）。この一覧が陳腐化しても最悪
 *   「ログアウト後に保護ページへ留まり、ページ側 redirect で /auth/signin に飛ぶ」だけで、安全性は
 *   損なわれない（graceful degradation）。新たな保護ページを足したらここにも追記するのが望ましいが、
 *   忘れても壊れない位置づけにしてある（軸1: 系の劣化を最小化）。
 */

/**
 * 未ログインユーザーを弾く（ログアウト後に留まれない）ページか。
 * 正本は各ページの redirect。ここは遷移先決定のための best-effort な写し。
 */
export function isAuthGatedPath(pathname: string): boolean {
	return (
		pathname === "/settings" ||
		pathname.startsWith("/settings/") ||
		pathname === "/favorites" ||
		pathname.startsWith("/favorites/") ||
		pathname === "/users/me" ||
		pathname.startsWith("/users/me/") ||
		pathname === "/buttons/create" ||
		/^\/buttons\/[^/]+\/edit$/.test(pathname)
	);
}

/**
 * OAuth コールバック等に使う相対パスのサニタイズ。同一オリジンの相対パスのみ許可し、
 * それ以外（絶対 URL・プロトコル相対 `//`・バックスラッシュ細工）は "/" に倒す。
 * オープンリダイレクト対策（callbackUrl は外部から細工されうるため信頼しない）。
 */
export function sanitizeRelativePath(path: string | undefined | null): string {
	if (!path?.startsWith("/") || path.startsWith("//")) {
		return "/";
	}
	if (path.includes("\\")) {
		return "/";
	}
	return path;
}
