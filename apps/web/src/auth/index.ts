import NextAuth, { type NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import { getRequiredEnvVar, isProductionRuntime } from "./utils";

// NextAuthに必要な環境変数のチェックと取得
const baseUrl = getRequiredEnvVar("NEXTAUTH_URL");
const trustHost = getRequiredEnvVar("AUTH_TRUST_HOST");

// Next-Authの設定
export const authConfig = {
  ...(baseUrl && { url: new URL(baseUrl) }),
  providers: [
    Discord({
      clientId: getRequiredEnvVar("DISCORD_CLIENT_ID"),
      clientSecret: getRequiredEnvVar("DISCORD_CLIENT_SECRET"),
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify guilds email",
        },
      },
    }),
  ],
  secret: getRequiredEnvVar("NEXTAUTH_SECRET"),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProductionRuntime(),
        domain: isProductionRuntime() ? trustHost : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account?.access_token || account.provider !== "discord") {
        console.error("Invalid account data for Discord sign in.");
        return false;
      }

      if (!profile?.sub) {
        console.error("Invalid profile data from Discord.");
        return false;
      }

      try {
        // Discord API でギルドメンバーシップを確認
        const response = await fetch(
          "https://discord.com/api/users/@me/guilds",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        );

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
          return "/auth/not-member";
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account?.provider === "discord") {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  debug: !isProductionRuntime(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
} satisfies NextAuthConfig;

// Next-Auth v5 のハンドラーとヘルパー関数
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

// 他のモジュールをエクスポート
export * from "./utils";

/**
 * NextAuth の型定義を拡張し、アプリケーション固有のユーザー情報をセッションと JWT に含めます。
 * これにより、`useSession` や `auth()`、`getToken` などで型安全にカスタムデータを利用できます。
 */
declare module "next-auth" {
  /**
   * `useSession` や `auth()` から返される Session オブジェクトの型。
   * データベースから取得したカスタムユーザー情報を含みます。
   */
  interface Session {
    user: {
      /** データベースに保存されているユーザー ID (Discord ID と同じ) */
      id: string;
      /** データベースに保存されている表示名 */
      displayName: string;
      /** データベースに保存されているアバター画像の URL */
      avatarUrl: string;
      /** データベースに保存されているユーザーロール */
      role: string;
      /** Discord から取得したメールアドレス (存在する場合) */
      email?: string | null;
      /** NextAuth デフォルトの name と image はオプション */
      name?: string | null;
      image?: string | null;
    };
  }

  /**
   * `getToken` から返される、または `session` コールバックの引数として使用される JWT の型。
   */
  interface JWT {
    /** Discord のアクセストークン (ログイン時のみ) */
    accessToken?: string;
  }
}
