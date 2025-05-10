/**
 * Firebase Client SDKのモック
 * Storybook用のダミー実装を提供します
 */

export const auth = {
  // ダミー認証オブジェクト
  currentUser: null,
  onAuthStateChanged: (_callback: (user: { uid?: string } | null) => void) => {
    return () => {}; // unsubscribe関数
  },
  signOut: async () => {
    return Promise.resolve();
  },
};

export const app = {
  name: "mock-app",
};

export const firestore = {
  collection: () => ({
    doc: () => ({
      get: async () => ({
        exists: false,
        data: () => null,
      }),
      set: async () => {},
      update: async () => {},
      delete: async () => {},
    }),
  }),
};
