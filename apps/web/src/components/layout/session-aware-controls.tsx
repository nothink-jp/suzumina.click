"use client";

import { useSessionState } from "@/lib/auth/client";
import AuthButton from "../user/auth-button";
import MobileMenu from "./mobile-menu";

/**
 * ヘッダーの認証表示（ログインボタン / ユーザーメニュー / モバイルメニュー）を client 島として描画する。
 *
 * session を SSR で読まないのが要点。これにより public ページ（`/`・一覧）の SSR 出力から per-user が
 * 消え、Cloudflare のエッジキャッシュ（next.config の `public, s-maxage`）に表示名・アバターが
 * 焼き付かなくなる。旧実装は SiteHeader 内の async server component が `getCurrentUser()` を呼んでおり、
 * 解決済みヘッダーごと CDN にキャッシュされ、ログアウト後も古いログイン状態が残っていた
 * （かつ別ユーザーへ表示名が配信されうるクロスユーザー漏洩クラス）。詳細ページの SPR-226 と同じ
 * client island 化の方針に揃える。
 */
export function SessionAwareControls() {
	const { user, isPending } = useSessionState();

	// セッション解決前は描画しない。ヘッダーの min-h で枠は確保済みなので CLS=0。
	// fallback を null にすることで、ログイン済みユーザーに一瞬「ログイン」ボタンが出るちらつきを防ぐ。
	if (isPending) {
		return null;
	}

	return (
		<>
			{/* 認証ボタン（デスクトップ） */}
			<div className="hidden md:flex">
				<AuthButton user={user} />
			</div>

			{/* モバイルメニュー */}
			<MobileMenu user={user} />
		</>
	);
}
