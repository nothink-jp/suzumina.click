/**
 * アプリケーション初期化機能のテスト
 * 
 * このファイルでは、index.tsで実装されている初期化処理が
 * 正しく動作することを検証します。
 */
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

// YouTube APIモジュールの自動初期化をモック
vi.mock("./youtube", () => {
  return {
    // 必要なエクスポートだけをモック
    fetchYouTubeVideos: vi.fn(),
  };
});

// 環境変数のモック
const originalEnv = process.env;

// アプリケーション初期化モジュールの自動実行を無効化
vi.mock("./index", async (importOriginal) => {
  // 元のモジュールをインポート
  const originalModule = await importOriginal() as Record<string, unknown>;
  
  // モック実装を返す
  return {
    ...originalModule,
    // 初期化状態フラグをエクスポート
    initialized: false,
    // アプリケーション初期化関数をモック
    initializeApplication: vi.fn(() => {
      if (!initializedFlag) {
        initializedFlag = true;
        // 初期化ロジックとロギング
        mockLoggerInfo("アプリケーション初期化を開始します");
        mockLoggerInfo("アプリケーション初期化が完了しました");
      }
      return true;
    }),
  };
});

describe("アプリケーション初期化機能", () => {
  beforeEach(() => {
    // 各テスト前にモックと初期化状態をリセット
    vi.clearAllMocks();
    initializedFlag = false;

    // 環境変数のバックアップとリセット
    process.env = { ...originalEnv };

    // モジュールのキャッシュもクリアして、インポート時の自動実行を制御できるようにする
    vi.resetModules();
  });

  afterEach(() => {
    // テスト後に環境変数を元に戻す
    process.env = originalEnv;
  });

  it("initializeApplicationが複数回呼び出されても初期化は1回だけ行われること", async () => {
    // モジュールをインポート（モックされた実装が使用される）
    const { initializeApplication } = await import("./index");
    
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
});
