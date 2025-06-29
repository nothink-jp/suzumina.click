import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
	auth: vi.fn(),
}));

// Mock Firestore
const mockDoc = {
	get: vi.fn(),
	set: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

const mockCollection = {
	doc: vi.fn(() => mockDoc),
	where: vi.fn(() => ({
		get: vi.fn(),
	})),
	get: vi.fn(),
};

const mockFirestore = {
	collection: vi.fn(() => mockCollection),
};

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

describe("API Logic Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authentication Logic", () => {
		it("should authenticate admin users", async () => {
			const { auth } = await import("@/lib/auth");
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue({
				user: { isAdmin: true },
			});

			const session = await auth();
			const isAuthorized = session?.user?.isAdmin === true;

			expect(isAuthorized).toBe(true);
		});

		it("should reject non-admin users", async () => {
			const { auth } = await import("@/lib/auth");
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue({
				user: { isAdmin: false },
			});

			const session = await auth();
			const isAuthorized = session?.user?.isAdmin === true;

			expect(isAuthorized).toBe(false);
		});

		it("should reject unauthenticated users", async () => {
			const { auth } = await import("@/lib/auth");
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue(null);

			const session = await auth();
			const isAuthorized = session?.user?.isAdmin === true;

			expect(isAuthorized).toBe(false);
		});
	});

	describe("Button Update Logic", () => {
		it("should update button data correctly", async () => {
			const { getFirestore } = await import("@/lib/firestore");

			mockDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({
					title: "Original Title",
					startTime: 10,
					endTime: 20,
					isPublic: true,
				}),
			});

			mockDoc.update.mockResolvedValue(undefined);

			const firestore = getFirestore();
			const buttonRef = firestore.collection("audioButtons").doc("test-id");

			// Check if button exists
			const buttonDoc = await buttonRef.get();
			expect(buttonDoc.exists).toBe(true);

			// Update button
			const updateData = {
				title: "Updated Title",
				startTime: 15,
				updatedAt: new Date(),
			};

			await buttonRef.update(updateData);

			expect(mockDoc.update).toHaveBeenCalledWith(updateData);
		});

		it("should handle boolean conversion for isPublic", () => {
			// Helper functions to reduce complexity
			const convertBooleanField = (value: unknown) => value === "true" || value === true;
			const convertNumberField = (value: unknown) => Number(value);

			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Test utility function with complex logic
			const convertFormData = (data: Record<string, any>) => {
				// biome-ignore lint/suspicious/noExplicitAny: Test output needs flexible types
				const converted: Record<string, any> = {};

				for (const [key, value] of Object.entries(data)) {
					if (key === "isPublic") {
						converted[key] = convertBooleanField(value);
					} else if (key === "startTime" || key === "endTime") {
						converted[key] = convertNumberField(value);
					} else {
						converted[key] = value;
					}
				}

				return converted;
			};

			const formData = {
				title: "Test Button",
				isPublic: "false",
				startTime: "10",
				endTime: "30",
			};

			const converted = convertFormData(formData);

			expect(converted.isPublic).toBe(false);
			expect(converted.startTime).toBe(10);
			expect(converted.endTime).toBe(30);
		});
	});

	describe("Button Deletion Logic", () => {
		it("should check for button existence before deletion", async () => {
			const { getFirestore } = await import("@/lib/firestore");

			mockDoc.get.mockResolvedValue({
				exists: true,
			});

			const firestore = getFirestore();
			const buttonRef = firestore.collection("audioButtons").doc("test-id");

			const buttonDoc = await buttonRef.get();

			expect(buttonDoc.exists).toBe(true);
		});

		it("should handle non-existent button deletion", async () => {
			const { getFirestore } = await import("@/lib/firestore");

			mockDoc.get.mockResolvedValue({
				exists: false,
			});

			const firestore = getFirestore();
			const buttonRef = firestore.collection("audioButtons").doc("test-id");

			const buttonDoc = await buttonRef.get();

			expect(buttonDoc.exists).toBe(false);
		});

		it("should check for related favorites before deletion", async () => {
			const { getFirestore } = await import("@/lib/firestore");

			// Mock related favorites check
			const mockFavoritesQuery = {
				get: vi.fn().mockResolvedValue({
					empty: true, // No related favorites
				}),
			};

			mockCollection.where.mockReturnValue(mockFavoritesQuery);

			const firestore = getFirestore();
			const favoritesQuery = firestore.collection("favorites").where("buttonId", "==", "test-id");

			const favoritesSnapshot = await favoritesQuery.get();

			expect(favoritesSnapshot.empty).toBe(true);
			expect(mockCollection.where).toHaveBeenCalledWith("buttonId", "==", "test-id");
		});
	});

	describe("Data Refresh Logic", () => {
		it("should handle YouTube API data processing", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			const processYouTubeData = (apiResponse: any) => {
				if (!apiResponse.items || apiResponse.items.length === 0) {
					return [];
				}

				// biome-ignore lint/suspicious/noExplicitAny: Test needs flexible API response types
				return apiResponse.items.map((item: any) => ({
					videoId: item.id,
					title: item.snippet?.title || "Untitled",
					description: item.snippet?.description || "",
					publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : new Date(),
					thumbnailUrl: item.snippet?.thumbnails?.medium?.url || "",
					tags: item.snippet?.tags || [],
					viewCount: Number(item.statistics?.viewCount || 0),
					likeCount: Number(item.statistics?.likeCount || 0),
					lastUpdated: new Date(),
				}));
			};

			const mockYouTubeResponse = {
				items: [
					{
						id: "test-video-id",
						snippet: {
							title: "Test Video",
							description: "Test Description",
							publishedAt: "2023-01-01T00:00:00Z",
							thumbnails: {
								medium: { url: "http://example.com/thumb.jpg" },
							},
							tags: ["tag1", "tag2"],
						},
						statistics: {
							viewCount: "1000",
							likeCount: "50",
						},
					},
				],
			};

			const processed = processYouTubeData(mockYouTubeResponse);

			expect(processed).toHaveLength(1);
			expect(processed[0].videoId).toBe("test-video-id");
			expect(processed[0].title).toBe("Test Video");
			expect(processed[0].viewCount).toBe(1000);
			expect(processed[0].tags).toEqual(["tag1", "tag2"]);
		});

		it("should handle empty YouTube API response", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			const processYouTubeData = (apiResponse: any) => {
				if (!apiResponse.items || apiResponse.items.length === 0) {
					return [];
				}
				return apiResponse.items;
			};

			const emptyResponse = { items: [] };
			const processed = processYouTubeData(emptyResponse);

			expect(processed).toHaveLength(0);
		});

		it("should validate required environment variables", () => {
			const validateEnvironment = () => {
				const required = ["YOUTUBE_API_KEY", "DLSITE_CHANNEL_ID"];
				const missing = required.filter((key) => !process.env[key]);
				return { isValid: missing.length === 0, missing };
			};

			// Save original env
			const originalKeys = {
				YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
				DLSITE_CHANNEL_ID: process.env.DLSITE_CHANNEL_ID,
			};

			// Test with missing keys
			process.env.YOUTUBE_API_KEY = "";
			process.env.DLSITE_CHANNEL_ID = "";

			const result = validateEnvironment();
			expect(result.isValid).toBe(false);
			expect(result.missing).toContain("YOUTUBE_API_KEY");

			// Restore env
			if (originalKeys.YOUTUBE_API_KEY) {
				process.env.YOUTUBE_API_KEY = originalKeys.YOUTUBE_API_KEY;
			}
			if (originalKeys.DLSITE_CHANNEL_ID) {
				process.env.DLSITE_CHANNEL_ID = originalKeys.DLSITE_CHANNEL_ID;
			}
		});
	});
});
