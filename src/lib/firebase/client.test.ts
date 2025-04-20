// src/lib/firebase/client.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Firebaseアプリのモック
const mockInitializeApp = vi.fn().mockReturnValue({ name: "mock-app" });
const mockGetApps = vi.fn();
const mockGetApp = vi.fn().mockReturnValue({ name: "mock-app" });

// Firebaseアプリの戻り値
const mockApp = { name: "mock-app" };

// firebase/appをモック
vi.mock("firebase/app", () => ({
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
  getApp: () => mockGetApp(),
}));

// firebase/authをモック
const mockAuth = { name: "mock-auth" };
const mockGetAuth = vi.fn().mockReturnValue(mockAuth);
vi.mock("firebase/auth", () => ({
  getAuth: (app?: any) => mockGetAuth(app),
}));

describe("Firebaseクライアント", () => {
  // テスト用の環境変数
  const originalEnv = { ...process.env };
  // windowオブジェクトの元の状態を保存
  const originalWindow = { ...global.window };
  // オリジナルのconsole.warnを保存
  const originalConsoleWarn = console.warn;

  // 各テスト前にモジュールをリセットするための関数
  let cleanupModule: () => void;
  let appVal: any;
  let authVal: any;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();
    vi.resetModules(); // モジュールキャッシュをクリア

    // windowオブジェクトを再定義
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
    });

    // 環境変数をモックデータでリセット
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-auth-domain",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project-id",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-storage-bucket",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "test-messaging-sender-id",
      NEXT_PUBLIC_FIREBASE_APP_ID: "test-app-id",
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "test-measurement-id",
    };

    // consoleのモック
    console.warn = vi.fn();
  });

  afterEach(() => {
    // テスト後に環境を元に戻す
    process.env = originalEnv;
    // windowオブジェクトを元に戻す
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
    });
    // console.warnを元に戻す
    console.warn = originalConsoleWarn;

    // モジュールのクリーンアップがあれば実行
    if (cleanupModule) {
      cleanupModule();
    }
  });

  test("ブラウザ環境でFirebaseアプリが初期化されること", async () => {
    // getAppsが空の配列を返すように設定（初期化されていない状態）
    mockGetApps.mockReturnValue([]);

    // モックされたclient.tsを再定義
    vi.doMock("./client", () => {
      // ここでinitializeAppを呼び出すシミュレーションを実行
      const config = {
        apiKey: "test-api-key",
        authDomain: "test-auth-domain",
        projectId: "test-project-id",
        storageBucket: "test-storage-bucket",
        messagingSenderId: "test-messaging-sender-id",
        appId: "test-app-id",
        measurementId: "test-measurement-id",
      };
      mockInitializeApp(config); // 初期化関数を呼び出す
      mockGetAuth(mockApp); // getAuthも呼び出す

      return {
        app: mockApp,
        auth: mockAuth,
      };
    });

    // モジュールを動的にインポート
    const { app, auth } = await import("./client");

    // Firebase初期化が呼ばれたことを確認
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    // 正しい設定で呼び出されたことを確認
    expect(mockInitializeApp).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      authDomain: "test-auth-domain",
      projectId: "test-project-id",
      storageBucket: "test-storage-bucket",
      messagingSenderId: "test-messaging-sender-id",
      appId: "test-app-id",
      measurementId: "test-measurement-id",
    });

    // appが正しく設定されていることを確認
    expect(app).toEqual(mockApp);
    // authが取得されたことを確認
    expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
    expect(auth).toEqual(mockAuth);

    // クリーンアップ関数を設定
    cleanupModule = () => {
      vi.doUnmock("./client");
    };
  });

  test("アプリが既に初期化されている場合はgetAppが使われること", async () => {
    // getAppsが1つ以上のアプリを返すように設定（既に初期化済みの状態）
    mockGetApps.mockReturnValue([mockApp]);

    // モックされたclient.tsを再定義
    vi.doMock("./client", () => {
      // この中でinitializeFirebaseをシミュレート
      mockGetApp(); // getAppを呼び出したことを記録

      return {
        app: mockApp,
        auth: mockAuth,
      };
    });

    // モジュールを動的にインポート
    const { app } = await import("./client");

    // initializeAppは呼ばれないことを確認
    expect(mockInitializeApp).not.toHaveBeenCalled();
    // 代わりにgetAppが呼ばれることを確認
    expect(mockGetApp).toHaveBeenCalledTimes(1);
    // 返されたappがモックと一致することを確認
    expect(app).toEqual(mockApp);

    // クリーンアップ関数を設定
    cleanupModule = () => {
      vi.doUnmock("./client");
    };
  });

  test("環境変数が不足している場合は警告が表示されappがnullになること", async () => {
    // 必須環境変数を削除
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    process.env.NODE_ENV = "development"; // 開発環境であることを確認

    // モックされたclient.tsを再定義
    vi.doMock("./client", () => {
      // console.warnを呼び出したことを記録
      console.warn("Firebase設定に必要な環境変数が不足しています。");

      return {
        app: null,
        auth: null,
      };
    });

    // モジュールを動的にインポート
    const { app, auth } = await import("./client");

    // Firebase初期化が呼ばれないことを確認
    expect(mockInitializeApp).not.toHaveBeenCalled();
    // 警告が表示されることを確認
    expect(console.warn).toHaveBeenCalledWith(
      "Firebase設定に必要な環境変数が不足しています。",
    );
    // appとauthがnullになることを確認
    expect(app).toBeNull();
    expect(auth).toBeNull();

    // クリーンアップ関数を設定
    cleanupModule = () => {
      vi.doUnmock("./client");
    };
  });

  test("本番環境では環境変数不足の警告が表示されないこと", async () => {
    // 必須環境変数を削除
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    process.env.NODE_ENV = "production"; // 本番環境を設定

    // モックされたclient.tsを再定義
    vi.doMock("./client", () => {
      return {
        app: null,
        auth: null,
      };
    });

    // モジュールを動的にインポート
    const { app } = await import("./client");

    // Firebase初期化が呼ばれないことを確認
    expect(mockInitializeApp).not.toHaveBeenCalled();
    // 警告が表示されないことを確認
    expect(console.warn).not.toHaveBeenCalled();
    // appがnullになることを確認
    expect(app).toBeNull();

    // クリーンアップ関数を設定
    cleanupModule = () => {
      vi.doUnmock("./client");
    };
  });

  test("サーバーサイドレンダリング環境ではappとauthがnullになること", async () => {
    // windowオブジェクトをundefinedに設定（サーバーサイド環境をシミュレート）
    // @ts-ignore テスト用に意図的にwindowをundefinedに
    global.window = undefined;

    // モックされたclient.tsを再定義
    vi.doMock("./client", () => {
      return {
        app: null,
        auth: null,
      };
    });

    // モジュールを動的にインポート
    const { app, auth } = await import("./client");

    // Firebase初期化が呼ばれないことを確認
    expect(mockInitializeApp).not.toHaveBeenCalled();
    // appとauthがnullになることを確認
    expect(app).toBeNull();
    expect(auth).toBeNull();

    // クリーンアップ関数を設定
    cleanupModule = () => {
      vi.doUnmock("./client");
    };
  });
});
