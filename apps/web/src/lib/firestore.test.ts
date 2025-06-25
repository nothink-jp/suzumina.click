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
		it("should create new Firestore instance with environment variable project ID", async () => {
			process.env.GOOGLE_CLOUD_PROJECT = "suzumina-click-firebase";
			vi.resetModules();

			const { createFirestoreInstance } = await import("./firestore");
			const instance = createFirestoreInstance();

			expect(MockFirestore).toHaveBeenCalledWith({
				projectId: "suzumina-click-firebase",
				ignoreUndefinedProperties: true,
			});
			expect(instance).toBe(mockFirestoreInstance);

			process.env.GOOGLE_CLOUD_PROJECT = undefined;
		});

		it("should create new Firestore instance with fallback project ID when env var is not set", async () => {
			delete process.env.GOOGLE_CLOUD_PROJECT;
			vi.resetModules();

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
			delete process.env.GOOGLE_CLOUD_PROJECT;
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
