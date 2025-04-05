import { afterEach, beforeAll, mock } from "bun:test";
import { createMockFirestore } from "./mocks/firestore"; // モックファクトリをインポート
import type { MockFirestore } from "./mocks/firestore"; // モックの型をインポート

// テスト実行後のクリーンアップ
afterEach(() => {
  // クリーンアップロジックをここに実装
});

// グローバルなモック設定
beforeAll(() => {
  // テスト環境の設定
  const testEnv: Partial<NodeJS.ProcessEnv> = {
    NODE_ENV: "test",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "test-secret",
    DISCORD_CLIENT_ID: "test-client-id",
    DISCORD_CLIENT_SECRET: "test-client-secret",
    DISCORD_GUILD_ID: "test-guild-id",
    GOOGLE_CLOUD_PROJECT: "test-project", // テスト用のプロジェクトID
    GOOGLE_APPLICATION_CREDENTIALS: "", // 認証情報を無効化
  };

  process.env = {
    ...process.env,
    ...testEnv,
  };

  // NextAuthのモック
  const mockNextAuth = {
    handlers: {
      GET: async () => new Response(),
      POST: async () => new Response(),
    },
    auth: async () => null,
    signIn: async () => null,
    signOut: async () => null,
  };

  mock.module("next-auth", () => ({
    default: () => mockNextAuth,
  }));

  // Firestoreのモック
  // モジュール全体をモックし、Firestoreクラスを置き換える
  mock.module("@google-cloud/firestore", () => {
    class MockFirestoreImpl implements MockFirestore {
      collection: MockFirestore["collection"];
      constructor() {
        const mockInstance = createMockFirestore();
        this.collection = mockInstance.collection;
      }
    }
    return {
      Firestore: MockFirestoreImpl,
      // 他にFirestoreモジュールからエクスポートされているものがあればここに追加
      // 例: Timestamp: class MockTimestamp {}
    };
  });

  // fetchのモック
  const mockFetchImplementation = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(""),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      clone: () => mockFetchImplementation(),
      headers: new Headers(),
      redirect: () => new Response(),
      status: 200,
      statusText: "OK",
      type: "basic" as ResponseType,
      url: "https://example.com",
      body: null,
      bodyUsed: false,
    });

  global.fetch = mock(mockFetchImplementation) as unknown as typeof fetch;
});
