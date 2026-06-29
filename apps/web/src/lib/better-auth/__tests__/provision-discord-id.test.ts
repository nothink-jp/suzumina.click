import { describe, expect, it, vi } from "vitest";
import { provisionDiscordIdOnAuthUser } from "../on-first-signup";

/**
 * better-auth 1.6.21+ の破壊的変更（input:false フィールドは OAuth profile sync で無視される）への
 * 回帰ガード。account.create フックが better-auth user の discordId を server 側で充填することを固定する。
 * これが欠けると enrich-session が appUser を null にし、新規ユーザーが認証不能になる。
 */
describe("provisionDiscordIdOnAuthUser", () => {
	const account = { providerId: "discord", accountId: "discord-123", userId: "ba-user-1" };

	it("ba_user.discordId を accountId（Discord user id）で update する", async () => {
		const update = vi.fn().mockResolvedValue(null);
		await provisionDiscordIdOnAuthUser(account, { update });
		expect(update).toHaveBeenCalledWith({
			model: "user",
			where: [{ field: "id", value: "ba-user-1", operator: "eq", connector: "AND" }],
			update: { discordId: "discord-123" },
		});
	});

	it("discord 以外のプロバイダでは何もしない", async () => {
		const update = vi.fn();
		await provisionDiscordIdOnAuthUser({ ...account, providerId: "github" }, { update });
		expect(update).not.toHaveBeenCalled();
	});

	it("accountId / userId が欠けていれば何もしない", async () => {
		const update = vi.fn();
		await provisionDiscordIdOnAuthUser({ ...account, accountId: "" }, { update });
		await provisionDiscordIdOnAuthUser({ ...account, userId: "" }, { update });
		expect(update).not.toHaveBeenCalled();
	});

	it("update 失敗でも throw せずサインアップを止めない（best-effort）", async () => {
		const update = vi.fn().mockRejectedValue(new Error("firestore down"));
		await expect(provisionDiscordIdOnAuthUser(account, { update })).resolves.toBeUndefined();
	});
});
