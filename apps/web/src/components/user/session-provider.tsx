"use client";

/**
 * 認証セッションプロバイダ（SPR-158 Phase 3）。
 * better-auth の client フックは React Context Provider を必要としない（nanostores ベース）ため素通し。
 * レイアウト側の構造を変えないために薄いラッパーとして残す。
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
