import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

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

class ConfigurationError extends Error {
  constructor(envVar: string) {
    super(`Configuration Error: ${envVar} is not defined`);
    this.name = "ConfigurationError";
  }
}

// 環境変数を取得して型安全に扱う
const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new ConfigurationError(key);
  }
  return value;
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Discord({
      clientId: getRequiredEnvVar("DISCORD_CLIENT_ID"),
      clientSecret: getRequiredEnvVar("DISCORD_CLIENT_SECRET"),
      authorization: {
        params: {
          scope: "identify guilds email",
          prompt: "consent",
        },
      },
    }),
  ],
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
        console.log("Fetched guilds:", guilds);

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
        if (error instanceof ConfigurationError) {
          console.error("Authentication configuration error:", error.message);
        } else {
          console.error("Error during sign in:", error);
        }
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
  debug: process.env.NODE_ENV === "development",
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
