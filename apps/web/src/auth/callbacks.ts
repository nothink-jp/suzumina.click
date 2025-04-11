import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { accounts, db, users } from "../db";
import { getRequiredEnvVar } from "./utils";

/**
 * Discord プロファイルの型定義
 */
interface DiscordProfile extends Profile {
  username?: string;
  image_url?: string;
}

/**
 * アカウントデータ処理用のユーティリティ
 */
function safeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

/**
 * NextAuth.js の認証コールバック関数群
 */
export const callbacks = {
  /**
   * サインイン試行時に呼び出されます
   */
  async signIn({
    account,
    profile,
    email,
    user,
  }: {
    account: Account | null;
    profile?: DiscordProfile;
    email?: string;
    user: { id: string; email?: string | null };
  }): Promise<boolean> {
    // アカウント情報の検証
    if (!account?.access_token || account.provider !== "discord") {
      console.error("Invalid account data for Discord sign in.");
      return false;
    }

    // プロファイルの検証
    if (!profile?.id) {
      console.error("Invalid profile data from Discord.");
      return false;
    }

    try {
      // Discord API でギルドメンバーシップを確認
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to fetch Discord guild data:",
          await response.text(),
        );
        return false;
      }

      const guilds = await response.json();
      const guildId = getRequiredEnvVar("DISCORD_GUILD_ID");

      // ギルドメンバーシップの確認
      const isMember = guilds.some(
        (guild: { id: string }) => guild.id === guildId,
      );

      if (!isMember) {
        console.error(`User is not a member of the required guild: ${guildId}`);
        return false;
      }

      const now = new Date();

      // データベースからユーザーを検索（メールアドレスで）
      const existingUserByEmail = email
        ? await db.query.users.findFirst({
            where: eq(users.email, email),
          })
        : null;

      // データベースからユーザーを検索（IDで）
      const existingUserById = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      // 既存のアカウントがある場合
      if (existingUserByEmail && existingUserByEmail.id !== user.id) {
        // 異なるユーザーIDで同じメールアドレスが使用されている場合
        console.error("Email is already associated with another account");
        return false;
      }

      // ユーザーが存在する場合は更新
      if (existingUserById) {
        await db
          .update(users)
          .set({
            displayName: profile.username ?? existingUserById.displayName,
            avatarUrl: profile.image_url ?? existingUserById.avatarUrl,
            email: email ?? existingUserById.email,
            updatedAt: now,
          })
          .where(eq(users.id, user.id));
      } else {
        // 新規ユーザーの場合は作成
        await db.insert(users).values({
          id: user.id,
          displayName: profile.username ?? user.id,
          avatarUrl: profile.image_url ?? "",
          role: "member",
          email: email ?? "",
          createdAt: now,
          updatedAt: now,
        });
      }

      // アカウントの関連付けを確認
      const existingAccount = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, profile.id),
        ),
      });

      // アカウントが存在しない場合は作成
      if (!existingAccount) {
        await db.insert(accounts).values({
          id: randomUUID(),
          userId: user.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: profile.id,
          refreshToken: safeString(account.refresh_token),
          accessToken: safeString(account.access_token),
          expiresAt: account.expires_at ? Number(account.expires_at) : null,
          tokenType: safeString(account.token_type),
          scope: safeString(account.scope),
          idToken: safeString(account.id_token),
          sessionState: safeString(account.session_state),
        });
      }

      return true;
    } catch (error) {
      console.error("Error during sign in callback:", error);
      return false;
    }
  },

  /**
   * セッションがチェックされるたびに呼び出されます
   */
  async session({
    session,
    token,
  }: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
    if (!token.sub) {
      return session;
    }

    try {
      const userData = await db.query.users.findFirst({
        where: eq(users.id, token.sub),
      });

      if (!userData) {
        console.warn(
          `User data not found in database for session token sub: ${token.sub}`,
        );
        return session;
      }

      if (!session.user) {
        session.user = {
          id: token.sub,
          email: null,
          name: null,
          image: null,
          displayName: "取得中...",
          avatarUrl: "",
          role: "member",
        };
      }

      session.user.id = token.sub;
      session.user.displayName = userData.displayName;
      session.user.avatarUrl = userData.avatarUrl;
      session.user.role = userData.role;
      session.user.email = userData.email;

      return session;
    } catch (error) {
      console.error("Error fetching user data for session:", error);
      return session;
    }
  },

  /**
   * JWT が作成または更新されるたびに呼び出されます
   */
  async jwt({
    token,
    account,
  }: {
    token: JWT;
    account: Account | null;
  }): Promise<JWT> {
    if (account?.provider === "discord") {
      token.accessToken = account.access_token;
    }
    return token;
  },
};
