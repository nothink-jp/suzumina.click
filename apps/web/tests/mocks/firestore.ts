// モックのインターフェース定義
export interface MockFirestoreData {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockFirestoreDoc {
  exists: boolean;
  data: () => MockFirestoreData | undefined;
}

export interface MockFirestoreDocRef {
  get: () => Promise<MockFirestoreDoc>;
  set: (data: Partial<MockFirestoreData>) => Promise<void>;
  update: (data: Partial<MockFirestoreData>) => Promise<void>;
}

export interface MockFirestoreCollection {
  doc: (id: string) => MockFirestoreDocRef;
}

// Firestoreクライアントのモックインターフェース
export interface MockFirestore {
  collection: (name: string) => MockFirestoreCollection;
}

// モック状態の管理
let mockData: MockFirestoreData = {
  id: "test-id",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  role: "member",
  createdAt: new Date(),
  updatedAt: new Date(),
};
let mockExists = true;
let mockError: Error | null = null;
let lastMethodCalled: "set" | "update" | null = null; // 最後に呼ばれたメソッドを記録

// シンプルなFirestoreモック
export function createMockFirestore(): MockFirestore {
  return {
    collection: () => ({
      doc: () => ({
        async get() {
          if (mockError) {
            throw mockError;
          }
          const result = {
            exists: mockExists,
            // data メソッドは exists が true の場合のみデータを返す
            data: () => (mockExists ? { ...mockData } : undefined),
          };
          return result;
        },
        async set(data: Partial<MockFirestoreData>) {
          // エラーチェックを最初に行う
          if (mockError) {
            throw mockError;
          }
          mockData = { ...mockData, ...data };
          mockExists = true;
          lastMethodCalled = "set"; // メソッドを記録
        },
        async update(data: Partial<MockFirestoreData>) {
          // エラーチェックを最初に行う
          if (mockError) {
            throw mockError;
          }
          // update は存在するドキュメントに対してのみ行われる想定
          if (mockExists) {
            mockData = { ...mockData, ...data };
            lastMethodCalled = "update"; // メソッドを記録
          } else {
            // 存在しないドキュメントへの update はエラーをスローするか、何もしない
            // ここでは何もしない実装とする
            console.warn("Attempted to update a non-existent document mock.");
          }
        },
      }),
    }),
  };
}

// テスト用のヘルパー関数
// setMockData は Partial<MockFirestoreData> のみを受け付ける
export function setMockData(data: Partial<MockFirestoreData>) {
  mockData = { ...mockData, ...data };
}

export function setMockExists(exists: boolean) {
  mockExists = exists;
}

export function setMockError(error: Error | null) {
  mockError = error;
}

export function resetMockData() {
  mockData = {
    id: "test-id",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    role: "member",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockExists = true;
  mockError = null;
  lastMethodCalled = null; // リセット
}

export function getMockState() {
  return {
    data: { ...mockData },
    exists: mockExists,
    error: mockError,
    method: lastMethodCalled, // 最後に呼ばれたメソッドを返す
  };
}
