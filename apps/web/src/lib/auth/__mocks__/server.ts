/**
 * `@/lib/auth/server` の手動 mock（Vitest）。
 *
 * テストは `vi.mock("@/lib/auth/server")` で本ファイルを使い、戻り値は
 * `@/test-utils/auth` の `mockCurrentUser()` で設定する。プロバイダ（better-auth）に
 * 依存しない抽象 mock に統一することで、認証実装の差し替えでテストを触らずに済む（SPR-168/170）。
 */
import { vi } from "vitest";

export const getCurrentUser = vi.fn(async () => null);
export const signInWithDiscord = vi.fn(async () => {});
export const signOutCurrent = vi.fn(async () => {});
