/**
 * Discord guild メンバーシップの日次同期（better-auth の session enrich から呼ぶ）。
 *
 * 成功時のみ users コレクションの flags / dailyButtonLimit を best-effort で更新し、
 * **更新後の値を返す**（引数は変異しない）。失敗時・対象日でない場合は受け取った userData をそのまま返す。
 */
import { type FirestoreUserData, isValidGuildMember } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";
import { calculateDailyLimit, getJSTDateString, hasDateChangedJST } from "@/lib/rate-limit-utils";
import { fetchDiscordGuildMembership } from "./discord-guild";
import { firestoreOps } from "./firestore-adapter";

const isDev = process.env.NODE_ENV !== "production";

// better-auth の標準モデル(account 等)へのアクセスはアダプタ境界(firestoreOps)を共有する。
// 直接 getFirestore().collection("ba_account") を叩くと Cloud SQL 差し替え時の局所性が崩れるため。
const ops = firestoreOps();

/** account モデルから Discord アクセストークンを取得（日次 guild チェック用・best-effort / アダプタ経由） */
async function getDiscordAccessToken(betterAuthUserId: string): Promise<string | undefined> {
	try {
		const accounts = await ops.findMany({
			model: "account",
			where: [{ field: "userId", value: betterAuthUserId, operator: "eq", connector: "AND" }],
		});
		for (const acc of accounts) {
			const providerId = acc.providerId as string | undefined;
			const accessToken = acc.accessToken as string | undefined;
			if (providerId === "discord" && accessToken) return accessToken;
		}
	} catch {
		// トークン取得失敗時は日次チェックを諦め、前回値を使う
	}
	return undefined;
}

/**
 * 日次 guild チェック（best-effort）。成功時のみ users の flags / dailyButtonLimit を更新し、
 * **更新後の値を返す**（引数は変異しない）。失敗時・対象日でない場合は受け取った userData をそのまま返す。
 */
export async function refreshGuildStatusIfNeeded(
	discordId: string,
	betterAuthUserId: string,
	userData: FirestoreUserData,
): Promise<FirestoreUserData> {
	if (!hasDateChangedJST(userData.flags?.lastGuildCheckDate)) return userData;
	const token = await getDiscordAccessToken(betterAuthUserId);
	if (!token) return userData;
	try {
		const guildMembership = await fetchDiscordGuildMembership(token, discordId);
		// null は API 呼び出し自体の失敗（トークン失効・レート制限等）を示す。
		// 「非メンバー確定」と取り違えて false を書き込むと、以後ずっと復旧できなくなるため
		// 失敗時は判定を更新せず現状の userData をそのまま維持する。
		if (!guildMembership) return userData;
		const isFamilyMember = isValidGuildMember(guildMembership);
		const today = getJSTDateString();
		const newLimit = calculateDailyLimit({ isFamilyMember });
		// 日付が変わっていればカウントをリセット
		const dateChanged = userData.dailyButtonLimit?.date !== today;
		await getFirestore()
			.collection("users")
			.doc(discordId)
			.update({
				"flags.isFamilyMember": isFamilyMember,
				"flags.lastGuildCheckDate": today,
				"dailyButtonLimit.limit": newLimit,
				"dailyButtonLimit.guildChecked": true,
				...(dateChanged ? { "dailyButtonLimit.date": today, "dailyButtonLimit.count": 0 } : {}),
			});
		// 変異せず更新後のコピーを返す
		return {
			...userData,
			flags: { ...userData.flags, isFamilyMember, lastGuildCheckDate: today },
			dailyButtonLimit: userData.dailyButtonLimit
				? {
						...userData.dailyButtonLimit,
						limit: newLimit,
						guildChecked: true,
						...(dateChanged ? { date: today, count: 0 } : {}),
					}
				: userData.dailyButtonLimit,
		};
	} catch (err) {
		if (isDev) logError("better-auth: guild check failed", { discordId, err });
		return userData;
	}
}
