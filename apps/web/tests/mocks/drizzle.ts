// @ts-nocheck モックなので型チェックを無効化
import type { AdapterUser } from "next-auth/adapters";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "../../src/db/schema";

// モックのインターフェース定義
export interface MockDrizzleUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDrizzleAccount {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
  sessionState: string | null;
}

export interface MockDrizzleSession {
  id: string;
  userId: string;
  sessionToken: string;
  expires: Date;
}

export interface MockDrizzleVerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

// モック状態の管理
let mockUsers: MockDrizzleUser[] = [];
let mockAccounts: MockDrizzleAccount[] = [];
let mockSessions: MockDrizzleSession[] = [];
let mockVerificationTokens: MockDrizzleVerificationToken[] = [];
let mockError: Error | null = null;
let lastMethodCalled: string | null = null;

// Drizzleのクエリビルダーのモック
// findFirstの引数の型定義
type FindFirstArgs<T> = {
  where?: Partial<Record<keyof T, { value: unknown }>>;
};

// Helper type guard to check if value has a 'value' property
// biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
const hasValueProperty = (obj: any): obj is { value: unknown } => {
  return typeof obj === "object" && obj !== null && "value" in obj;
};

export const mockDb = {
  query: {
    users: {
      findFirst: async ({ where }: FindFirstArgs<MockDrizzleUser>) => {
        if (mockError) {
          throw mockError;
        }
        lastMethodCalled = "query.users.findFirst";

        if (!where) {
          return mockUsers[0] || null;
        }

        // whereの条件に基づいてユーザーを検索
        const user = mockUsers.find((user) => {
          for (const [key, value] of Object.entries(where)) {
            if (
              key === "id" &&
              (!hasValueProperty(value) || value.value !== user.id)
            ) {
              return false;
            }
            if (
              key === "email" &&
              (!hasValueProperty(value) || value.value !== user.email)
            ) {
              return false;
            }
          }
          return true;
        });

        return user || null;
      },
    },
    accounts: {
      findFirst: async ({ where }: FindFirstArgs<MockDrizzleAccount>) => {
        if (mockError) {
          throw mockError;
        }
        lastMethodCalled = "query.accounts.findFirst";

        if (!where) {
          return mockAccounts[0] || null;
        }

        // whereの条件に基づいてアカウントを検索
        const account = mockAccounts.find((account) => {
          for (const [key, value] of Object.entries(where)) {
            if (
              key === "provider" &&
              (!hasValueProperty(value) || value.value !== account.provider)
            ) {
              return false;
            }
            if (
              key === "providerAccountId" &&
              (!hasValueProperty(value) ||
                value.value !== account.providerAccountId)
            ) {
              return false;
            }
          }
          return true;
        });

        return account || null;
      },
    },
    sessions: {
      findFirst: async ({ where }: FindFirstArgs<MockDrizzleSession>) => {
        if (mockError) {
          throw mockError;
        }
        lastMethodCalled = "query.sessions.findFirst";

        if (!where) {
          return mockSessions[0] || null;
        }

        // whereの条件に基づいてセッションを検索
        const session = mockSessions.find((session) => {
          for (const [key, value] of Object.entries(where)) {
            if (
              key === "sessionToken" &&
              (!hasValueProperty(value) || value.value !== session.sessionToken)
            ) {
              return false;
            }
          }
          return true;
        });

        return session || null;
      },
    },
    verificationTokens: {
      findFirst: async ({
        where,
      }: FindFirstArgs<MockDrizzleVerificationToken>) => {
        if (mockError) {
          throw mockError;
        }
        lastMethodCalled = "query.verificationTokens.findFirst";

        if (!where) {
          return mockVerificationTokens[0] || null;
        }

        // whereの条件に基づいて検証トークンを検索
        const token = mockVerificationTokens.find((token) => {
          for (const [key, value] of Object.entries(where)) {
            if (
              key === "identifier" &&
              (!hasValueProperty(value) || value.value !== token.identifier)
            ) {
              return false;
            }
            if (
              key === "token" &&
              (!hasValueProperty(value) || value.value !== token.token)
            ) {
              return false;
            }
          }
          return true;
        });

        return token || null;
      },
    },
  },
  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
  insert: (table: any) => {
    lastMethodCalled = `insert.${table.name}`;
    return {
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
      values: async (data: any) => {
        if (mockError) {
          throw mockError;
        }

        if (table === users) {
          mockUsers.push(data as MockDrizzleUser);
        } else if (table === accounts) {
          mockAccounts.push(data as MockDrizzleAccount);
        } else if (table === sessions) {
          mockSessions.push(data as MockDrizzleSession);
        } else if (table === verificationTokens) {
          mockVerificationTokens.push(data as MockDrizzleVerificationToken);
        }
      },
    };
  },
  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
  update: (table: any) => {
    lastMethodCalled = `update.${table.name}`;
    return {
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
      set: (data: any) => {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
          where: async (condition: any) => {
            if (mockError) {
              throw mockError;
            }

            if (table === users) {
              const index = mockUsers.findIndex(
                (user) =>
                  hasValueProperty(condition) && user.id === condition.value,
              );
              if (index !== -1) {
                mockUsers[index] = { ...mockUsers[index], ...data };
              }
            } else if (table === sessions) {
              const index = mockSessions.findIndex(
                (session) =>
                  hasValueProperty(condition) &&
                  session.sessionToken === condition.value,
              );
              if (index !== -1) {
                mockSessions[index] = { ...mockSessions[index], ...data };
              }
            }
          },
        };
      },
    };
  },
  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
  delete: (table: any) => {
    lastMethodCalled = `delete.${table.name}`;
    return {
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
      where: async (condition: any) => {
        if (mockError) {
          throw mockError;
        }

        if (table === users) {
          mockUsers = mockUsers.filter(
            (user) =>
              !hasValueProperty(condition) || user.id !== condition.value,
          );
        } else if (table === accounts) {
          mockAccounts = mockAccounts.filter((account) => {
            for (const [key, value] of Object.entries(condition || {})) {
              if (
                key === "provider" &&
                (!hasValueProperty(value) || value.value !== account.provider)
              ) {
                return true; // Keep if condition doesn't match
              }
              if (
                key === "providerAccountId" &&
                (!hasValueProperty(value) ||
                  value.value !== account.providerAccountId)
              ) {
                return true; // Keep if condition doesn't match
              }
            }
            return false; // Remove if all conditions match
          });
        } else if (table === sessions) {
          mockSessions = mockSessions.filter(
            (session) =>
              !hasValueProperty(condition) ||
              session.sessionToken !== condition.value,
          );
        } else if (table === verificationTokens) {
          mockVerificationTokens = mockVerificationTokens.filter((token) => {
            for (const [key, value] of Object.entries(condition || {})) {
              if (
                key === "identifier" &&
                (!hasValueProperty(value) || value.value !== token.identifier)
              ) {
                return true; // Keep if condition doesn't match
              }
              if (
                key === "token" &&
                (!hasValueProperty(value) || value.value !== token.token)
              ) {
                return true; // Keep if condition doesn't match
              }
            }
            return false; // Remove if all conditions match
          });
        }
      },
    };
  },
  select: () => {
    lastMethodCalled = "select";
    return {
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
      from: (table: any) => {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: Mock implementation simplification
          where: (condition: any) => {
            return {
              limit: async (limit: number) => {
                if (mockError) {
                  throw mockError;
                }

                if (table === accounts) {
                  const filteredAccounts = mockAccounts.filter((account) => {
                    for (const [key, value] of Object.entries(
                      condition || {},
                    )) {
                      if (
                        key === "provider" &&
                        (!hasValueProperty(value) ||
                          value.value !== account.provider)
                      ) {
                        return false;
                      }
                      if (
                        key === "providerAccountId" &&
                        (!hasValueProperty(value) ||
                          value.value !== account.providerAccountId)
                      ) {
                        return false;
                      }
                    }
                    return true;
                  });

                  return filteredAccounts.slice(0, limit);
                }

                return [];
              },
            };
          },
        };
      },
    };
  },
};

