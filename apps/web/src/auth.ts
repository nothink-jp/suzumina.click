import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import NextAuth from "next-auth";
// import type { Session } from "next-auth"; // No longer needed here for the export type
import Discord from "next-auth/providers/discord";

// ビルド時かどうかを判定する関数
export const isBuildTime = () => {
  // NEXT_PHASE環境変数がビルド時に設定される
  return process.env.NEXT_PHASE === "phase-production-build";
};

// ランタイムの本番環境かどうかを判定する関数
export const isProductionRuntime = () => {
  return process.env.NODE_ENV === "production" && !isBuildTime();
};

export class ConfigurationError extends Error {
  constructor(envVar: string) {
    super(
      `Configuration Error: ${envVar} is not defined in the production runtime environment. Please ensure it is set correctly.`,
    );
    this.name = "ConfigurationError";
  }
}

// 環境変数を取得して型安全に扱う（改善版）
export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];

  // ビルド時にはダミー値を返す
  if (isBuildTime()) {
    // ダミー値でも空文字列は避ける
    return `dummy-${key}`;
  }

  // 本番ランタイム時に値が実際に未設定(undefined or null)の場合のみエラーをスロー
  if ((value === undefined || value === null) && isProductionRuntime()) {
    throw new ConfigurationError(key);
  }

  // 開発環境や、本番ランタイムで値が存在する場合はその値を返す
  // (開発環境で値がない場合は空文字列が返るが、NextAuth側でハンドリングされる想定)
  return value || "";
};

// NEXTAUTH_URLの取得（改善版）
const baseUrl = process.env.NEXTAUTH_URL;
// 本番ランタイム時に値が実際に未設定(undefined or null)の場合のみエラーをスロー
if ((baseUrl === undefined || baseUrl === null) && isProductionRuntime()) {
  throw new ConfigurationError("NEXTAUTH_URL");
}
// ビルド時にはダミーURLを使用
const effectiveBaseUrl = isBuildTime() ? "https://example.com" : baseUrl;

const firestore = new Firestore();
const users = firestore.collection("users");

// ユーザーデータの型定義
interface UserData {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Revert to original export using destructuring
export const {
  handlers: { GET, POST },
  auth, // Let TS infer the type again
  signIn,
  signOut,
} = NextAuth({
  // baseUrlを明示的に設定（ビルド時とランタイム時で異なる可能性があるため）
  // effectiveBaseUrlがnullやundefinedでないことを確認
  ...(effectiveBaseUrl && { url: new URL(effectiveBaseUrl) }), // Use URL object for v5
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
        // secure属性は本番ランタイム時のみtrueにする
        secure: isProductionRuntime(),
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account?.access_token || account.provider !== "discord") {
        console.error("Invalid account data");
        return false;
      }

      if (!profile?.id) {
        console.error("Invalid profile data");
        return false;
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
          console.error("Failed to fetch guild data:", await response.text());
          return false;
        }

        const guilds = await response.json();
        // guildIdの取得はエラーハンドリングを含むgetRequiredEnvVarを使用
        const guildId = getRequiredEnvVar("DISCORD_GUILD_ID");
        const isMember = guilds.some(
          (guild: { id: string }) => guild.id === guildId,
        );

        if (!isMember) {
          console.error("User is not a member of the required guild");
          return false;
        }

        // ユーザー情報の取得または作成
        const userRef = users.doc(profile.id);
        const userDoc = await userRef.get();
        const now = new Date();

        if (!userDoc.exists) {
          // 新規ユーザーの場合
          await userRef.set({
            id: profile.id,
            displayName: profile.username ?? "",
            avatarUrl: profile.image_url ?? "",
            role: "member",
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // 既存ユーザーの場合は更新のみ
          await userRef.update({
            displayName: profile.username ?? "",
            avatarUrl: profile.image_url ?? "",
            updatedAt: now,
          });
        }

        return true;
      } catch (error) {
        // 本番ランタイム時の設定エラーはここでキャッチされる
        if (error instanceof ConfigurationError) {
          console.error(
            "Authentication configuration error during signIn:",
            error.message,
          );
          // 本番環境で設定エラーがあれば認証を失敗させる
          return false;
        }
        // その他のエラー
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token.sub) {
        try {
          const userRef = users.doc(token.sub);
          const user = await userRef.get();

          if (user.exists) {
            const userData = user.data() as UserData;
            session.user = {
              ...session.user,
              id: token.sub,
              displayName: userData.displayName,
              avatarUrl: userData.avatarUrl,
              role: userData.role,
            };
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  // debugは開発環境のランタイム時のみtrueにする
  debug: process.env.NODE_ENV === "development" && !isBuildTime(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});


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
