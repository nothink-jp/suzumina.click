/**
 * サーバ認証 mock の共通ヘルパ（SPR-168/170）。
 *
 * テスト側で `vi.mock("@/lib/auth/server")`（bare）を宣言した上で、本ヘルパで戻り値を設定する。
 * 認証抽象（`@/lib/auth/server`）だけを mock し、プロバイダ（better-auth）を直接 mock しないことで、
 * 認証実装の差し替えでテストを触らずに済む。client 側は `@/test-utils/auth` を使う。
 */
import type { UserSession } from "@suzumina.click/shared-types";
import { vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";

/** サーバ認証抽象 `getCurrentUser()` の戻りを設定する（UserSession の部分形を許容）。 */
export function mockCurrentUser(user: Partial<UserSession> | null): void {
	vi.mocked(getCurrentUser).mockResolvedValue(user as UserSession | null);
}
