// モックのインターフェース定義
export interface MockFirestoreData {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
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
export function createMockFirestore() {
  return {
    collection: () => ({
      doc: () => ({
        async get() {
          console.log("Mock Firestore get called");
          if (mockError) {
            console.log("Mock Firestore get throwing error:", mockError.message);
            throw mockError;
          }
          const result = {
            exists: mockExists,
            data: () => (mockExists ? { ...mockData } : undefined),
          };
          console.log("Mock Firestore get returning:", result);
          return result;
        },
        async set(data: Partial<MockFirestoreData>) {
          console.log("Mock Firestore set called with:", data);
          // エラーチェックを最初に行う
          if (mockError) {
            console.log("Mock Firestore set throwing error:", mockError.message);
            throw mockError;
          }
          mockData = { ...mockData, ...data };
          mockExists = true;
          console.log("Mock Firestore set completed");
        },
        async update(data: Partial<MockFirestoreData>) {
          console.log("Mock Firestore update called with:", data);
          // エラーチェックを最初に行う
          if (mockError) {
            console.log("Mock Firestore update throwing error:", mockError.message);
            throw mockError;
          }
          mockData = { ...mockData, ...data };
          console.log("Mock Firestore update completed");
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
  console.log("Setting mock error:", error?.message ?? "null");
  mockError = error;
}

export function resetMockData() {
  console.log("Resetting mock data and state");
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