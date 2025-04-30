/**
 * アプリケーション初期化機能とHTTP処理のテスト
 *
 * このファイルでは、index.tsで実装されている初期化処理と
 * HTTPリクエスト処理機能が正しく動作することを検証します。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ロガーのモック
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

// ロガーモジュールのモック
vi.mock("./utils/logger", () => ({
  info: mockLoggerInfo,
  warn: mockLoggerWarn,
  error: mockLoggerError,
}));

// HTTPサーバーのモック
const mockListen = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockServer = {
  listen: mockListen,
  on: mockOn,
};

// HTTPリクエストハンドラを保存するための変数
let capturedHttpHandler: Function | null = null;

// node:httpのモック（createServerメソッドをキャプチャ）
vi.mock("node:http", () => ({
  createServer: vi.fn((handler) => {
    capturedHttpHandler = handler;
    return mockServer;
  }),
}));

// YouTubeモジュールのモック
vi.mock("./youtube", () => ({
  fetchYouTubeVideos: vi.fn(),
}));

// Functions Frameworkのモック
const mockCloudEvent = vi.fn();
const mockHttp = vi.fn();
const mockGetFunction = vi.fn();

vi.mock("@google-cloud/functions-framework", () => ({
  cloudEvent: mockCloudEvent,
  http: mockHttp,
  _getFunction: mockGetFunction,
}));

// process.exitのモック
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`プロセスが終了コード${code}で終了しようとしました`);
});

// 保存されたHTTP関数ハンドラ
let savedHttpHandler: Function | null = null;

// HTTP関数ハンドラをキャプチャするモック実装
mockHttp.mockImplementation((_name: string, handler: Function) => {
  savedHttpHandler = handler;
});

// 環境変数のバックアップ
const originalEnv = process.env;

/**
 * 初期化状態をリセットするためのモジュールキャッシュクリア関数
 *
 * この関数は各テストの前に実行され、モジュールの状態を初期状態に戻します。
 */
function resetModuleState() {
  vi.resetModules();
  capturedHttpHandler = null;
  savedHttpHandler = null;
}

