/**
 * Discord guild メンバーシップの日次同期（better-auth の session enrich から呼ぶ）。
 *
 * 成功時のみ users コレクションの flags / dailyButtonLimit を best-effort で更新し、
 * **更新後の値を返す**（引数は変異しない）。失敗時・対象日でない場合は受け取った userData をそのまま返す。
 */
import { type FirestoreUserData, isValidGuildMember } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { warn } from "@/lib/logger";
import { calculateDailyLimit, getJSTDateString, hasDateChangedJST } from "@/lib/rate-limit-utils";
import { fetchDiscordGuildMembership } from "./discord-guild";
import { firestoreOps } from "./firestore-adapter";

// better-auth の標準モデル(account 等)へのアクセスはアダプタ境界(firestoreOps)を共有する。
// 直接 getFirestore().collection("ba_account") を叩くと Cloud SQL 差し替え時の局所性が崩れるため。
const ops = firestoreOps();

/** account モデルから Discord 連携の account ID を探す（アダプタ経由）。トークン自体は読まない */
async function findDiscordAccountId(betterAuthUserId: string): Promise<string | undefined> {
	const accounts = await ops.findMany({
		model: "account",
		where: [{ field: "userId", value: betterAuthUserId, operator: "eq", connector: "AND" }],
	});
	const discord = accounts.find((acc) => acc.providerId === "discord");
	return typeof discord?.id === "string" ? discord.id : undefined;
}

/**
 * 有効な Discord アクセストークンを better-auth の getAccessToken で取得する。
 * 失効していて refresh token があれば refresh し、新しいトークンを better-auth が ba_account へ書き戻す。
 * refresh token が無ければ失効したトークンがそのまま返る（呼び出し側で expiresAt を見る）。
 * @throws refresh 失敗・account 不一致（better-auth の APIError）
 */
async function getValidDiscordAccessToken(
	betterAuthUserId: string,
	accountId: string,
): Promise<{ accessToken?: string; expiresAt?: Date }> {
	// auth.ts → enrich-session → guild-sync の循環を避けるため動的 import（lib/auth/server.ts と同じ方式）
	const { auth } = await import("./auth");
	const tokens = await auth.api.getAccessToken({ body: { accountId, userId: betterAuthUserId } });
	return { accessToken: tokens.accessToken, expiresAt: tokens.accessTokenExpiresAt };
}

/** 同期を諦めて前回値を維持した理由（`reason` は監視のフィルタ対象＝英語の固定値） */
type GuildSyncSkipReason =
	| "token_missing"
	| "token_refresh_failed"
	| "token_expired"
	| "membership_fetch_failed"
	| "sync_failed";

/**
 * 同期スキップを本番でも warn に出す（無音で前回値を使い続けない）。
 * 失敗時は lastGuildCheckDate を進めないため、enrich のたび（cookieCache 切れごと）に再試行・再ログされる。
 * `token_expired`（失効済みかつ refresh token 無し）は再ログインまで解消しない定常状態なので、日をまたいで出続ける。
 * `token_refresh_failed` は refresh token の失効・取り消しか Discord 側の一時障害（error で見分ける）。
 */
function warnGuildSyncSkipped(reason: GuildSyncSkipReason, discordId: string, err?: unknown): void {
	warn("better-auth: guild 同期をスキップ（前回値を維持）", {
		reason,
		discordId,
		...(err === undefined ? {} : { error: err }),
	});
}

/**
 * 日次 guild チェック（best-effort）。成功時のみ users の flags / dailyButtonLimit を更新し、
 * **更新後の値を返す**（引数は変異しない）。失敗時・対象日でない場合は受け取った userData をそのまま返す。
 * 失敗は throw せず、本番でも warn に出す（`warnGuildSyncSkipped`）。
 */
export async function refreshGuildStatusIfNeeded(
	discordId: string,
	betterAuthUserId: string,
	userData: FirestoreUserData,
): Promise<FirestoreUserData> {
	if (!hasDateChangedJST(userData.flags?.lastGuildCheckDate)) return userData;
	try {
		const accountId = await findDiscordAccountId(betterAuthUserId);
		if (!accountId) {
			warnGuildSyncSkipped("token_missing", discordId);
			return userData;
		}
		let token: { accessToken?: string; expiresAt?: Date };
		try {
			token = await getValidDiscordAccessToken(betterAuthUserId, accountId);
		} catch (err) {
			warnGuildSyncSkipped("token_refresh_failed", discordId, err);
			return userData;
		}
		if (!token.accessToken) {
			warnGuildSyncSkipped("token_missing", discordId);
			return userData;
		}
		// refresh 後も失効のまま＝refresh token が無い。Discord API は 401 が確定しているため呼ばない
		if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
			warnGuildSyncSkipped("token_expired", discordId);
			return userData;
		}
		const guildMembership = await fetchDiscordGuildMembership(token.accessToken, discordId);
		// null は API 呼び出し自体の失敗（トークン失効・レート制限等）を示す。
		// 「非メンバー確定」と取り違えて false を書き込むと、以後ずっと復旧できなくなるため
		// 失敗時は判定を更新せず現状の userData をそのまま維持する。
		if (!guildMembership) {
			warnGuildSyncSkipped("membership_fetch_failed", discordId);
			return userData;
		}
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
		warnGuildSyncSkipped("sync_failed", discordId, err);
		return userData;
	}
}
