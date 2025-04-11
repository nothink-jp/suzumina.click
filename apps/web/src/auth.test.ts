import "@/../tests/setup";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { setMockError } from "@/../tests/mocks/drizzle";
import type { NextAuthConfig } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { Provider } from "next-auth/providers";
import { GET, POST, auth, signIn, signOut } from "./auth";
import { DrizzleAdapter } from "./auth/drizzle-adapter";

describe("NextAuth 設定", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    mock.restore();
    setMockError(null);
  });

  it("必要な関数とオブジェクトがエクスポートされている", () => {
    expect(auth).toBeDefined();
    expect(GET).toBeInstanceOf(Function);
    expect(POST).toBeInstanceOf(Function);
    expect(signIn).toBeInstanceOf(Function);
    expect(signOut).toBeInstanceOf(Function);
  });

  describe("authConfig の内容", () => {
    async function getAuthConfig(): Promise<NextAuthConfig> {
      const module = await import("./auth");
      return module.authConfig;
    }

    it("Discord プロバイダーが正しく設定されている", async () => {
      process.env = {
        ...process.env,
        DISCORD_CLIENT_ID: "test-client-id",
        DISCORD_CLIENT_SECRET: "test-client-secret",
        NEXTAUTH_SECRET: "test-secret",
        NEXTAUTH_URL: "http://localhost:3000",
        NODE_ENV: "development",
      };

      const config = await getAuthConfig();

      expect(config.providers).toBeArrayOfSize(1);
      const discordProvider = config.providers[0] as Provider;
      expect(discordProvider).toHaveProperty("id", "discord");
      expect(discordProvider.options?.clientId).toBeDefined();
      expect(discordProvider.options?.clientSecret).toBeDefined();
      expect(discordProvider.options?.authorization?.params?.scope).toBe(
        "identify guilds email",
      );
    });

    it("アダプターが正しく設定されている", async () => {
      process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test_db";
      const config = await getAuthConfig();
      expect(config.adapter).toBeDefined();
      expect(typeof config.adapter).toBe(typeof DrizzleAdapter());
    });

    it("PostgreSQL接続エラーを適切に処理できる", async () => {
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

    it("セッション設定が正しく設定されている", async () => {
      const config = await getAuthConfig();
      expect(config.session?.strategy).toBe("jwt");
      expect(config.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("クッキー設定が正しく設定されている (開発環境)", async () => {
      process.env = { ...process.env, NODE_ENV: "development" };
      const config = await getAuthConfig();

      expect(config.cookies?.sessionToken?.options?.secure).toBe(false);
      expect(config.cookies?.sessionToken?.options?.httpOnly).toBe(true);
      expect(config.cookies?.sessionToken?.options?.sameSite).toBe("lax");
      expect(config.cookies?.sessionToken?.options?.path).toBe("/");
      expect(config.cookies?.sessionToken?.name).toBe(
        "next-auth.session-token",
      );
    });

    it("クッキー設定が正しく設定されている (本番ランタイム環境)", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: undefined,
      };
      const config = await getAuthConfig();

      expect(config.cookies?.sessionToken?.options?.secure).toBe(true);
    });

    it("コールバック (jwt) が定義されている", async () => {
      const config = await getAuthConfig();
      expect(config.callbacks?.jwt).toBeInstanceOf(Function);
    });

    it("コールバック (signIn) が定義されている", async () => {
      const config = await getAuthConfig();
      expect(config.callbacks?.signIn).toBeInstanceOf(Function);
    });

    it("コールバック (session) が定義されている", async () => {
      const config = await getAuthConfig();
      expect(config.callbacks?.session).toBeInstanceOf(Function);
    });

    it("ページ設定が正しく設定されている", async () => {
      const config = await getAuthConfig();
      expect(config.pages?.signIn).toBe("/auth/signin");
      expect(config.pages?.error).toBe("/auth/error");
    });

    it("デバッグフラグが正しく設定されている (開発環境)", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PHASE: undefined,
      };
      const config = await getAuthConfig();

      expect(config.debug).toBe(true);
    });

    it("デバッグフラグが正しく設定されている (ビルド時)", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      };
      const config = await getAuthConfig();

      expect(config.debug).toBe(false);
    });

    it("デバッグフラグが正しく設定されている (本番ランタイム)", async () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: undefined,
      };
      const config = await getAuthConfig();

      expect(config.debug).toBe(false);
    });
  });
});
