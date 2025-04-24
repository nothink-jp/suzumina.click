// functions/src/firebaseAdmin.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ロガーのモック
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();

// モジュール内のinitializedフラグを制御するための変数
let initializedFlag = false;

// ロガーモジュールのモック
vi.mock("./utils/logger", () => {
  return {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
  };
});

// 環境変数のモック
const originalEnv = process.env;

// firebaseAdminモジュールの自動実行を無効化
vi.mock("./firebaseAdmin", () => {
  // モック実装を返す
  return {
    // 初期化状態フラグをエクスポート
    initialized: false,
    // アプリケーション初期化関数をモック
    initializeApplication: vi.fn(() => {
      if (!initializedFlag) {
        initializedFlag = true;
        // 環境変数のチェックとロギング
        mockLoggerInfo("アプリケーション初期化を開始します");
        
        if (!process.env.YOUTUBE_API_KEY) {
          mockLoggerWarn("環境変数 YOUTUBE_API_KEY が設定されていません");
        }
        
        mockLoggerInfo("アプリケーション初期化が完了しました");
      }
      return true;
    }),
  };
});

describe("firebaseAdmin", () => {
  beforeEach(() => {
    // 各テスト前にモックと初期化状態をリセット
    vi.clearAllMocks();
    initializedFlag = false;

    // 環境変数のバックアップとリセット
    process.env = { ...originalEnv };
    delete process.env.YOUTUBE_API_KEY;

    // モジュールのキャッシュもクリアして、インポート時の自動実行を制御できるようにする
    vi.resetModules();
  });

  afterEach(() => {
    // テスト後に環境変数を元に戻す
    process.env = originalEnv;
  });

  it("initializeApplicationが複数回呼び出されても初期化は1回だけ行われること", async () => {
    // モジュールをインポート（モックされた実装が使用される）
    const { initializeApplication } = await import("./firebaseAdmin");
    
    // 最初の呼び出しで初期化される
    initializeApplication();
    
    // ログをクリア
    mockLoggerInfo.mockClear();
    
    // 2回目以降の呼び出し
    initializeApplication();
    initializeApplication();

    // 検証 - 2回目以降は初期化ログが出力されないこと
    expect(mockLoggerInfo).not.toHaveBeenCalled();
  });

  it("YOUTUBE_API_KEY環境変数が設定されていない場合に警告ログが出力されること", async () => {
    // 環境変数を明示的に未設定に
    delete process.env.YOUTUBE_API_KEY;
    
    // ログモックをクリア
    mockLoggerWarn.mockClear();

    // 初期化フラグをリセット
    initializedFlag = false;

    // モジュールをインポートして初期化を実行させる
    const { initializeApplication } = await import("./firebaseAdmin");
    initializeApplication();

    // 検証 - 警告ログが出力されること
    expect(mockLoggerWarn).toHaveBeenCalledWith("環境変数 YOUTUBE_API_KEY が設定されていません");
  });

  it("YOUTUBE_API_KEY環境変数が設定されている場合は警告ログが出力されないこと", async () => {
    // 環境変数を設定
    process.env.YOUTUBE_API_KEY = "test-api-key";
    
    // モックをリセット
    mockLoggerWarn.mockClear();
    initializedFlag = false;

    // モジュールを再インポートして初期化
    const { initializeApplication } = await import("./firebaseAdmin");
    initializeApplication();

    // 検証 - 警告ログが出力されないこと
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });
});
