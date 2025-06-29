import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firestore
const mockDoc = {
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

const mockCollection = {
	doc: vi.fn(() => mockDoc),
	get: vi.fn(),
	add: vi.fn(),
	where: vi.fn(() => ({
		get: vi.fn(),
	})),
	orderBy: vi.fn(() => ({
		limit: vi.fn(() => ({
			get: vi.fn(),
		})),
	})),
};

const mockFirestore = {
	collection: vi.fn(() => mockCollection),
};

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

describe("Firestore Utils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create firestore instance", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();

		expect(firestore).toBeDefined();
		expect(firestore.collection).toBeDefined();
	});

	it("should access collections correctly", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();
		const usersCollection = firestore.collection("users");

		expect(mockFirestore.collection).toHaveBeenCalledWith("users");
		expect(usersCollection).toBeDefined();
	});

	it("should access documents correctly", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();
		const userDoc = firestore.collection("users").doc("test-user-id");

		expect(mockCollection.doc).toHaveBeenCalledWith("test-user-id");
		expect(userDoc).toBeDefined();
	});

	it("should support document operations", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();
		const userDoc = firestore.collection("users").doc("test-user-id");

		// Mock document data
		const mockUserData = {
			id: "test-user-id",
			username: "testuser",
			displayName: "Test User",
			role: "admin",
			isActive: true,
		};

		mockDoc.get.mockResolvedValue({
			exists: true,
			data: () => mockUserData,
		});

		const docSnapshot = await userDoc.get();

		expect(docSnapshot.exists).toBe(true);
		expect(docSnapshot.data()).toEqual(mockUserData);
	});

	it("should support collection queries", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();

		// Mock collection data
		const mockCollectionData = {
			docs: [
				{
					id: "doc1",
					data: () => ({ title: "Document 1" }),
				},
				{
					id: "doc2",
					data: () => ({ title: "Document 2" }),
				},
			],
		};

		mockCollection.get.mockResolvedValue(mockCollectionData);

		const querySnapshot = await firestore.collection("videos").get();

		expect(querySnapshot.docs).toHaveLength(2);
		expect(querySnapshot.docs[0]?.data().title).toBe("Document 1");
	});

	it("should support ordered queries with limits", async () => {
		const { getFirestore } = await import("@/lib/firestore");

		const firestore = getFirestore();

		const mockQueryData = {
			docs: [
				{
					id: "doc1",
					data: () => ({ title: "Latest Document", createdAt: new Date() }),
				},
			],
		};

		// Mock the chained query methods
		const mockLimitQuery = {
			get: vi.fn().mockResolvedValue(mockQueryData),
		};

		const mockOrderQuery = {
			limit: vi.fn(() => mockLimitQuery),
		};

		mockCollection.orderBy.mockReturnValue(mockOrderQuery);

		const query = firestore.collection("audioButtons").orderBy("createdAt", "desc").limit(10);

		const result = await query.get();

		expect(mockCollection.orderBy).toHaveBeenCalledWith("createdAt", "desc");
		expect(mockOrderQuery.limit).toHaveBeenCalledWith(10);
		expect(result.docs).toHaveLength(1);
	});
});