// テスト用のヘルパー関数
export function setMockUser(user: MockDrizzleUser) {
  const index = mockUsers.findIndex((u) => u.id === user.id);
  if (index !== -1) {
    mockUsers[index] = user;
  } else {
    mockUsers.push(user);
  }
}

export function setMockAccount(account: MockDrizzleAccount) {
  const index = mockAccounts.findIndex((a) => a.id === account.id);
  if (index !== -1) {
    mockAccounts[index] = account;
  } else {
    mockAccounts.push(account);
  }
}

export function setMockSession(session: MockDrizzleSession) {
  const index = mockSessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    mockSessions[index] = session;
  } else {
    mockSessions.push(session);
  }
}

export function setMockVerificationToken(token: MockDrizzleVerificationToken) {
  const index = mockVerificationTokens.findIndex(
    (t) => t.token === token.token,
  );
  if (index !== -1) {
    mockVerificationTokens[index] = token;
  } else {
    mockVerificationTokens.push(token);
  }
}

export function setMockError(error: Error | null) {
  mockError = error;
}

export function resetMockDrizzle() {
  mockUsers = [];
  mockAccounts = [];
  mockSessions = [];
  mockVerificationTokens = [];
  mockError = null;
  lastMethodCalled = null;
}

export function getMockState() {
  return {
    users: [...mockUsers],
    accounts: [...mockAccounts],
    sessions: [...mockSessions],
    verificationTokens: [...mockVerificationTokens],
    error: mockError,
    lastMethodCalled,
  };
}

// AdapterUserへの変換ヘルパー
export function toAdapterUser(user: MockDrizzleUser): AdapterUser {
  return {
    id: user.id,
    name: user.displayName,
    email: user.email || "",
    image: user.avatarUrl,
    emailVerified: null,
  };
}
