import { beforeEach, describe, expect, it, vi } from "vitest";

// テスト用のモック実装
const mockFirestoreInstance = {
  collection: vi.fn(),
  doc: vi.fn(),
};

// Firestoreクラスのモック
const MockFirestore = vi.fn(() => mockFirestoreInstance);

// モジュール全体をモック
vi.mock("@google-cloud/firestore", () => ({
  Firestore: MockFirestore,
}));

describe("firestore module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFirestoreInstance", () => {
    it("should create new Firestore instance with correct configuration", async () => {
      const { createFirestoreInstance } = await import("./firestore");
      const instance = createFirestoreInstance();

      expect(MockFirestore).toHaveBeenCalledWith({
        projectId: "suzumina-click",
        ignoreUndefinedProperties: true,
      });
      expect(instance).toBe(mockFirestoreInstance);
    });
  });

  describe("getFirestore", () => {
    it("should return singleton Firestore instance", async () => {
      vi.resetModules();
      const { getFirestore } = await import("./firestore");

      const instance1 = getFirestore();
      const instance2 = getFirestore();

      expect(instance1).toBe(instance2);
      expect(MockFirestore).toHaveBeenCalledTimes(1);
    });

    it("should create instance with correct project configuration", async () => {
      vi.resetModules();
      const { getFirestore } = await import("./firestore");

      getFirestore();

      expect(MockFirestore).toHaveBeenCalledWith({
        projectId: "suzumina-click",
        ignoreUndefinedProperties: true,
      });
    });
  });
});
