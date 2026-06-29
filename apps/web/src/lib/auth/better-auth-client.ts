/**
 * better-auth クライアント（SPR-158 Phase 3 / クライアント側）
 *
 * `authClient` 自体は **export しない**。better-auth が推論する client 型は pnpm パス上の内部型を
 * 参照するため declaration 出力で名前付けできず TS2883 になる（base.json の declaration:true）。
 * 利用側には**明示的な戻り型**を持つラッパーだけを公開し、推論型の漏れを防ぐ。
 *
 * better-auth は標準の `/api/auth` にマウント（クライアント既定 basePath と一致・同一オリジン）なので
 * baseURL の明示は不要。
 */
"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { customSessionClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "@/lib/better-auth/auth";

const authClient = createAuthClient({
	plugins: [inferAdditionalFields<Auth>(), customSessionClient<Auth>()],
});

/**
 * セッションの appUser に加えて解決中フラグ（isPending）も返す client フック。
 * 初回ロード時の「未解決 = null」と「未認証 = null」を区別したい呼び出し側（ヘッダー等）が使う。
 */
export function useBetterAuthSessionState(): {
	user: UserSession | null;
	isPending: boolean;
} {
	const { data, isPending } = authClient.useSession();
	return { user: data?.appUser ?? null, isPending };
}

/**
 * 現在のセッションの appUser（アプリ UserSession）を返す client フック。未認証は null。
 * isPending を見ない呼び出し側向けの薄いラッパー。
 */
export function useBetterAuthAppUser(): UserSession | null {
	return useBetterAuthSessionState().user;
}

/**
 * クライアント側サインアウト。better-auth の sign-out エンドポイントを叩いて
 * サーバーのセッション cookie を失効させると同時に、**client セッションストアもクリア**する。
 * これにより useSession() が反応的に null へ更新され、ヘッダー等の表示がリロード無しで切り替わる
 * （サーバーアクションでの signOut は client ストアを無効化できずリロードまで古い状態が残っていた）。
 */
export async function signOutClient(): Promise<void> {
	await authClient.signOut();
}
