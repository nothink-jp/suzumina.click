/**
 * 認証プロバイダの切替フラグ（SPR-157 Phase 2 / 並行稼働）
 *
 * NextAuth と better-auth を env で切替える。クライアント/サーバ双方から同じ値を読むため
 * `NEXT_PUBLIC_` を使う（ビルド時にインライン化される）。未設定時は従来どおり NextAuth。
 * Phase 3 で既定を betterauth に切替える。
 */
export type AuthProvider = "nextauth" | "betterauth";

export const AUTH_PROVIDER: AuthProvider =
	process.env.NEXT_PUBLIC_AUTH_PROVIDER === "betterauth" ? "betterauth" : "nextauth";
