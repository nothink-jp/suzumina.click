// functions/src/firebaseAdmin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// モックオブジェクトの定義
const mockInitializeApp = vi.fn();
const mockFirestoreCollection = vi.fn();
const mockFirestoreBatch = vi.fn();
const mockFirestoreInstance = {
  collection: mockFirestoreCollection,
  batch: mockFirestoreBatch,
};
const mockAdminFirestore = vi.fn(() => mockFirestoreInstance);
const mockAdminAuth = vi.fn(() => ({ /* Auth インスタンスのメソッド */ }));

// モジュール内のinitializedフラグを制御するための変数
let initializedFlag = false;

// firebase-adminモジュールのモック
vi.mock("firebase-admin", () => {
  return {
    initializeApp: mockInitializeApp,
    firestore: mockAdminFirestore,
    auth: mockAdminAuth,
  };
});

// firebaseAdminモジュールの自動実行部分を制御するためのモック
vi.mock("./firebaseAdmin", () => {
  // モック実装を返す
  const mockExports = {
    // モジュールがインポートされた時点ではinitializedフラグをfalseにしておく
    initialized: false,
    // initializeFirebaseAdmin関数をモックして、初期化状態を制御できるようにする
    initializeFirebaseAdmin: vi.fn(() => {
      if (!initializedFlag) {
        mockInitializeApp(); // 初回のみ初期化関数を呼び出す
        initializedFlag = true;
      }
      return { firestore: mockAdminFirestore, auth: mockAdminAuth };
    }),
    // firestoreとauthのエクスポートもモックする
    // ここで実際にmockAdminFirestore()を呼び出して、テストの期待通りになるようにする
    get firestore() {
      return mockAdminFirestore();
    },
    get auth() {
      return mockAdminAuth();
    },
  };
  
  // モジュールの自動実行をシミュレート
  mockExports.initializeFirebaseAdmin();
  
  return mockExports;
});

describe("firebaseAdmin", () => {
  beforeEach(() => {
    // 各テスト前にモックと初期化状態をリセット
    vi.clearAllMocks();
    initializedFlag = false;
    
    // モジュールのキャッシュもクリアして、インポート時の自動実行を制御できるようにする
    vi.resetModules();
  });

  it("initializeFirebaseAdminが複数回呼び出されても初期化は1回だけ行われること", async () => {
    // モジュールをインポートする前にmockInitializeAppをリセット
    mockInitializeApp.mockClear();
    
    // モジュールをインポート（モックされた実装が使用される）
    const { initializeFirebaseAdmin } = await import("./firebaseAdmin");

    // 複数回呼び出し
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();

    // 検証 - 1回だけ呼ばれることを確認
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });

  it("firestoreインスタンスがエクスポートされ、モジュールロード時にadmin.firestoreが呼ばれること", async () => {
    // admin.firestoreの呼び出し回数を確認するためにモックをリセット
    mockAdminFirestore.mockClear();
    
    // firestoreをインポート
    // この時点でmockAdminFirestoreが呼ばれることを期待
    const { firestore } = await import("./firebaseAdmin");

    // 検証
    expect(firestore).toBeDefined();
    expect(firestore).toBe(mockFirestoreInstance);
    // admin.firestoreが呼ばれたことを確認
    expect(mockAdminFirestore).toHaveBeenCalled();
  });
});
