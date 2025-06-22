import {
  type DiscordUser,
  type GuildMembership,
  isValidGuildMember,
  resolveDisplayName,
  SUZUMINA_GUILD_ID,
  type UserSession,
  UserSessionSchema,
} from "@suzumina.click/shared-types";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import {
  createUser,
  getUserByDiscordId,
  updateLastLogin,
  userExists,
} from "@/lib/user-firestore";

/**
 * Discord Guild情報を取得するヘルパー関数
 */
async function fetchDiscordGuildMembership(
  accessToken: string,
  userId: string,
): Promise<GuildMembership | null> {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Discord API error:", response.status, response.statusText);
      return null;
    }

    const guilds = await response.json();
    const suzuminaGuild = guilds.find(
      (guild: { id: string }) => guild.id === SUZUMINA_GUILD_ID,
    );

    if (!suzuminaGuild) {
      console.log(`User ${userId} is not a member of suzumina guild`);
      return {
        guildId: SUZUMINA_GUILD_ID,
        userId,
        isMember: false,
      };
    }

    // より詳細なメンバー情報を取得（ニックネーム、ロールなど）
    // Note: Discord Bot Token が必要になるため、現在は基本情報のみ
    return {
      guildId: SUZUMINA_GUILD_ID,
      userId,
      isMember: true,
      roles: [], // Bot Token があれば取得可能
      nickname: null, // Bot Token があれば取得可能
      joinedAt: suzuminaGuild.joined_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching Discord guild membership:", error);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // カスタムFirestore管理（アダプターなし）

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      // Guild情報取得のためのスコープを追加
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Discord認証の場合のみGuild確認を実行
      if (account?.provider === "discord" && account.access_token) {
        const guildMembership = await fetchDiscordGuildMembership(
          account.access_token,
          user.id,
        );

        if (!guildMembership || !isValidGuildMember(guildMembership)) {
          console.log(
            `Access denied for user ${user.id}: not a valid guild member`,
          );
          return false; // ログイン拒否
        }

        // Guild情報をユーザープロファイルに保存（次のcallbackで使用）
        user.guildMembership = guildMembership;
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // 初回ログイン時にユーザー情報とGuild情報を保存
      if (user && account?.provider === "discord") {
        const discordUser: DiscordUser = {
          id: user.id,
          username: user.name || user.email?.split("@")[0] || "Unknown",
          globalName: user.name || undefined,
          avatar: user.image?.split("/").pop()?.split(".")[0] || null,
          email: user.email || undefined,
          verified: true, // Discord OAuth経由なので検証済みとみなす
        };

        const guildMembership = user.guildMembership as GuildMembership;

        token.discordUser = discordUser;
        token.guildMembership = guildMembership;
        token.displayName = resolveDisplayName(
          undefined, // displayNameは後でユーザーが設定
          discordUser.globalName,
          discordUser.username,
        );
      }

      return token;
    },

    async session({ session, token }) {
      if (token.discordUser && token.guildMembership) {
        try {
          // Firestoreから最新のユーザー情報を取得
          const user = await getUserByDiscordId(token.discordUser.id);

          if (!user || !user.isActive) {
            console.log(`User not found or inactive: ${token.discordUser.id}`);
            return null;
          }

          // UserSessionスキーマに準拠したセッション情報を作成
          const userSession: UserSession = {
            discordId: user.discordId,
            username: user.username,
            globalName: user.globalName,
            avatar: user.avatar,
            displayName: user.displayName,
            role: user.role,
            guildMembership: token.guildMembership as GuildMembership,
            isActive: user.isActive,
          };

          // スキーマ検証
          session.user = UserSessionSchema.parse(userSession);

          // ログイン時刻を更新（非同期、エラーは無視）
          updateLastLogin(user.discordId).catch(console.error);
        } catch (error) {
          console.error("Session validation error:", error);
          // 検証失敗時はログアウト
          return null;
        }
      }

      return session;
    },
  },

  session: {
    strategy: "jwt", // JWTベースのセッション管理
  },

  pages: {
    signIn: "/auth/signin", // カスタムサインインページ
    error: "/auth/error", // エラーページ
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User signed in: ${user.id} (new: ${isNewUser})`);

      // Discord認証での新規ユーザーの場合、Firestoreにユーザーデータを作成
      if (account?.provider === "discord" && user.guildMembership) {
        const alreadyExists = await userExists(user.id);

        if (!alreadyExists) {
          try {
            const discordUser: DiscordUser = {
              id: user.id,
              username: user.name || user.email?.split("@")[0] || "Unknown",
              globalName: user.name || undefined,
              avatar: user.image?.split("/").pop()?.split(".")[0] || null,
              email: user.email || undefined,
              verified: true,
            };

            await createUser({
              discordUser,
              guildMembership: user.guildMembership as GuildMembership,
            });

            console.log(`New user created in Firestore: ${user.id}`);
          } catch (error) {
            console.error("Error creating new user in Firestore:", error);
            // ユーザー作成失敗時はログインを拒否
            return false;
          }
        }
      }
    },

    async signOut({ token }) {
      console.log(`User signed out: ${token?.sub}`);
    },
  },

  debug: process.env.NODE_ENV === "development",
});

// TypeScript用の型定義拡張
declare module "next-auth" {
  interface User {
    guildMembership?: GuildMembership;
  }

  interface Session {
    user: UserSession;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordUser?: DiscordUser;
    guildMembership?: GuildMembership;
    displayName?: string;
  }
}
