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
        },
        async update(data: Partial<MockFirestoreData>) {
          // エラーチェックを最初に行う
          if (mockError) {
            throw mockError;
          }
          mockData = { ...mockData, ...data };
        },
      }),
    }),
  };
}

// テスト用のヘルパー関数
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
}

export function getMockState() {
  return {
    data: { ...mockData },
    exists: mockExists,
    error: mockError,
  };
}
