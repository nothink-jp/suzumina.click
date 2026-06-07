/**
 * クライアント側 認証抽象（SPR-157 Phase 2）
 *
 * NextAuth / better-auth どちらでも **NextAuth 互換の形**（`{ data: { user } | null }`）を返す `useSession()` を提供。
 * クライアントコンポーネントは `next-auth/react` を直接 import せず、この `useSession` を使う。
 * 実体は `AUTH_PROVIDER` フラグで切替（フラグはビルド時定数なので hook 呼び出し順は安定）。
 */
"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { useSession as useNextAuthSession } from "next-auth/react";
import { useBetterAuthAppUser } from "./better-auth-client";
import { AUTH_PROVIDER } from "./provider";

/** NextAuth 互換のセッション形（呼び出し側は `data?.user` を参照する） */
export interface CompatSession {
	data: { user: UserSession | null } | null;
}

function useNextAuthCompat(): CompatSession {
	const { data } = useNextAuthSession();
	return { data: data ? { user: (data.user as UserSession | undefined) ?? null } : null };
}

function useBetterAuthCompat(): CompatSession {
	const appUser = useBetterAuthAppUser();
	return { data: appUser ? { user: appUser } : null };
}

// フラグはビルド時定数。実装をモジュールロード時に確定し、毎レンダーで同じ hook を呼ぶ。
const useSessionImpl = AUTH_PROVIDER === "betterauth" ? useBetterAuthCompat : useNextAuthCompat;

export function useSession(): CompatSession {
	return useSessionImpl();
}
