import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

interface DiscordProfile extends Profile {
  id: string;
  username?: string;
  image_url?: string;
}

// Discord APIのレスポンスをモック
export const mockDiscordGuilds = [
  {
    id: "959095494456537158", // すずみなふぁみりーのギルドID
    name: "すずみなふぁみりー",
    permissions: "0",
  },
];

// プロファイルデータのモック
export const mockDiscordProfile: DiscordProfile = {
  id: "123456789",
  name: "testuser",
  email: "test@example.com",
  image: "https://example.com/avatar.png",
  username: "testuser",
  image_url: "https://example.com/avatar.png",
};

// アカウントデータのモック
export const mockDiscordAccount: Account = {
  provider: "discord",
  type: "oauth",
  providerAccountId: "123456789",
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_at: 1234567890,
  scope: "identify email guilds",
};

// fetchのモック実装
export function mockDiscordFetch() {
  const mockResponse = {
    ok: true,
    json: () => Promise.resolve(mockDiscordGuilds),
    text: () => Promise.resolve(""),
  } as Response;

  return () => Promise.resolve(mockResponse);
}

// セッションのモックデータ
export const mockSession: Session = {
  user: {
    id: mockDiscordProfile.id,
    displayName: mockDiscordProfile.username || "",
    avatarUrl: mockDiscordProfile.image_url || "",
    role: "member",
    email: mockDiscordProfile.email,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// JWTのモックデータ
export const mockToken: JWT = {
  sub: mockDiscordProfile.id,
  accessToken: mockDiscordAccount.access_token,
};

export type { DiscordProfile };