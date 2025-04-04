import { Firestore } from "@google-cloud/firestore";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

const firestore = new Firestore();
const users = firestore.collection("users");

// Discordギルドの型定義
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

// 環境変数の検証
const checkEnvVars = () => {
  if (!process.env.DISCORD_CLIENT_ID) {
    throw new Error("DISCORD_CLIENT_ID is not defined");
  }
  if (!process.env.DISCORD_CLIENT_SECRET) {
    throw new Error("DISCORD_CLIENT_SECRET is not defined");
  }
  if (!process.env.DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is not defined");
  }
};

checkEnvVars();

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "identify guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== "discord") {
        return false;
      }

      if (!profile || !profile.id) {
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
          return false;
        }

        const guilds: DiscordGuild[] = await response.json();

        const isMember = guilds.some(
          (guild) => guild.id === process.env.DISCORD_GUILD_ID,
        );

        if (!isMember) {
          return false;
        }

        // Firestoreにユーザー情報を保存
        const userRef = users.doc(profile.id);
        await userRef.set(
          {
            id: profile.id,
            displayName: profile.name ?? "",
            avatarUrl: profile.image ?? "",
            updatedAt: new Date(),
          },
          { merge: true },
        );

        return true;
      } catch (error) {
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
            const userData = user.data();
            if (userData) {
              session.user = {
                ...session.user,
                id: token.sub,
                displayName: userData.displayName,
                avatarUrl: userData.avatarUrl,
              };
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      return session;
    },
  },
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
      email?: string | null;
    };
  }
}
