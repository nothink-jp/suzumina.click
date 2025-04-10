import { type InferInsertModel, and, eq } from "drizzle-orm";
import type { Adapter, AdapterUser } from "next-auth/adapters";
// Import the inferred insert type and the table itself for type inference
import {
  type accounts as AccountsTable,
  accounts,
  db,
  sessions,
  users,
  verificationTokens,
} from "../db";

// Define the insert type alias
type AccountInsert = InferInsertModel<typeof AccountsTable>;

export function DrizzleAdapter(): Adapter {
  return {
    async createUser(userData): Promise<AdapterUser> {
      const now = new Date();
      const id = crypto.randomUUID();

      await db.insert(users).values({
        id,
        displayName: userData.name || `User_${id.substring(0, 5)}`,
        avatarUrl: userData.image || "",
        email: userData.email || "",
        role: "member",
        createdAt: now,
        updatedAt: now,
      });

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        throw new Error("User not found after creation");
      }

      return {
        id: user.id,
        name: user.displayName,
        email: user.email || "",
        image: user.avatarUrl,
        emailVerified: null,
      };
    },

    async getUser(id): Promise<AdapterUser | null> {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.displayName,
        email: user.email || "",
        image: user.avatarUrl,
        emailVerified: null,
      };
    },

    async getUserByEmail(email): Promise<AdapterUser | null> {
      if (!email) {
        return null;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.displayName,
        email: user.email || "",
        image: user.avatarUrl,
        emailVerified: null,
      };
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }): Promise<AdapterUser | null> {
      const dbAccount = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        )
        .limit(1);

      if (!dbAccount || dbAccount.length === 0) {
        return null;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, dbAccount[0].userId),
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.displayName,
        email: user.email || "",
        image: user.avatarUrl,
        emailVerified: null,
      };
    },

    async updateUser(user): Promise<AdapterUser> {
      const now = new Date();

      await db
        .update(users)
        .set({
          displayName: user.name || undefined,
          avatarUrl: user.image || undefined,
          email: user.email || undefined,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!updatedUser) {
        throw new Error("User not found after update");
      }

      return {
        id: updatedUser.id,
        name: updatedUser.displayName,
        email: updatedUser.email || "",
        image: updatedUser.avatarUrl,
        emailVerified: null,
      };
    },

    async deleteUser(userId) {
      await db.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(account) {
      // 型変換を明示的に行い、Drizzleが期待する型に合わせる
      const expiresAtValue = account.expires_at
        ? Number.parseInt(String(account.expires_at), 10)
        : null;

      // 各フィールドを個別に処理
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token ?? null,
        accessToken: account.access_token ?? null,
        expiresAt:
          expiresAtValue !== null ? new Date(expiresAtValue * 1000) : null, // Convert number (seconds) to Date
        tokenType: account.token_type ?? null,
        scope: account.scope ?? null,
        idToken: account.id_token ?? null,
        sessionState: account.session_state ?? null,
      } as AccountInsert); // Cast the entire object to the inferred insert type
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId),
          ),
        );
    },

    async createSession({ sessionToken, userId, expires }) {
      await db.insert(sessions).values({
        id: crypto.randomUUID(),
        userId,
        sessionToken,
        expires,
      });

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, sessionToken),
      });

      if (!session) {
        throw new Error("Session not found after creation");
      }

      return session;
    },

    async getSessionAndUser(sessionToken) {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, sessionToken),
      });

      if (!session) {
        return null;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (!user) {
        return null;
      }

      return {
        session,
        user: {
          id: user.id,
          name: user.displayName,
          email: user.email || "",
          image: user.avatarUrl,
          emailVerified: null,
        },
      };
    },

    async updateSession({ sessionToken, expires }) {
      await db
        .update(sessions)
        .set({ expires })
        .where(eq(sessions.sessionToken, sessionToken));

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, sessionToken),
      });

      if (!session) {
        return null;
      }
      return session;
    },

    async deleteSession(sessionToken) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },

    async createVerificationToken({ identifier, token, expires }) {
      await db.insert(verificationTokens).values({
        identifier,
        token,
        expires,
      });

      const verificationToken = await db.query.verificationTokens.findFirst({
        where: and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token),
        ),
      });

      if (!verificationToken) {
        throw new Error("Verification token not found after creation");
      }

      return verificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      const verificationToken = await db.query.verificationTokens.findFirst({
        where: and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token),
        ),
      });

      if (!verificationToken) {
        return null;
      }

      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, identifier),
            eq(verificationTokens.token, token),
          ),
        );

      return verificationToken;
    },
  };
}
