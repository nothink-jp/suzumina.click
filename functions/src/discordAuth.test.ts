// functions/src/discordAuth.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { discordAuthCallback } from "./discordAuth"; // テスト対象の関数
import axios from "axios";
import * as admin from "firebase-admin";
import type { UserRecord } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

// --- モック設定 ---
vi.mock("axios");
vi.mock("firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase-admin")>();
  const mockAuth = {
    updateUser: vi.fn(),
    createUser: vi.fn(),
    createCustomToken: vi.fn().mockResolvedValue("mock-custom-token"),
  };
  return {
    ...actual,
    initializeApp: vi.fn(),
    auth: () => mockAuth,
    firestore: vi.fn(() => ({})),
  };
});
vi.mock("firebase-functions/logger");
vi.mock("./firebaseAdmin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

describe("discordAuthCallback", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let originalEnv: NodeJS.ProcessEnv;

  const mockSecrets = {
    DISCORD_CLIENT_ID: "test-client-id",
    DISCORD_CLIENT_SECRET: "test-client-secret",
    DISCORD_REDIRECT_URI: "test-redirect-uri",
    DISCORD_TARGET_GUILD_ID: "test-guild-id",
  };

  // axios のモックを取得
  const mockedAxiosGet = vi.mocked(axios.get);
  const mockedAxiosPost = vi.mocked(axios.post);
  // Firebase Auth のモックを取得
  const mockedUpdateUser = vi.mocked(admin.auth().updateUser);
  const mockedCreateUser = vi.mocked(admin.auth().createUser);
  const mockedCreateCustomToken = vi.mocked(admin.auth().createCustomToken);
  // Logger のモックを取得
  const mockedLoggerWarn = vi.mocked(logger.warn);
  const mockedLoggerInfo = vi.mocked(logger.info);
  const mockedLoggerError = vi.mocked(logger.error);

  beforeEach(() => {
    vi.clearAllMocks(); // すべてのモックをクリア

    originalEnv = { ...process.env };
    process.env = { ...process.env, ...mockSecrets };

    mockRequest = {
      method: "POST",
      body: { code: "test-auth-code" },
      headers: {},
    };
    const res: Partial<Response> = {};
    res.set = vi.fn().mockReturnValue(res);
    res.status = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    mockResponse = res;

    // デフォルトの axios モック (成功ケース) - 各テストで上書き可能にする
    mockedAxiosPost.mockResolvedValue({
      data: { access_token: "test-access-token" },
    });
    // デフォルトの get は beforeEach では設定せず、各テストで設定する方が確実

    // デフォルトの Firebase Auth モック (更新成功)
    mockedUpdateUser.mockResolvedValue({
      uid: "test-discord-user-id",
    } as UserRecord);
    mockedCreateUser.mockRejectedValue({ code: "auth/user-not-found" });
    mockedCreateCustomToken.mockResolvedValue("mock-custom-token"); // これは共通で良い
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- テストケース ---

  it("OPTIONSリクエストを適切に処理すること", async () => {
    mockRequest.method = "OPTIONS";
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockResponse.set).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      expect.any(String),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
    expect(mockResponse.send).toHaveBeenCalledWith("");
  });

  it("POSTでもOPTIONSでもないメソッドの場合は405を返すこと", async () => {
    mockRequest.method = "GET";
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "許可されていないメソッドです（POSTメソッドのみ許可）",
      { method: "GET" },
    );
    expect(mockResponse.status).toHaveBeenCalledWith(405);
    expect(mockResponse.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("認証コードが不足している場合は400を返すこと", async () => {
    mockRequest.body = {};
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "リクエスト本文に認証コードが見つかりません",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Authorization code is required.",
    });
  });

  it("Discord設定の環境変数が不足している場合は500を返すこと", async () => {
    process.env.DISCORD_CLIENT_SECRET = undefined;
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Discord設定用の環境変数（シークレットから）が正しく設定されていません",
      expect.objectContaining({ clientSecretExists: false }),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Server configuration error.",
    });
  });

  it("認証に成功し、既存のFirebaseユーザーを更新してカスタムトークンを返すこと", async () => {
    // 準備: 成功ケース用の特定のモックを設定
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me
        data: {
          id: "test-discord-user-id",
          username: "test-discord-username",
          avatar: "test-avatar-hash",
          email: "test@example.com",
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds (ターゲットギルドを含む)
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      "https://discord.com/api/oauth2/token",
      expect.any(URLSearchParams),
      expect.any(Object),
    );
    expect(mockedAxiosGet).toHaveBeenCalledWith(
      "https://discord.com/api/users/@me",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-access-token" },
      }),
    );
    expect(mockedAxiosGet).toHaveBeenCalledWith(
      "https://discord.com/api/users/@me/guilds",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-access-token" },
      }),
    );
    expect(mockedUpdateUser).toHaveBeenCalledWith("test-discord-user-id", {
      displayName: "test-discord-username",
      photoURL: expect.stringContaining("test-avatar-hash.png"), // png 形式を確認
      email: "test@example.com",
    });
    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(mockedCreateCustomToken).toHaveBeenCalledWith(
      "test-discord-user-id",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: true,
      customToken: "mock-custom-token",
    });
    expect(mockedLoggerInfo).toHaveBeenCalledWith("Firebaseユーザー情報を更新しました", {
      uid: "test-discord-user-id",
    });
  });

  it("認証に成功し、新規Firebaseユーザーを作成してカスタムトークンを返すこと", async () => {
    // 準備: 新規ユーザー作成ケース用のモックを設定
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me
        data: {
          id: "new-discord-user-id",
          username: "new-discord-username",
          avatar: "new-avatar-hash",
          email: "new@example.com",
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });
    mockedUpdateUser.mockRejectedValue({ code: "auth/user-not-found" }); // 更新を失敗させる
    mockedCreateUser.mockResolvedValue({
      uid: "new-discord-user-id",
    } as UserRecord); // 作成を成功させる

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    expect(mockedUpdateUser).toHaveBeenCalledWith(
      "new-discord-user-id",
      expect.any(Object),
    ); // 更新が試みられる
    expect(mockedCreateUser).toHaveBeenCalledWith({
      // 作成が呼び出される
      uid: "new-discord-user-id",
      displayName: "new-discord-username",
      photoURL: expect.stringContaining("new-avatar-hash.png"),
      email: "new@example.com",
    });
    expect(mockedCreateCustomToken).toHaveBeenCalledWith("new-discord-user-id");
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: true,
      customToken: "mock-custom-token",
    });
    expect(mockedLoggerInfo).toHaveBeenCalledWith("Firebaseユーザーを作成しました", {
      uid: "new-discord-user-id",
    });
  });

  it("ユーザーがターゲットギルドのメンバーでない場合は403を返すこと", async () => {
    // 準備: 非メンバーケース用の特定のモックを設定
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me
        data: {
          id: "non-member-id",
          username: "non-member",
          avatar: null,
          email: null,
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds (ターゲットギルドを含まない)
        data: [{ id: "other-guild-id", name: "Other Guild" }],
      });

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2); // ユーザーとギルドの両方が取得される
    // logger.warn が期待通り呼び出されることを確認
    expect(mockedLoggerWarn).toHaveBeenCalledWith(
      "ユーザーが対象ギルドのメンバーではありません",
      { discordUserId: "non-member-id", targetGuildId: "test-guild-id" },
    );
    expect(mockedUpdateUser).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(mockedCreateCustomToken).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Guild membership required.",
    });
  });

  it("Discordトークン取得中にエラーが発生した場合の処理", async () => {
    // 準備
    const axiosError = new Error("Discord token error");
    mockedAxiosPost.mockRejectedValue(axiosError); // POST を失敗させる

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Discord認証コールバック中にエラーが発生しました:",
      axiosError,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error.",
    });
  });

  it("Firebaseユーザーの更新/作成中にエラーが発生した場合の処理", async () => {
    // 準備: モックを設定し、updateUser を一般的なエラーで失敗させる
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me
        data: {
          id: "update-fail-id",
          username: "update-fail",
          avatar: "hash",
          email: "fail@example.com",
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });
    const firebaseError = new Error("Firebase update error") as Error & {
      code?: string;
    };
    firebaseError.code = "auth/internal-error";
    mockedUpdateUser.mockRejectedValue(firebaseError); // updateUser を失敗させる

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Firebaseユーザーの更新/作成中にエラーが発生しました:",
      firebaseError,
    );
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Discord認証コールバック中にエラーが発生しました:",
      firebaseError,
    );
    expect(mockedCreateCustomToken).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error.",
    });
  });

  it("Discordからnullのemailがきた場合の処理", async () => {
    // 準備: emailがnullのケース用のモックを設定
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me (email: null)
        data: {
          id: "null-email-id",
          username: "null-email-user",
          avatar: "null-email-hash",
          email: null,
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });
    // updateUser が成功するように設定 (createUser は呼ばれないはず)
    mockedUpdateUser.mockResolvedValue({ uid: "null-email-id" } as UserRecord);
    mockedCreateUser.mockRejectedValue({ code: "auth/user-not-found" });

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    // updateUser が email: undefined で呼ばれることを確認
    expect(mockedUpdateUser).toHaveBeenCalledWith("null-email-id", {
      displayName: "null-email-user",
      photoURL: expect.stringContaining("null-email-hash.png"),
      email: undefined, // ここを確認
    });
    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: true,
      customToken: "mock-custom-token",
    });
  });

  it("アニメーションアバター(gifフォーマット)のURLが正しく生成されること", async () => {
    // 準備: アニメーションアバターケース用のモックを設定
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me (a_ で始まるアバター)
        data: {
          id: "gif-user-id",
          username: "gif-user",
          avatar: "a_gif-hash",
          email: "gif@example.com",
        },
      })
      .mockResolvedValueOnce({
        // users/@me/guilds
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });
    // updateUser が成功するように設定
    mockedUpdateUser.mockResolvedValue({ uid: "gif-user-id" } as UserRecord);
    mockedCreateUser.mockRejectedValue({ code: "auth/user-not-found" });

    // 実行
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // 検証
    // updateUser が .gif URL で呼ばれることを確認
    expect(mockedUpdateUser).toHaveBeenCalledWith("gif-user-id", {
      displayName: "gif-user",
      photoURL: expect.stringContaining("a_gif-hash.gif"), // ここを確認
      email: "gif@example.com",
    });
    expect(mockedCreateUser).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });
});
