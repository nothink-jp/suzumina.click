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
export const mockDb = {
  query: {
    users: {
      findFirst: async ({ where }: any) => {
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
            if (key === "id" && value.value !== user.id) {
              return false;
            }
            if (key === "email" && value.value !== user.email) {
              return false;
            }
          }
          return true;
        });

        return user || null;
      },
    },
    accounts: {
      findFirst: async ({ where }: any) => {
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
            if (key === "provider" && value.value !== account.provider) {
              return false;
            }
            if (
              key === "providerAccountId" &&
              value.value !== account.providerAccountId
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
      findFirst: async ({ where }: any) => {
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
              value.value !== session.sessionToken
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
      findFirst: async ({ where }: any) => {
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
            if (key === "identifier" && value.value !== token.identifier) {
              return false;
            }
            if (key === "token" && value.value !== token.token) {
              return false;
            }
          }
          return true;
        });

        return token || null;
      },
    },
  },
  insert: (table: any) => {
    lastMethodCalled = `insert.${table.name}`;
    return {
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
  update: (table: any) => {
    lastMethodCalled = `update.${table.name}`;
    return {
      set: (data: any) => {
        return {
          where: async (condition: any) => {
            if (mockError) {
              throw mockError;
            }

            if (table === users) {
              const index = mockUsers.findIndex(
                (user) => user.id === condition.value,
              );
              if (index !== -1) {
                mockUsers[index] = { ...mockUsers[index], ...data };
              }
            } else if (table === sessions) {
              const index = mockSessions.findIndex(
                (session) => session.sessionToken === condition.value,
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
  delete: (table: any) => {
    lastMethodCalled = `delete.${table.name}`;
    return {
      where: async (condition: any) => {
        if (mockError) {
          throw mockError;
        }

        if (table === users) {
          mockUsers = mockUsers.filter((user) => user.id !== condition.value);
        } else if (table === accounts) {
          mockAccounts = mockAccounts.filter((account) => {
            for (const [key, value] of Object.entries(condition)) {
              if (key === "provider" && value.value !== account.provider) {
                return true;
              }
              if (
                key === "providerAccountId" &&
                value.value !== account.providerAccountId
              ) {
                return true;
              }
            }
            return false;
          });
        } else if (table === sessions) {
          mockSessions = mockSessions.filter(
            (session) => session.sessionToken !== condition.value,
          );
        } else if (table === verificationTokens) {
          mockVerificationTokens = mockVerificationTokens.filter((token) => {
            for (const [key, value] of Object.entries(condition)) {
              if (key === "identifier" && value.value !== token.identifier) {
                return true;
              }
              if (key === "token" && value.value !== token.token) {
                return true;
              }
            }
            return false;
          });
        }
      },
    };
  },
  select: () => {
    lastMethodCalled = "select";
    return {
      from: (table: any) => {
        return {
          where: (condition: any) => {
            return {
              limit: async (limit: number) => {
                if (mockError) {
                  throw mockError;
                }

                if (table === accounts) {
                  const filteredAccounts = mockAccounts.filter((account) => {
                    for (const [key, value] of Object.entries(condition)) {
                      if (
                        key === "provider" &&
                        value.value !== account.provider
                      ) {
                        return false;
                      }
                      if (
                        key === "providerAccountId" &&
                        value.value !== account.providerAccountId
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
