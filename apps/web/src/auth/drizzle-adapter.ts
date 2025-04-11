import { type InferInsertModel, and, eq } from "drizzle-orm";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
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

/**
 * 値を安全に文字列に変換します。
 * null または undefined の場合は null を返します。
 * @param value - 変換する値
 * @returns 文字列または null
 */
function safeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

/**
 * 値を安全に数値に変換します。
 * null、undefined、または無効な数値の場合は null を返します。
 * @param value - 変換する値
 * @returns 数値または null
 */
function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return null;
  }
  return num;
}

/**
 * NextAuth.js Drizzle Adapter
 * PostgreSQL用のカスタムアダプターを提供します。
 */
export function DrizzleAdapter(): Adapter {
  const adapter: Adapter = {
    async createUser(userData): Promise<AdapterUser> {
      if (userData.email) {
        const existingUser = await db.query.users.findFirst({
          columns: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
          where: eq(users.email, userData.email),
        });

        if (existingUser) {
          return {
            id: existingUser.id,
            name: existingUser.displayName,
            email: existingUser.email || "",
            image: existingUser.avatarUrl,
            emailVerified: null,
          };
        }
      }

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

    async linkAccount(account: AdapterAccount): Promise<void> {
      const existingAccount = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId),
        ),
      });

      if (existingAccount) {
        await db
          .update(accounts)
          .set({
            userId: account.userId,
            accessToken: safeString(account.access_token),
            refreshToken: safeString(account.refresh_token),
            expiresAt: safeNumber(account.expires_at),
            tokenType: safeString(account.token_type),
            scope: safeString(account.scope),
            idToken: safeString(account.id_token),
            sessionState: safeString(account.session_state),
          })
          .where(eq(accounts.id, existingAccount.id));
        return;
      }

      const accountData: AccountInsert = {
        id: crypto.randomUUID(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: safeString(account.refresh_token),
        accessToken: safeString(account.access_token),
        expiresAt: safeNumber(account.expires_at),
        tokenType: safeString(account.token_type),
        scope: safeString(account.scope),
        idToken: safeString(account.id_token),
        sessionState: safeString(account.session_state),
      };

      await db.insert(accounts).values(accountData);
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

  return adapter;
}
