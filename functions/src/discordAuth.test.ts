// functions/src/discordAuth.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { discordAuthCallback } from "./discordAuth"; // テスト対象の関数
import axios from "axios";
import * as admin from "firebase-admin";
import type { UserRecord } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

// --- Mocks ---
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
    vi.clearAllMocks();
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
    // mockedAxiosGet
    //   .mockResolvedValueOnce({ /* users/@me */ })
    //   .mockResolvedValueOnce({ /* users/@me/guilds */ });

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

  // --- Test Cases ---

  it("should handle OPTIONS request", async () => {
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

  it("should return 405 if method is not POST or OPTIONS", async () => {
    mockRequest.method = "GET";
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Method Not Allowed (Should be POST)",
      { method: "GET" },
    );
    expect(mockResponse.status).toHaveBeenCalledWith(405);
    expect(mockResponse.send).toHaveBeenCalledWith("Method Not Allowed");
  });

  it("should return 400 if authorization code is missing", async () => {
    mockRequest.body = {};
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Authorization code not found in request body",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Authorization code is required.",
    });
  });

  it("should return 500 if Discord secrets are missing", async () => {
    process.env.DISCORD_CLIENT_SECRET = undefined;
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Discord configuration environment variables (from secrets) are not set correctly.",
      expect.objectContaining({ clientSecretExists: false }),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Server configuration error.",
    });
  });

  it("should successfully authenticate, update existing Firebase user, and return custom token", async () => {
    // Arrange: Setup specific mocks for this success case
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
        // users/@me/guilds (target guild included)
        data: [{ id: "test-guild-id", name: "Test Guild" }],
      });

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
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
      photoURL: expect.stringContaining("test-avatar-hash.png"), // Check for png
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
    expect(mockedLoggerInfo).toHaveBeenCalledWith("Firebase user updated.", {
      uid: "test-discord-user-id",
    });
  });

  it("should successfully authenticate, create new Firebase user, and return custom token", async () => {
    // Arrange: Setup specific mocks for create user case
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
    mockedUpdateUser.mockRejectedValue({ code: "auth/user-not-found" }); // Make update fail
    mockedCreateUser.mockResolvedValue({
      uid: "new-discord-user-id",
    } as UserRecord); // Make create succeed

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
    expect(mockedUpdateUser).toHaveBeenCalledWith(
      "new-discord-user-id",
      expect.any(Object),
    ); // Update is attempted
    expect(mockedCreateUser).toHaveBeenCalledWith({
      // Create is called
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
    expect(mockedLoggerInfo).toHaveBeenCalledWith("Firebase user created.", {
      uid: "new-discord-user-id",
    });
  });

  it("should return 403 if user is not a member of the target guild", async () => {
    // Arrange: Setup specific mocks for non-member case
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
        // users/@me/guilds (target guild NOT included)
        data: [{ id: "other-guild-id", name: "Other Guild" }],
      });

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2); // Both user and guilds are fetched
    // logger.warn が期待通り呼び出されることを確認
    expect(mockedLoggerWarn).toHaveBeenCalledWith(
      "User is not a member of the target guild",
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

  it("should handle errors during Discord token request", async () => {
    // Arrange
    const axiosError = new Error("Discord token error");
    mockedAxiosPost.mockRejectedValue(axiosError); // POST を失敗させる

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Error during Discord auth callback:",
      axiosError,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error.",
    });
  });

  it("should handle errors during Firebase user update/create", async () => {
    // Arrange: Setup mocks, but make updateUser fail with a generic error
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

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Error updating/creating Firebase user:",
      firebaseError,
    );
    expect(mockedLoggerError).toHaveBeenCalledWith(
      "Error during Discord auth callback:",
      firebaseError,
    );
    expect(mockedCreateCustomToken).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error.",
    });
  });

  it("should handle null email from Discord", async () => {
    // Arrange: Setup specific mocks for null email case
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

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
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

  it("should correctly generate gif avatar URL", async () => {
    // Arrange: Setup specific mocks for animated avatar case
    mockedAxiosGet
      .mockResolvedValueOnce({
        // users/@me (avatar starts with a_)
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

    // Act
    // @ts-expect-error: Test uses Partial
    await discordAuthCallback(mockRequest, mockResponse);

    // Assert
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
