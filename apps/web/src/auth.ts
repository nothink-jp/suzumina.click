import NextAuth, { type NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "./auth/drizzle-adapter";
import {
  ConfigurationError,
  getRequiredEnvVar,
  isBuildTime,
  isProductionRuntime,
} from "./auth/utils";

// NEXTAUTH_URLの取得と検証 (authConfig の外で実行)
const baseUrl = process.env.NEXTAUTH_URL;
if ((baseUrl === undefined || baseUrl === null) && isProductionRuntime()) {
  throw new ConfigurationError("NEXTAUTH_URL");
}
// ビルド時にはダミーURLを使用
const effectiveBaseUrl = isBuildTime() ? "https://example.com" : baseUrl;

/**
 * NextAuth の設定オブジェクト。
 * テストのためにエクスポートされます。
 */
export const authConfig: NextAuthConfig = {
  // effectiveBaseUrlがnullやundefinedでないことを確認して設定
  ...(effectiveBaseUrl && { url: new URL(effectiveBaseUrl) }),
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
  adapter: DrizzleAdapter(),
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
        // secure属性は本番ランタイム時のみtrueにする
        secure: isProductionRuntime(),
      },
    },
  },
  /**
   * NextAuth のコールバック関数。認証フローのカスタマイズに使用されます。
   */
  callbacks: {
    /**
     * サインイン処理中に呼び出されます。
     * Discord ギルドメンバーシップを確認します。
     * メンバーでない場合は専用ページにリダイレクトします。
     * @param params - signIn コールバックのパラメータ。
     * @param params.account - プロバイダーのアカウント情報。
     * @param params.profile - プロバイダーから取得したユーザープロファイル。
     * @returns 認証を許可する場合は true、拒否する場合はリダイレクト先の URL 文字列、エラーの場合は false。
     */
    async signIn({ account, profile }) {
      if (!account?.access_token || account.provider !== "discord") {
        console.error("Invalid account data for Discord sign in.");
        return false; // エラーページへ
      }

      if (!profile?.id) {
        console.error("Invalid profile data from Discord.");
        return false; // エラーページへ
      }

      try {
        // Discord ギルドの確認
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
          return false; // エラーページへ
        }

        const guilds = await response.json();
        const guildId = getRequiredEnvVar("DISCORD_GUILD_ID"); // エラーハンドリングを含む
        const isMember = guilds.some(
          (guild: { id: string }) => guild.id === guildId,
        );

        if (!isMember) {
          return "/auth/not-member"; // メンバーでない場合は専用ページへリダイレクト
        }

        return true; // 認証成功
      } catch (error) {
        if (error instanceof ConfigurationError) {
          console.error(
            "Authentication configuration error during signIn:",
            error.message,
          );
          return false; // 本番環境での設定エラーはエラーページへ
        }
        console.error("Error during sign in process:", error);
        return false; // その他のエラーもエラーページへ
      }
    },
    /**
     * セッションがチェックされるたびに呼び出されます。
     * JWT トークンからユーザー情報を取得し、セッションオブジェクトに追加します。
     * @param params - session コールバックのパラメータ。
     * @param params.session - 現在のセッションオブジェクト。
     * @param params.token - JWT トークン。
     * @returns 更新されたセッションオブジェクト。
     */
    async session({ session, token }) {
      if (token.sub && session.user) {
        // ユーザーIDをセッションに追加
        session.user.id = token.sub;
      }
      return session; // 更新されたセッションを返す
    },
    /**
     * JWT が作成または更新されるたびに呼び出されます。
     * Discord のアクセストークンを JWT に含めます。
     * @param params - jwt コールバックのパラメータ。
     * @param params.token - 現在の JWT トークン。
     * @param params.account - プロバイダーのアカウント情報（ログイン時のみ）。
     * @returns 更新された JWT トークン。
     */
    async jwt({ token, account }) {
      if (account?.provider === "discord") {
        // プロバイダーを明示的に確認
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  // debug は開発環境のランタイム時のみ true にする
  debug: process.env.NODE_ENV === "development" && !isBuildTime(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

// NextAuth の設定とハンドラーのエクスポート
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

/**
 * NextAuth の型定義を拡張し、アプリケーション固有のユーザー情報をセッションと JWT に含めます。
 */
declare module "next-auth" {
  /**
   * `useSession` や `auth()` から返される Session オブジェクトの型。
   */
  interface Session {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string;
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
    /** Discord のアクセストークン */
    accessToken?: string;
  }
}
