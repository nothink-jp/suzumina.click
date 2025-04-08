import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  getMockState,
  resetMockData,
  setMockData,
  setMockError,
  setMockExists,
} from "../../tests/mocks/firestore";
import {
  mockDiscordAccount,
  mockDiscordGuilds,
  mockDiscordProfile,
  mockSession,
  mockToken,
} from "../../tests/mocks/next-auth";
import { callbacks } from "./callbacks";
import { resetFirestore } from "./firestore";

describe("認証コールバック", () => {
  const originalEnv = { ...process.env };

  function createMockResponse(data: unknown, ok = true) {
    return {
      ok,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve("Error message"),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      clone: () => createMockResponse(data, ok),
      headers: new Headers(),
      redirect: () => new Response(),
      status: ok ? 200 : 403,
      statusText: ok ? "OK" : "Forbidden",
      type: "basic" as ResponseType,
      url: "https://example.com",
      body: null,
      bodyUsed: false,
    };
  }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      DISCORD_GUILD_ID: mockDiscordGuilds[0].id,
    };

    resetMockData();
    resetFirestore();
    setMockError(null); // 各テストの前にエラー状態をリセット

    setMockData({
      id: mockDiscordProfile.id,
      displayName: mockDiscordProfile.username || "",
      avatarUrl: mockDiscordProfile.image_url || "",
      role: "member",
    });

    global.fetch = mock(() => {
      return Promise.resolve(createMockResponse(mockDiscordGuilds));
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setMockError(null); // テスト後にもエラー状態をリセット
  });

  describe("signIn", () => {
    it("アカウント情報が不正な場合は認証失敗", async () => {
      const result = await callbacks.signIn({
        account: null,
        profile: mockDiscordProfile,
      });

      expect(result).toBe(false);
    });

    it("プロファイルが不正な場合は認証失敗", async () => {
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: undefined,
      });

      expect(result).toBe(false);
    });

    it("Guild APIが失敗した場合は認証失敗", async () => {
      global.fetch = mock(() => {
        return Promise.resolve(
          createMockResponse({ error: "Forbidden" }, false),
        );
      }) as unknown as typeof fetch;

      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });

      expect(result).toBe(false);
    });

    it("Guild IDが未設定の場合は認証失敗", async () => {
      const { DISCORD_GUILD_ID, ...envWithoutGuildId } = process.env;
      process.env = envWithoutGuildId;

      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });

      expect(DISCORD_GUILD_ID).not.toBeUndefined();
      expect(result).toBe(false);
    });

    // TODO: ユーザーデータの更新に失敗した場合は認証失敗
    // it("ユーザーデータの更新に失敗した場合は認証失敗", async () => {
    //   setMockError(new Error("Failed to update user data"));
    //   const result = await callbacks.signIn({
    //     account: mockDiscordAccount,
    //     profile: mockDiscordProfile,
    //   });
    //   expect(result).toBe(false);
    // });

    it("ギルドメンバーの場合は認証成功", async () => {
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });

      expect(result).toBe(true);
      expect(getMockState().exists).toBe(true);
      expect(getMockState().data.id).toBe(mockDiscordProfile.id);
    });
  });

  describe("session", () => {
    it("トークンがない場合は元のセッションを返す", async () => {
      const result = await callbacks.session({
        session: mockSession,
        token: {},
      });

      expect(result).toEqual(mockSession);
    });

    it("ユーザーが存在しない場合は元のセッションを返す", async () => {
      setMockExists(false);

      const result = await callbacks.session({
        session: mockSession,
        token: mockToken,
      });

      expect(result).toEqual(mockSession);
    });

    // TODO: ユーザーデータの取得に失敗した場合は元のセッションを返す
    // it("ユーザーデータの取得に失敗した場合は元のセッションを返す", async () => {
    //   setMockError(new Error("Failed to fetch user data"));
    //   const result = await callbacks.session({
    //     session: mockSession,
    //     token: mockToken,
    //   });
    //   expect(result).toEqual(mockSession);
    // });

    it("ユーザーが存在する場合はユーザー情報を返す", async () => {
      const testData = {
        id: mockToken.sub as string,
        displayName: "Updated User",
        avatarUrl: "https://example.com/updated.png",
        role: "member",
      };

      setMockData(testData);

      const result = await callbacks.session({
        session: mockSession,
        token: mockToken,
      });

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testData.id);
      expect(result.user.displayName).toBe(testData.displayName);
      expect(result.user.avatarUrl).toBe(testData.avatarUrl);
      expect(result.user.role).toBe(testData.role);
    });
  });
});
