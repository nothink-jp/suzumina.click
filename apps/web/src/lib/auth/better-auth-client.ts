/**
 * better-auth クライアント（SPR-157 Phase 2 / クライアント側）
 *
 * `authClient` 自体は **export しない**。better-auth が推論する client 型は pnpm パス上の内部型を
 * 参照するため declaration 出力で名前付けできず TS2883 になる（base.json の declaration:true）。
 * 利用側には**明示的な戻り型**を持つラッパーだけを公開し、推論型の漏れを防ぐ。
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
 * 現在のセッションの appUser（アプリ UserSession）を返す client フック。未認証は null。
 * customSession の戻り（{ user, session, appUser }）から appUser を取り出す。
 */
export function useBetterAuthAppUser(): UserSession | null {
	const { data } = authClient.useSession();
	const appUser = (data as { appUser?: UserSession | null } | null)?.appUser;
	return appUser ?? null;
}
