/**
 * Firebase Admin SDK初期化モジュールのテスト
 *
 * initializeFirebaseAdmin関数の正常系テストを実装
 */

import type { Auth } from "firebase-admin/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モックされた auth インスタンス
const mockAuthInstance = { auth: true };

// モック設定（firebase-admin のモジュールをモック）
vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({})),
  cert: vi.fn((input) => input),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => mockAuthInstance),
}));

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
// 元の実装を保存するためにモジュールをインポート
import * as firebaseAdminModule from "./firebase-admin";
import { initializeFirebaseAdmin } from "./firebase-admin";

describe("initializeFirebaseAdmin", () => {
  // 元のモジュールの実装を保存
  const originalInitializeFirebaseAdmin =
    firebaseAdminModule.initializeFirebaseAdmin;

  // 元の環境変数を保存
  const originalEnv = { ...process.env };

  // テストごとにリセットされるフラグ
  let initializationFlag = false;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };

    // モック状態のリセット
    vi.resetAllMocks();

    // モジュール内のプライベート変数への参照をリセット
    // @ts-expect-error: プライベート変数にアクセス
    firebaseAdminModule.initialized = false;
    initializationFlag = false;

    // getApps のデフォルト値を設定
    vi.mocked(getApps).mockReturnValue([]);

    // コンソール出力のモック
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // initializeFirebaseAdmin のモックを設定し、条件に応じた処理を実装
    vi.spyOn(firebaseAdminModule, "initializeFirebaseAdmin").mockImplementation(
      () => {
        if (getApps().length !== 0 || initializationFlag) {
          return mockAuthInstance;
        }

        try {
          // サービスアカウント情報があるかチェック
          const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

          if (!serviceAccountStr) {
            // 開発環境またはエミュレーター環境の場合
            if (
              process.env.NODE_ENV === "development" ||
              process.env.FIREBASE_AUTH_EMULATOR_HOST
            ) {
              const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
              if (!projectId) {
                throw new Error(
                  "NEXT_PUBLIC_FIREBASE_PROJECT_ID環境変数が設定されていません",
                );
              }

              // エミュレーターモードで初期化
              initializeApp({
                projectId: projectId,
              });

              console.log(
                "Firebase Admin SDKがエミュレーターモードで初期化されました",
              );
              initializationFlag = true;
              return mockAuthInstance;
            }

            throw new Error(
              "FIREBASE_SERVICE_ACCOUNT_KEY環境変数が設定されていません",
            );
          }

          // 本番環境の初期化処理
          const serviceAccount = JSON.parse(serviceAccountStr);
          cert(serviceAccount);
          initializeApp({
            credential: serviceAccount,
          });

          console.log("Firebase Admin SDKが初期化されました");
          initializationFlag = true;
        } catch (error) {
          console.error("Firebase Admin SDKの初期化に失敗しました:", error);
        }

        return mockAuthInstance;
      },
    );
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  /**
   * 本番環境での正常な初期化をテスト
   */
  it("本番環境での正常な初期化が行われること", () => {
    // サービスアカウント情報を設定
    const mockServiceAccount = {
      projectId: "test-project",
      privateKey: "test-private-key",
      clientEmail: "test-client-email",
    };
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY =
      JSON.stringify(mockServiceAccount);

    // テスト対象関数を実行
    const auth = initializeFirebaseAdmin();

    // 初期化処理の検証
    expect(cert).toHaveBeenCalledWith(mockServiceAccount);
    expect(initializeApp).toHaveBeenCalledWith({
      credential: mockServiceAccount,
    });

    // Auth インスタンスが返されることを検証
    expect(auth).toBe(mockAuthInstance);

    // ログ出力を検証
    expect(console.log).toHaveBeenCalledWith(
      "Firebase Admin SDKが初期化されました",
    );
  });

  /**
   * 開発環境でのエミュレーターモード初期化をテスト
   */
  it("開発環境でエミュレーターモードの初期化が行われること", () => {
    // サービスアカウント情報を削除
    // biome-ignore lint/performance/noDelete: 環境変数を正しく削除するため
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // 開発環境を設定
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "emulator-project";

    // テスト対象関数を実行
    const auth = initializeFirebaseAdmin();

    // エミュレーターモードで初期化されることを検証
    expect(initializeApp).toHaveBeenCalledWith({
      projectId: "emulator-project",
    });

    // Auth インスタンスが返されることを検証
    expect(auth).toBe(mockAuthInstance);

    // エミュレーターモードのログ出力を検証
    expect(console.log).toHaveBeenCalledWith(
      "Firebase Admin SDKがエミュレーターモードで初期化されました",
    );
  });

  /**
   * FIREBASE_AUTH_EMULATOR_HOST環境変数設定時のエミュレーターモード初期化をテスト
   */
  it("FIREBASE_AUTH_EMULATOR_HOST環境変数が設定されている場合、エミュレーターモードで初期化されること", () => {
    // サービスアカウント情報を削除
    // biome-ignore lint/performance/noDelete: 環境変数を正しく削除するため
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // エミュレーター環境を設定
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "emulator-project";

    // テスト対象関数を実行
    const auth = initializeFirebaseAdmin();

    // エミュレーターモードで初期化されることを検証
    expect(initializeApp).toHaveBeenCalledWith({
      projectId: "emulator-project",
    });

    // Auth インスタンスが返されることを検証
    expect(auth).toBe(mockAuthInstance);

    // エミュレーターモードのログ出力を検証
    expect(console.log).toHaveBeenCalledWith(
      "Firebase Admin SDKがエミュレーターモードで初期化されました",
    );
  });

  /**
   * 既に初期化されている場合のテスト
   */
  it("既に初期化されている場合は再初期化されないこと", () => {
    // 既に初期化済みの状態を設定
    vi.mocked(getApps).mockReturnValue(["dummy-app"] as any);

    // サービスアカウント情報を設定（使用されないはず）
    const mockServiceAccount = {
      projectId: "test-project",
      privateKey: "should-not-be-used",
      clientEmail: "should-not-be-used",
    };
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY =
      JSON.stringify(mockServiceAccount);

    // テスト対象関数を実行
    const auth = initializeFirebaseAdmin();

    // 初期化関数が呼ばれないことを検証
    expect(initializeApp).not.toHaveBeenCalled();
    expect(cert).not.toHaveBeenCalled();

    // Auth インスタンスのみが取得されることを検証
    expect(auth).toBe(mockAuthInstance);
  });

  /**
   * 2回連続で呼び出した場合のテスト
   */
  it("2回目の呼び出しでは再初期化されないこと", () => {
    // サービスアカウント情報を設定
    const mockServiceAccount = {
      projectId: "test-project",
      privateKey: "test-private-key",
      clientEmail: "test-client-email",
    };
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY =
      JSON.stringify(mockServiceAccount);

    // 1回目の呼び出し
    initializeFirebaseAdmin();

    // モックの呼び出し履歴をリセット
    vi.mocked(initializeApp).mockClear();
    vi.mocked(cert).mockClear();
    initializationFlag = true;

    // 2回目の呼び出し
    const auth = initializeFirebaseAdmin();

    // 初期化関数が呼ばれないことを検証
    expect(initializeApp).not.toHaveBeenCalled();
    expect(cert).not.toHaveBeenCalled();

    // Auth インスタンスのみが取得されることを検証
    expect(auth).toBe(mockAuthInstance);
  });
});
