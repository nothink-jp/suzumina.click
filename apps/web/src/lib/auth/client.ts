/**
 * クライアント側 認証抽象（better-auth 唯一）
 *
 * ログイン中のアプリ UserSession（未認証は null）を直接返す `useSession()` を提供。
 * クライアントコンポーネントは better-auth client を直接 import せず、この `useSession` を使う。
 */
"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import {
	signOutClient,
	useBetterAuthAppUser,
	useBetterAuthSessionState,
} from "./better-auth-client";

export function useSession(): UserSession | null {
	return useBetterAuthAppUser();
}

/**
 * `useSession()` に解決中フラグを足した版。セッション解決前（isPending）と未認証（user=null）を
 * 区別したい呼び出し側で使う。
 */
export function useSessionState(): { user: UserSession | null; isPending: boolean } {
	return useBetterAuthSessionState();
}

/**
 * クライアント側サインアウト。サーバーのセッション cookie 失効に加えて client セッションストアも
 * クリアするため、useSession() を参照する表示（ヘッダー等）がリロード無しで更新される。
 */
export async function signOut(): Promise<void> {
	return signOutClient();
}
