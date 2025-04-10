import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { callbacks } from "./callbacks";
import { getRequiredEnvVar, isBuildTime, isProductionRuntime } from "./utils";

// NextAuthに必要な環境変数のチェックと取得
const baseUrl = getRequiredEnvVar("NEXTAUTH_URL");
const effectiveBaseUrl = isBuildTime() ? "https://example.com" : baseUrl;

// Next-Authの設定
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
      },
    },
  },
  callbacks,
  debug: process.env.NODE_ENV === "development" && !isBuildTime(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});

// 他のモジュールをエクスポート
export * from "./utils";
export * from "./callbacks";

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
    // 他のカスタムクレームを追加可能
    // discordId?: string;
  }
}
