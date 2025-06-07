/**
 * アプリケーション初期化機能とヘルスチェック機能のテスト
 *
 * このファイルでは、index.tsで実装されている初期化処理と
 * ヘルスチェック機能が正しく動作することを検証します。
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

// YouTubeモジュールのモック
vi.mock("./youtube", () => ({
  fetchYouTubeVideos: vi.fn(),
}));

// DLsiteモジュールのモック
vi.mock("./dlsite", () => ({
  fetchDLsiteWorks: vi.fn(),
}));

// Functions Frameworkのモック
const mockCloudEvent = vi.fn();
const mockHttp = vi.fn();

vi.mock("@google-cloud/functions-framework", () => ({
  cloudEvent: mockCloudEvent,
  http: mockHttp,
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

  it("DLsiteモジュールの関数が正しく登録されること", async () => {
    // index.tsをインポート
    await import("./index");

    // cloudEvent関数が正しく呼ばれたことを確認
    expect(mockCloudEvent).toHaveBeenCalledWith(
      "fetchDLsiteWorks",
      expect.any(Function),
    );
  });

  it("ヘルスチェック用HTTPハンドラーが正しく登録されること", async () => {
    // index.tsをインポート
    await import("./index");

    // HTTP関数が登録されたことを確認
    expect(mockHttp).toHaveBeenCalledWith("healthcheck", expect.any(Function));
  });
});

describe("ヘルスチェック機能テスト", () => {
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
      json: vi.fn(),
    };
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it("ヘルスチェックエンドポイントが正しいレスポンスを返すこと", async () => {
    // index.tsをインポート
    await import("./index");

    // HTTPハンドラーが登録されていることを確認
    expect(savedHttpHandler).not.toBeNull();

    // 保存したハンドラーを実行
    savedHttpHandler?.(mockReq, mockRes);

    // 適切なログが出力されることを確認
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "ヘルスチェックリクエストを受信しました",
    );

    // 正しいレスポンスが返されることを確認
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      status: "ok",
      message: "Functions Framework正常動作中",
      timestamp: expect.any(String),
    });
  });

  it("ヘルスチェックレスポンスのタイムスタンプがISO形式であること", async () => {
    // index.tsをインポート
    await import("./index");

    // 保存したハンドラーを実行
    savedHttpHandler?.(mockReq, mockRes);

    // json呼び出しの引数を取得
    const jsonCall = mockRes.json.mock.calls[0];
    const responseData = jsonCall[0];

    // タイムスタンプがISO形式の文字列であることを確認
    expect(responseData.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    // Date.parseで正しい日付として解析できることを確認
    const parsedDate = new Date(responseData.timestamp);
    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate.getTime()).not.toBeNaN();
  });
});

describe("安全なプロセス終了関数（safeExit）テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetModuleState();
  });

  afterEach(() => {
    process.env = originalEnv;
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

    // process.exitが呼ばれていないことを確認
    expect(mockExit).not.toHaveBeenCalled();
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

  it("開発環境でも実際にプロセスを終了させること", async () => {
    // 開発環境を設定
    process.env = { ...originalEnv, NODE_ENV: "development" };

    // index.tsをインポート
    const { safeExit } = await import("./index");

    // プロセス終了関数を呼び出し
    expect(() => safeExit(0)).toThrow(
      "プロセスが終了コード0で終了しようとしました",
    );

    // process.exitが呼ばれたことを確認
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
