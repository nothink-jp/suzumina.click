import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { users } from "./firestore";
import { getRequiredEnvVar } from "./utils";

interface DiscordProfile extends Profile {
  username?: string;
  image_url?: string;
}

export const callbacks = {
  async signIn({
    account,
    profile,
  }: {
    account: Account | null;
    profile?: DiscordProfile;
  }): Promise<boolean> {
    if (!account?.access_token || account.provider !== "discord") {
      console.error("Invalid account data");
      return false;
    }

    if (!profile?.id) {
      console.error("Invalid profile data");
      return false;
    }

    try {
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch guild data:", await response.text());
        return false;
      }

      const guilds = await response.json();
      let guildId: string;
      try {
        guildId = getRequiredEnvVar("DISCORD_GUILD_ID");
      } catch {
        console.error("Guild ID not configured");
        return false;
      }

      const isMember = guilds.some(
        (guild: { id: string }) => guild.id === guildId,
      );

      if (!isMember) {
        console.error("User is not a member of the required guild");
        return false;
      }
      const userRef = users.doc(profile.id);
      const now = new Date();
      const userData = {
        id: profile.id,
        displayName: profile.username ?? "",
        avatarUrl: profile.image_url ?? "",
        role: "member",
        updatedAt: now,
        createdAt: now,
      };
      try {
        await userRef.set(userData);
      } catch (error) {
        console.error("Failed to update user data:", error);
        throw error; // エラーを再スローして上位でキャッチする
      }

      return true;
    } catch (error) {
      console.error("Error during sign in:", error);
      return false;
    }
  },

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
      const userDoc = await users.doc(token.sub).get();
      if (!userDoc.exists) {
        return session;
      }

      const userData = userDoc.data();
      if (!userData) {
        return session;
      }

      session.user = {
        ...session.user,
        id: token.sub,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
      };

      return session;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return session;
    }
  },

  async jwt({
    token,
    account,
  }: {
    token: JWT;
    account: Account | null;
  }): Promise<JWT> {
    if (account) {
      token.accessToken = account.access_token;
    }
    return token;
  },
};
