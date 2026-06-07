/**
 * `@/lib/auth/client` の手動 mock（Vitest）。
 *
 * テストは `vi.mock("@/lib/auth/client")` で本ファイルを使い、戻り値は
 * `@/test-utils/auth` の `mockUseSession()` で設定する（プロバイダ非依存・SPR-168/170）。
 */
import { vi } from "vitest";

export const useSession = vi.fn(() => null);
