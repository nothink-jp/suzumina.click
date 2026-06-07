import { describe, expect, it } from "vitest";
import { resolveAuthBaseURL } from "../better-auth-client";

/**
 * SPR-157 回帰: better-auth クライアントの baseURL は **必ず `/api/ba-auth`** を指す。
 * baseURL を渡さないと better-auth クライアントは既定 `/api/auth` にフォールバックし、
 * NextAuth の catch-all（`/api/auth/[...nextauth]`）と衝突して get-session が 400 になり、
 * betterauth フラグ下で全クライアントコンポーネントがログイン後も未認証扱いになる。
 */
describe("resolveAuthBaseURL", () => {
	it("ブラウザでは window.origin + /api/ba-auth を返す（既定 /api/auth に落ちない）", () => {
		const url = resolveAuthBaseURL();
		expect(url).toBe(`${window.location.origin}/api/ba-auth`);
		// 回帰の本体: NextAuth と衝突する素の /api/auth を指していないこと
		expect(url?.endsWith("/api/ba-auth")).toBe(true);
		expect(new URL(url ?? "").pathname).not.toBe("/api/auth");
	});
});
