import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Session } from "next-auth"; // Session 型をインポート
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
import { ConfigurationError } from "./utils"; // ConfigurationError をインポート

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
      NODE_ENV: "test", // テスト環境として設定
      DISCORD_GUILD_ID: mockDiscordGuilds[0].id,
    };

    resetMockData();
    resetFirestore();
    setMockError(null); // 各テストの前にエラー状態をリセット
    setMockExists(true); // デフォルトではユーザーは存在すると仮定

    setMockData({
      id: mockDiscordProfile.id,
      displayName: mockDiscordProfile.username || "",
      avatarUrl: mockDiscordProfile.image_url || "",
      role: "member",
      createdAt: new Date(), // createdAt も含める
      updatedAt: new Date(),
    });

    global.fetch = mock(() => {
      return Promise.resolve(createMockResponse(mockDiscordGuilds));
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setMockError(null); // テスト後にもエラー状態をリセット
    mock.restore(); // fetch のモックもリセット
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

    it("Guild IDが未設定 (ConfigurationError) の場合は認証失敗", async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: "production", // 本番環境をシミュレートしてエラーを発生させる
        NEXT_PHASE: undefined,
        DISCORD_GUILD_ID: undefined, // 未設定にする
      };
      // getRequiredEnvVar が ConfigurationError をスローするはず
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("ギルドメンバーでない場合は認証失敗", async () => {
      process.env.DISCORD_GUILD_ID = "non-member-guild-id"; // 存在しないギルドID
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("新規ユーザーの場合、Firestore に set され認証成功", async () => {
      setMockExists(false); // ユーザーが存在しない状態にする
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(true);
      expect(getMockState().method).toBe("set"); // set が呼ばれたか (モック修正によりOK)
      expect(getMockState().exists).toBe(true); // 存在状態が true になったか
      expect(getMockState().data.id).toBe(mockDiscordProfile.id);
      expect(getMockState().data.createdAt).toBeDefined(); // createdAt が設定されたか
    });

    it("既存ユーザーの場合、Firestore に update され認証成功", async () => {
      setMockExists(true); // ユーザーが存在する状態
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(true);
      expect(getMockState().method).toBe("update"); // update が呼ばれたか (モック修正によりOK)
      expect(getMockState().data.id).toBe(mockDiscordProfile.id);
    });

    it("Firestore 操作中にエラーが発生した場合は認証失敗", async () => {
      setMockError(new Error("Firestore error")); // Firestore モックにエラーを設定
      const result = await callbacks.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
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
      setMockExists(false); // Firestore ドキュメントが存在しない -> data() は undefined
      const result = await callbacks.session({
        session: mockSession,
        token: mockToken,
      });
      expect(result).toEqual(mockSession);
    });

    // 'Firestore ドキュメントは存在するがデータが空の場合は元のセッションを返す' テストは
    // Firestore の通常の動作では data() が空になることは稀なため、
    // 'ユーザーが存在しない場合' のテストでカバーされるとみなし、削除または調整。
    // ここでは setMockExists(false) で data() が undefined になるケースをテスト済み。

    it("渡された session に user がない場合、フォールバック値で初期化される", async () => {
      setMockExists(true);
      // user を削除し、意図的な型違反を as unknown as Session で明示
      const sessionWithoutUser = {
        ...mockSession,
        user: undefined,
      } as unknown as Session;
      const result = await callbacks.session({
        session: sessionWithoutUser,
        token: mockToken,
      });
      expect(result.user).toBeDefined();
      // mockToken.sub の存在を if 文で確認してから使用
      if (mockToken.sub) {
        expect(result.user.id).toBe(mockToken.sub);
      } else {
        // mockToken.sub が undefined の場合、テストが失敗するようにする
        expect(mockToken.sub).toBeDefined();
      }
      expect(result.user.displayName).toBe(getMockState().data.displayName); // Firestore のデータが使われる
      expect(result.user.role).toBe(getMockState().data.role);
    });

    it("ユーザーが存在する場合はユーザー情報を含むセッションを返す", async () => {
      setMockExists(true);
      const testData = {
        id: mockToken.sub as string,
        displayName: "Updated User",
        avatarUrl: "https://example.com/updated.png",
        role: "admin", // 異なるロール
        createdAt: new Date(),
        updatedAt: new Date(),
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

    it("Firestore 取得中にエラーが発生した場合は元のセッションを返す", async () => {
      setMockError(new Error("Firestore get error")); // エラーを設定
      const result = await callbacks.session({
        session: mockSession,
        token: mockToken,
      });
      expect(result).toEqual(mockSession); // 元のセッションが返る
    });
  });

  describe("jwt", () => {
    it("Discord ログイン時 (account あり) は accessToken をトークンに追加する", async () => {
      const initialToken = { sub: "user123" };
      const result = await callbacks.jwt({
        token: initialToken,
        account: mockDiscordAccount,
      });
      expect(result.accessToken).toBe(mockDiscordAccount.access_token);
      expect(result.sub).toBe("user123"); // 他のプロパティは維持される
    });

    it("ログイン時以外 (account なし) はトークンを変更しない", async () => {
      const initialToken = { sub: "user123", accessToken: "oldToken" };
      const result = await callbacks.jwt({
        token: { ...initialToken }, // コピーを渡す
        account: null,
      });
      expect(result).toEqual(initialToken); // トークンは変更されない
    });

    it("Discord 以外のプロバイダーの場合は accessToken を追加しない", async () => {
      const initialToken = { sub: "user123" };
      const otherAccount = { ...mockDiscordAccount, provider: "google" };
      const result = await callbacks.jwt({
        token: initialToken,
        account: otherAccount,
      });
      expect(result.accessToken).toBeUndefined(); // accessToken は追加されない
      expect(result.sub).toBe("user123");
    });
  });
});
