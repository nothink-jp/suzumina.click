/**
 * クライアント側 認証抽象（SPR-158 Phase 3 / better-auth 唯一）
 *
 * 互換のため NextAuth と同じ形（`{ data: { user } | null }`）を返す `useSession()` を提供。
 * クライアントコンポーネントは better-auth client を直接 import せず、この `useSession` を使う。
 */
"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { useBetterAuthAppUser } from "./better-auth-client";

/** セッション形（呼び出し側は `data?.user` を参照する） */
export interface CompatSession {
	data: { user: UserSession | null } | null;
}

export function useSession(): CompatSession {
	const appUser = useBetterAuthAppUser();
	return { data: appUser ? { user: appUser } : null };
}
