/**
 * クライアント認証 mock の共通ヘルパ（SPR-168/170）。
 *
 * テスト側で `vi.mock("@/lib/auth/client")`（bare）を宣言した上で、本ヘルパで戻り値を設定する。
 * 宣言を忘れると useSession が mock 化されず `mockReturnValue is not a function` で落ちる（silently wrong にはならない）。
 * 認証抽象（`@/lib/auth/client`）だけを mock し、プロバイダ（better-auth）を直接 mock しないことで、
 * 認証実装の差し替えでテストを触らずに済む。サーバ側は `@/test-utils/auth-server` を使う
 * （client.ts は "use client" で better-auth client を即時生成するため、node 環境テストへ巻き込まない）。
 */
import type { UserSession } from "@suzumina.click/shared-types";
import { vi } from "vitest";
import { useSession } from "@/lib/auth/client";

// テストは UserSession の一部フィールド（discordId / displayName 等）だけを使うことが多いため、
// 部分形を受け取り内部で UserSession として扱う（テストヘルパ内に cast を局所化）。
type PartialUser = Partial<UserSession> | null;

/** クライアント認証抽象 `useSession()` の戻りを設定する。 */
export function mockUseSession(user: PartialUser): void {
	vi.mocked(useSession).mockReturnValue(user as UserSession | null);
}
