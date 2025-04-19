// functions/src/firebaseAdmin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// モックをdescribeブロックの外で定義
const mockInitializeApp = vi.fn();
const mockFirestoreCollection = vi.fn();
const mockFirestoreBatch = vi.fn();
const mockFirestoreInstance = {
  collection: mockFirestoreCollection,
  batch: mockFirestoreBatch,
};
const mockAdminFirestore = vi.fn(() => mockFirestoreInstance);

vi.mock("firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase-admin")>();
  return {
    ...actual,
    initializeApp: mockInitializeApp,
    firestore: mockAdminFirestore,
  };
});

describe("firebaseAdmin", () => {
  beforeEach(async () => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    // モジュールレベルの初期化状態をクリーンにするため、モジュールをリセット
    vi.resetModules();
  });

  it("initializeFirebaseAdminが複数回呼び出されても初期化は1回だけ行われること", async () => {
    // 準備: モジュールリセット後にインポート、.js拡張子を追加
    const { initializeFirebaseAdmin } = await import("./firebaseAdmin.js");
    // resetModulesによりモックがクリアされるため、冗長かもしれないが念のため
    mockInitializeApp.mockClear();

    // 実行
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();

    // 検証
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });

  it("firestoreインスタンスがエクスポートされ、モジュールロード時にadmin.firestoreが呼ばれること", async () => {
    // 準備: モジュールリセット後にインポート、.js拡張子を追加
    const { firestore } = await import("./firebaseAdmin.js");

    // 検証
    expect(firestore).toBeDefined();
    expect(firestore).toBe(mockFirestoreInstance);
    // admin.firestoreが（少なくともモジュールインポート時に一度）呼ばれることを確認
    expect(mockAdminFirestore).toHaveBeenCalled();
    // インポート時に*正確に*1回だけ呼ばれることを検証するなら以下を使用（ただし脆弱になる可能性あり）
    // expect(mockAdminFirestore).toHaveBeenCalledTimes(1);
  });
});
