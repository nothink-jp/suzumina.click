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
    maxAge: 30 * 24 * 60 * 60,
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
export * from "./firestore";
export * from "./callbacks";

// セッションの型定義を拡張
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string;
      role: string;
      email?: string | null;
    };
  }

  interface JWT {
    accessToken?: string;
  }
}