describe("初期化機能テスト", () => {
  beforeEach(() => {
    // モックと状態をリセット
    vi.clearAllMocks();
    resetModuleState();

    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it("アプリケーション初期化は複数回呼び出されても1回だけ実行されること", async () => {
    // index.tsをインポート（初期化処理が実行される）
    const { initializeApplication } = await import("./index");

    // 最初の呼び出しで初期化される
    const result1 = initializeApplication();
    expect(result1).toBe(true);

    // 初期化ログが出力されたことを確認
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "アプリケーション初期化を開始します",
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "アプリケーション初期化が完了しました",
    );

    // ログをクリア
    mockLoggerInfo.mockClear();

    // 2回目の呼び出し
    const result2 = initializeApplication();
    expect(result2).toBe(true);

    // 2回目は初期化ログが出力されないことを確認
    expect(mockLoggerInfo).not.toHaveBeenCalled();
  });

  it("YouTubeモジュールの関数が正しく登録されること", async () => {
    // index.tsをインポート
    await import("./index");

    // cloudEvent関数が正しく呼ばれたことを確認
    expect(mockCloudEvent).toHaveBeenCalledWith(
      "fetchYouTubeVideos",
      expect.any(Function),
    );
  });

  it("HTTPハンドラーが正しく登録されること", async () => {
    // index.tsをインポート
    await import("./index");

    // HTTP関数が登録されたことを確認
    expect(mockHttp).toHaveBeenCalledWith("httpHandler", expect.any(Function));
  });
});

describe("HTTPハンドラー機能テスト", () => {
  // HTTPリクエストとレスポンスのモック
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetModuleState();

    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // リクエストとレスポンスのモック作成
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it("HTTPハンドラーが正しいレスポンスを返すこと", async () => {
    // index.tsをインポート
    await import("./index");

    // HTTPハンドラーが登録されていることを確認
    expect(savedHttpHandler).not.toBeNull();

    // 保存したハンドラーを実行
    savedHttpHandler?.(mockReq, mockRes);

    // 適切なログが出力されることを確認
    expect(mockLoggerInfo).toHaveBeenCalledWith("HTTPリクエストを受信しました");

    // 正しいレスポンスが返されることを確認
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith("Functions Framework正常動作中");
  });
});

describe("安全なプロセス終了関数（safeExit）テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetModuleState();
  });

  it("テスト環境では実際に終了せずに警告ログを出力すること", async () => {
    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // index.tsをインポート
    const { safeExit } = await import("./index");

    // 終了コードを指定して実行
    safeExit(1);

    // 警告ログが出力されることを確認
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "プロセス終了が要求されました（コード: 1）- テスト環境では無視されます",
    );
  });

  it("本番環境では実際にプロセスを終了させること", async () => {
    // 本番環境を設定
    process.env = { ...originalEnv, NODE_ENV: "production" };

    // index.tsをインポート
    const { safeExit } = await import("./index");

    // プロセス終了関数を呼び出し
    expect(() => safeExit(1)).toThrow(
      "プロセスが終了コード1で終了しようとしました",
    );

    // process.exitが呼ばれたことを確認
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("HTTPサーバー作成関数テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetModuleState();

    // テスト用ハンドラー関数を設定
    mockGetFunction.mockReturnValue(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("テスト環境ではサーバーが作成されるがlistenは呼ばれないこと", async () => {
    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // index.tsをインポート
    const { createHttpServer } = await import("./index");

    // サーバーを作成
    const server = createHttpServer(8080);

    // http.createServerが呼ばれたことを確認
    expect(server).toBe(mockServer);

    // エラーハンドラが設定されたことを確認
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));

    // テスト環境なのでlistenは呼ばれないことを確認
    expect(mockListen).not.toHaveBeenCalled();

    // ログが出力されたことを確認
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "HTTPサーバーをポート8080で起動します...",
    );
  });

  it("本番環境ではサーバーが作成され、listenも呼ばれること", async () => {
    // 本番環境を設定
    process.env = { ...originalEnv, NODE_ENV: "production" };

    // index.tsをインポート
    const { createHttpServer } = await import("./index");

    // サーバーを作成
    const server = createHttpServer(8080);

    // http.createServerが呼ばれたことを確認
    expect(server).toBe(mockServer);

    // エラーハンドラが設定されたことを確認
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));

    // 本番環境なのでlistenが呼ばれることを確認
    expect(mockListen).toHaveBeenCalled();

    // ログが出力されたことを確認
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "HTTPサーバーをポート8080で起動します...",
    );
  });

  it("HTTPサーバーのエラーハンドラが正しく機能すること", async () => {
    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // index.tsをインポート
    const { createHttpServer } = await import("./index");

    // サーバーを作成
    createHttpServer(8080);

    // エラーハンドラのコールバックを取得
    const errorCallback = mockOn.mock.calls.find(
      (call) => call[0] === "error",
    )[1];

    // 例外オブジェクトを作成
    const testError = new Error("テスト用エラー");

    // エラーハンドラーを実行
    errorCallback(testError);

    // エラーログが出力されたことを確認
    expect(mockLoggerError).toHaveBeenCalledWith(
      "HTTPサーバーの起動に失敗しました:",
      testError,
    );

    // 警告ログが出力されたことを確認（テスト環境なのでsafeExitが実際に終了させない）
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "プロセス終了が要求されました（コード: 1）- テスト環境では無視されます",
    );
  });

  it("HTTPリクエストハンドラが登録されている場合はそれが呼ばれること", async () => {
    // テストハンドラー
    const testHandler = vi.fn();
    mockGetFunction.mockReturnValue(testHandler);

    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // index.tsをインポート
    const { createHttpServer } = await import("./index");

    // モックリクエストとレスポンスを準備
    const mockReq = {};
    const mockRes = {};

    // サーバーを作成
    createHttpServer(8080);

    // HTTPハンドラを実行
    capturedHttpHandler?.(mockReq, mockRes);

    // 登録されたハンドラが呼ばれたことを確認
    expect(testHandler).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it("HTTPリクエストハンドラが登録されていない場合はデフォルトレスポンスを返すこと", async () => {
    // ハンドラがないケース
    mockGetFunction.mockReturnValue(null);

    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test" };

    // index.tsをインポート
    const { createHttpServer } = await import("./index");

    // モックリクエストとレスポンスを準備
    const mockReq = {};
    const mockRes = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    // サーバーを作成
    createHttpServer(8080);

    // HTTPハンドラを実行
    capturedHttpHandler?.(mockReq, mockRes);

    // デフォルトレスポンスが返されたことを確認
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "text/plain",
    });
    expect(mockRes.end).toHaveBeenCalledWith("Functions Framework正常動作中");
  });
});

describe("メインモジュール実行テスト", () => {
  const originalRequireMain = require.main;

  beforeEach(() => {
    vi.clearAllMocks();
    resetModuleState();

    // require.mainをモック
    Object.defineProperty(require, "main", {
      value: module,
    });
  });

  afterEach(() => {
    // require.mainを元に戻す
    Object.defineProperty(require, "main", {
      value: originalRequireMain,
    });

    process.env = originalEnv;
  });

  it("メインモジュールとして実行された場合、PORTから取得したポートでサーバーが作成されること", async () => {
    // テスト環境を設定
    process.env = { ...originalEnv, NODE_ENV: "test", PORT: "9000" };

    // index.tsをインポートし、明示的にrunMainModule関数を呼び出す
    const { runMainModule } = await import("./index");
    runMainModule();

    // デバッグ用：どのようなログが出力されたか確認
    console.log(
      "出力されたログ:",
      mockLoggerInfo.mock.calls.map((call) => call[0]),
    );

    // 特定のログメッセージが含まれていることを確認
    expect(
      mockLoggerInfo.mock.calls.some(
        (call) => call[0] === "HTTPサーバーをポート9000で起動します...",
      ),
    ).toBe(true);
  });

  it("PORT環境変数がない場合はデフォルト値を使用すること", async () => {
    // テスト環境を設定（PORT変数なし）
    process.env = { ...originalEnv, NODE_ENV: "test" };
    // biome-ignore lint/performance/noDelete: <explanation>
    delete process.env.PORT;

    // index.tsをインポートし、明示的にrunMainModule関数を呼び出す
    const { runMainModule } = await import("./index");
    runMainModule();

    // デバッグ用：どのようなログが出力されたか確認
    console.log(
      "出力されたログ:",
      mockLoggerInfo.mock.calls.map((call) => call[0]),
    );

    // 特定のログメッセージが含まれていることを確認
    expect(
      mockLoggerInfo.mock.calls.some(
        (call) => call[0] === "HTTPサーバーをポート8080で起動します...",
      ),
    ).toBe(true);
  });
});
