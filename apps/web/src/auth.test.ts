import "@/../tests/setup";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { setMockError } from "@/../tests/mocks/drizzle";
import type { AdapterUser } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";
import { DrizzleAdapter } from "./auth/drizzle-adapter";

describe("NextAuth 設定", () => {
  const originalEnv = { ...process.env };
  let authModule: typeof import("./auth");

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      DISCORD_CLIENT_ID: "test-client-id",
      DISCORD_CLIENT_SECRET: "test-client-secret",
      NEXTAUTH_SECRET: "test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    };
  });

  beforeEach(async () => {
    process.env = { ...process.env };
    mock.restore();
    authModule = await import("./auth");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    mock.restore();
    setMockError(null);
  });

  it("必要な関数とオブジェクトがエクスポートされている", () => {
    expect(authModule.auth).toBeDefined();
    expect(authModule.GET).toBeInstanceOf(Function);
    expect(authModule.POST).toBeInstanceOf(Function);
    expect(authModule.signIn).toBeInstanceOf(Function);
    expect(authModule.signOut).toBeInstanceOf(Function);
    expect(authModule.authConfig).toBeDefined();
  });

  describe("authConfig の内容", () => {
    it("Discord プロバイダーが正しく設定されている", () => {
      const config = authModule.authConfig;

      expect(config.providers).toBeArrayOfSize(1);
      const discordProvider = config.providers[0] as Provider;
      expect(discordProvider).toHaveProperty("id", "discord");
      expect(discordProvider.options?.clientId).toBeDefined();
      expect(discordProvider.options?.clientSecret).toBeDefined();
      expect(discordProvider.options?.authorization?.params?.scope).toBe(
        "identify guilds email",
      );
    });

    it("アダプターが正しく設定されている", () => {
      const config = authModule.authConfig;
      expect(config.adapter).toBeDefined();
      expect(typeof config.adapter).toBe(typeof DrizzleAdapter());
    });

    it("データベース接続エラーを適切に処理できる", async () => {
      setMockError(new Error("Database connection failed"));

      const adapter = DrizzleAdapter();
      if (!adapter.createUser) {
        throw new Error("Adapter createUser method not implemented");
      }

      const testUser: AdapterUser = {
        id: "test-id",
        email: "test@example.com",
        emailVerified: null,
        name: "Test User",
        image: null,
      };

      await expect(adapter.createUser(testUser)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("セッション設定が正しく設定されている", () => {
      const config = authModule.authConfig;
      expect(config.session?.strategy).toBe("jwt");
      expect(config.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("コールバックが定義されている", () => {
      const config = authModule.authConfig;
      expect(config.callbacks?.jwt).toBeInstanceOf(Function);
      expect(config.callbacks?.signIn).toBeInstanceOf(Function);
      expect(config.callbacks?.session).toBeInstanceOf(Function);
    });

    it("ページ設定が正しく設定されている", () => {
      const config = authModule.authConfig;
      expect(config.pages?.signIn).toBe("/auth/signin");
      expect(config.pages?.error).toBe("/auth/error");
    });
  });
});
