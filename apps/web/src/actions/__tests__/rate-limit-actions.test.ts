import type { UserSession } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/button-rate-limit";
import { getUserRateLimitInfo } from "../rate-limit-actions";

vi.mock("@/lib/auth/server");
vi.mock("@/lib/button-rate-limit", () => ({
	checkRateLimit: vi.fn(),
}));

const rateLimitResult = {
	canCreate: true,
	current: 3,
	limit: 10,
	remaining: 7,
	isFamilyMember: false,
};

describe("getUserRateLimitInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(checkRateLimit).mockResolvedValue(rateLimitResult);
	});

	it("ログイン中ユーザー本人の制限情報を返すこと", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue({ discordId: "self" } as UserSession);

		const result = await getUserRateLimitInfo();

		expect(result).toEqual(rateLimitResult);
		expect(checkRateLimit).toHaveBeenCalledWith("self");
	});

	it("引数で他人の userId を渡されてもセッション本人の分しか参照しないこと", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue({ discordId: "self" } as UserSession);

		// Server Action は任意の引数で POST できるため、型を外して攻撃者の呼び出しを再現する
		await (getUserRateLimitInfo as (...args: unknown[]) => Promise<unknown>)("other-user");

		expect(checkRateLimit).toHaveBeenCalledTimes(1);
		expect(checkRateLimit).toHaveBeenCalledWith("self");
	});

	it("未ログインなら null を返し Firestore を読まないこと", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(null);

		await expect(getUserRateLimitInfo()).resolves.toBeNull();
		expect(checkRateLimit).not.toHaveBeenCalled();
	});

	it("取得に失敗したら null を返すこと", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue({ discordId: "self" } as UserSession);
		vi.mocked(checkRateLimit).mockRejectedValue(new Error("Firestore error"));

		await expect(getUserRateLimitInfo()).resolves.toBeNull();
	});
});
