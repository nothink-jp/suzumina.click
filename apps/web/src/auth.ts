import NextAuth, { type NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "./auth/drizzle-adapter";
import {
  ConfigurationError,
  getRequiredEnvVar,
  isProductionRuntime,
} from "./auth/utils";

// NEXTAUTH_URLの取得と検証
const baseUrl = process.env.NEXTAUTH_URL;
if (!baseUrl && isProductionRuntime()) {
  throw new ConfigurationError("NEXTAUTH_URL");
}

/**
 * NextAuth の設定オブジェクト
 */
export const authConfig: NextAuthConfig = {
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
        secure: isProductionRuntime(),
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account?.access_token || account.provider !== "discord") {
        console.error("Invalid account data for Discord sign in.");
        return false;
      }

      if (!profile?.id) {
        console.error("Invalid profile data from Discord.");
        return false;
      }

      try {
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
        const isMember = guilds.some(
          (guild: { id: string }) => guild.id === guildId,
        );

        if (!isMember) {
          return "/auth/not-member";
        }

        return true;
      } catch (error) {
        if (error instanceof ConfigurationError) {
          console.error(
            "Authentication configuration error during signIn:",
            error.message,
          );
          return false;
        }
        console.error("Error during sign in process:", error);
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
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string;
      role: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface JWT {
    accessToken?: string;
  }
}
