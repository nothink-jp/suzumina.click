import "@/../tests/setup";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Provider } from "next-auth/providers";
import { GET, POST, auth, authConfig, signIn, signOut } from "./auth";
import { DrizzleAdapter } from "./auth/drizzle-adapter";
import { setMockError } from "@/../tests/mocks/drizzle";
import type { AdapterUser } from "next-auth/adapters";

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
    expect(authConfig).toBeDefined();
  });

  describe("authConfig の内容", () => {
    it("Discord プロバイダーが正しく設定されている", () => {
      process.env = {
        ...process.env,
        DISCORD_CLIENT_ID: "test-client-id",
        DISCORD_CLIENT_SECRET: "test-client-secret",
        NEXTAUTH_SECRET: "test-secret",
        NEXTAUTH_URL: "http://localhost:3000",
        NODE_ENV: "development",
      };
      expect(authConfig.providers).toBeArrayOfSize(1);
      const discordProvider = authConfig.providers[0] as Provider;
      expect(discordProvider).toHaveProperty("id", "discord");
      expect(discordProvider.options?.clientId).toBeDefined();
      expect(discordProvider.options?.clientSecret).toBeDefined();
      expect(discordProvider.options?.authorization?.params?.scope).toBe(
        "identify guilds email",
      );
    });

    it("アダプターが正しく設定されている", () => {
      process.env.DATABASE_URL =
        "postgres://test:test@localhost:5432/test_db";
      expect(authConfig.adapter).toBeDefined();
      expect(typeof authConfig.adapter).toBe(typeof DrizzleAdapter());
    });

    it("PostgreSQL接続エラーを適切に処理できる", async () => {
      // データベース接続エラーをシミュレート
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

      await expect(
        adapter.createUser(testUser),
      ).rejects.toThrow("Database connection failed");
    });

    it("セッション設定が正しく設定されている", () => {
      expect(authConfig.session?.strategy).toBe("jwt");
      expect(authConfig.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("クッキー設定が正しく設定されている (開発環境)", () => {
      process.env = { ...process.env, NODE_ENV: "development" };
      const secureFlag =
        process.env.NODE_ENV === "production" &&
        process.env.NEXT_PHASE !== "phase-production-build";
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(secureFlag);
      expect(authConfig.cookies?.sessionToken?.options?.httpOnly).toBe(true);
      expect(authConfig.cookies?.sessionToken?.options?.sameSite).toBe("lax");
      expect(authConfig.cookies?.sessionToken?.options?.path).toBe("/");
      expect(authConfig.cookies?.sessionToken?.name).toBe(
        "next-auth.session-token",
      );
    });

    it("クッキー設定が正しく設定されている (本番ランタイム環境)", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: undefined,
      };
      const secureFlag = true;
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(secureFlag);
    });

    it("コールバック (jwt) が定義されている", () => {
      expect(authConfig.callbacks?.jwt).toBeInstanceOf(Function);
    });

    it("コールバック (signIn) が定義されている", () => {
      expect(authConfig.callbacks?.signIn).toBeInstanceOf(Function);
    });

    it("コールバック (session) が定義されている", () => {
      expect(authConfig.callbacks?.session).toBeInstanceOf(Function);
    });

    it("ページ設定が正しく設定されている", () => {
      expect(authConfig.pages?.signIn).toBe("/auth/signin");
      expect(authConfig.pages?.error).toBe("/auth/error");
    });

    it("デバッグフラグが正しく設定されている (開発環境)", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PHASE: undefined,
      };
      expect(authConfig.debug).toBe(true);
    });

    it("デバッグフラグが正しく設定されている (ビルド時)", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      };
      expect(authConfig.debug).toBe(false);
    });

    it("デバッグフラグが正しく設定されている (本番ランタイム)", () => {
      process.env = {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PHASE: undefined,
      };
      expect(authConfig.debug).toBe(false);
    });
  });
});
