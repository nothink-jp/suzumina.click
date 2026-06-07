/**
 * クライアント側 認証抽象（better-auth 唯一）
 *
 * ログイン中のアプリ UserSession（未認証は null）を直接返す `useSession()` を提供。
 * クライアントコンポーネントは better-auth client を直接 import せず、この `useSession` を使う。
 */
"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { useBetterAuthAppUser } from "./better-auth-client";

export function useSession(): UserSession | null {
	return useBetterAuthAppUser();
}
