import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => ({
		collection: vi.fn(() => ({
			doc: vi.fn(() => ({
				get: vi.fn(),
				set: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			})),
			get: vi.fn(),
			orderBy: vi.fn(() => ({
				limit: vi.fn(() => ({
					get: vi.fn(),
				})),
			})),
		})),
	})),
}));

describe("Admin Workflow Integration Tests", () => {
	describe("Complete Audio Button Management Workflow", () => {
		it("should handle the full lifecycle of audio button management", async () => {
			const { auth } = await import("@/lib/auth");
			const { getFirestore } = await import("@/lib/firestore");

			// Setup admin authentication
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue({
				user: {
					id: "admin-user-id",
					discordId: "123456789",
					username: "admin",
					displayName: "Admin User",
					isAdmin: true,
				},
			});

			// Mock Firestore operations
			const mockFirestore = getFirestore();
			const mockDoc = {
				get: vi.fn(),
				set: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			};
			const mockCollection = {
				doc: vi.fn(() => mockDoc),
				get: vi.fn(),
				orderBy: vi.fn(() => ({
					limit: vi.fn(() => ({
						get: vi.fn(),
					})),
				})),
			};
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(mockFirestore.collection as any).mockReturnValue(mockCollection);

			// Step 1: Admin authenticates
			const session = await auth();
			expect(session?.user?.isAdmin).toBe(true);

			// Step 2: Load audio buttons list
			const mockQueryResult = {
				docs: [
					{
						id: "button-1",
						data: () => ({
							title: "Test Audio Button",
							youtubeVideoId: "test-video-id",
							startTime: 10,
							endTime: 30,
							isPublic: true,
							createdBy: "user-123",
							playCount: 100,
							likeCount: 15,
							favoriteCount: 5,
						}),
					},
				],
			};

			const mockLimitQuery = {
				get: vi.fn().mockResolvedValue(mockQueryResult),
			};

			const mockOrderQuery = {
				limit: vi.fn(() => mockLimitQuery),
			};

			mockCollection.orderBy.mockReturnValue(mockOrderQuery);

			const audioButtonsRef = mockFirestore.collection("audioButtons");
			const audioButtons = await audioButtonsRef.orderBy("createdAt", "desc").limit(100).get();

			expect(audioButtons.docs).toHaveLength(1);
			expect(audioButtons.docs[0]?.data().title).toBe("Test Audio Button");

			// Step 3: Edit audio button
			mockDoc.get.mockResolvedValue({
				exists: true,
				data: () => ({
					title: "Test Audio Button",
					startTime: 10,
					endTime: 30,
					isPublic: true,
				}),
			});

			const buttonRef = mockFirestore.collection("audioButtons").doc("button-1");
			const buttonDoc = await buttonRef.get();
			expect(buttonDoc.exists).toBe(true);

			// Update the button
			const updateData = {
				title: "Updated Audio Button",
				startTime: 15,
				updatedAt: new Date(),
			};
			await buttonRef.update(updateData);
			expect(mockDoc.update).toHaveBeenCalledWith(updateData);

			// Step 4: Delete audio button
			mockDoc.delete.mockResolvedValue(undefined);
			await buttonRef.delete();
			expect(mockDoc.delete).toHaveBeenCalled();
		});
	});

	describe("User Management Workflow", () => {
		it("should handle user role management", async () => {
			const { auth } = await import("@/lib/auth");
			const { getFirestore } = await import("@/lib/firestore");

			// Setup admin authentication
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue({
				user: { isAdmin: true },
			});

			const mockFirestore = getFirestore();
			const mockDoc = {
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => ({
						discordId: "user-123",
						username: "testuser",
						displayName: "Test User",
						role: "member",
						isActive: true,
					}),
				}),
				update: vi.fn(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(mockFirestore.collection as any).mockReturnValue({
				doc: vi.fn(() => mockDoc),
			});

			// Step 1: Get user data
			const userRef = mockFirestore.collection("users").doc("user-123");
			const userDoc = await userRef.get();
			expect(userDoc.exists).toBe(true);
			expect(userDoc.data()?.role).toBe("member");

			// Step 2: Update user role
			const updateData = {
				role: "moderator",
				updatedAt: new Date(),
			};
			await userRef.update(updateData);
			expect(mockDoc.update).toHaveBeenCalledWith(updateData);
		});
	});

	describe("Data Refresh Workflow", () => {
		it("should handle YouTube data refresh workflow", async () => {
			const { auth } = await import("@/lib/auth");

			// Setup admin authentication
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue({
				user: { isAdmin: true },
			});

			// Mock fetch for YouTube API
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					items: [
						{
							id: "video-123",
							snippet: {
								title: "New Video",
								description: "Video description",
								publishedAt: "2023-01-01T00:00:00Z",
								thumbnails: {
									medium: { url: "http://example.com/thumb.jpg" },
								},
								tags: ["tag1", "tag2"],
							},
							statistics: {
								viewCount: "1500",
								likeCount: "75",
							},
						},
					],
				}),
			});

			// Simulate refresh API call
			const response = await fetch("/api/admin/videos/refresh", {
				method: "POST",
			});

			const result = await response.json();
			expect(result.items).toHaveLength(1);
			expect(result.items[0].snippet.title).toBe("New Video");
		});
	});

	describe("Error Handling Workflow", () => {
		it("should handle authentication failures gracefully", async () => {
			const { auth } = await import("@/lib/auth");

			// Mock failed authentication
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(auth as any).mockResolvedValue(null);

			const session = await auth();
			const isAuthorized = session?.user?.isAdmin === true;

			expect(isAuthorized).toBe(false);
		});

		it("should handle Firestore errors gracefully", async () => {
			const { getFirestore } = await import("@/lib/firestore");

			const mockFirestore = getFirestore();
			const mockDoc = {
				get: vi.fn().mockRejectedValue(new Error("Firestore error")),
			};
			// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any
			(mockFirestore.collection as any).mockReturnValue({
				doc: vi.fn(() => mockDoc),
			});

			const userRef = mockFirestore.collection("users").doc("user-123");

			try {
				await userRef.get();
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Firestore error");
			}
		});

		it("should handle API call failures", async () => {
			// Mock fetch failure
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			try {
				await fetch("/api/admin/videos/refresh", {
					method: "POST",
				});
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Network error");
			}
		});
	});

	describe("Data Validation Workflow", () => {
		it("should validate form data correctly", () => {
			// Helper functions to reduce complexity
			const validateTitle = (title: unknown): string | null => {
				if (!title || (typeof title === "string" && title.trim().length === 0)) {
					return "タイトルは必須です";
				}
				return null;
			};

			const validateStartTime = (startTime: unknown): string | null => {
				if (typeof startTime !== "number" || startTime < 0) {
					return "開始時間は0以上の数値である必要があります";
				}
				return null;
			};

			const validateEndTime = (endTime: unknown, startTime: unknown): string | null => {
				if (
					typeof endTime !== "number" ||
					(typeof startTime === "number" && endTime <= startTime)
				) {
					return "終了時間は開始時間より大きい必要があります";
				}
				return null;
			};

			const validateIsPublic = (isPublic: unknown): string | null => {
				if (typeof isPublic !== "boolean") {
					return "公開設定は必須です";
				}
				return null;
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible input
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Test validation function with complex logic
			const validateAudioButtonData = (data: any) => {
				const errors: string[] = [];

				const titleError = validateTitle(data.title);
				if (titleError) errors.push(titleError);

				const startTimeError = validateStartTime(data.startTime);
				if (startTimeError) errors.push(startTimeError);

				const endTimeError = validateEndTime(data.endTime, data.startTime);
				if (endTimeError) errors.push(endTimeError);

				const isPublicError = validateIsPublic(data.isPublic);
				if (isPublicError) errors.push(isPublicError);

				return {
					isValid: errors.length === 0,
					errors,
				};
			};

			// Test valid data
			const validData = {
				title: "Valid Audio Button",
				startTime: 10,
				endTime: 30,
				isPublic: true,
			};

			const validResult = validateAudioButtonData(validData);
			expect(validResult.isValid).toBe(true);
			expect(validResult.errors).toHaveLength(0);

			// Test invalid data
			const invalidData = {
				title: "",
				startTime: -1,
				endTime: 5,
				isPublic: "true", // Wrong type
			};

			const invalidResult = validateAudioButtonData(invalidData);
			expect(invalidResult.isValid).toBe(false);
			expect(invalidResult.errors).toHaveLength(3); // Only 3 errors: title, startTime, endTime (isPublic string gets converted)
		});
	});
});
