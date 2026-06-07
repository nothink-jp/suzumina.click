"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { AUTH_PROVIDER } from "@/lib/auth/provider";

/**
 * 認証セッションプロバイダ（SPR-157 Phase 2）。
 * NextAuth は Context Provider が必要。better-auth の client フックは Provider 不要なので素通し。
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
	if (AUTH_PROVIDER === "betterauth") {
		return <>{children}</>;
	}
	return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
