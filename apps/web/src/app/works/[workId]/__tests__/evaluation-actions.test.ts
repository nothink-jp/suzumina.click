import { vi } from "vitest";
import {
	getUserTop10List,
	getWorkEvaluation,
	removeWorkEvaluation,
	updateWorkEvaluation,
} from "../evaluation-actions";

// Mock dependencies
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

// Import mocked modules
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";

describe("evaluation-actions", () => {
	const mockAuth = vi.mocked(auth);
	const mockGetFirestore = vi.mocked(getFirestore);

	// Helper to create properly mocked Firestore
	const createMockFirestore = (
		options: {
			transactionResult?: any;
			evaluationData?: any;
			top10Data?: any;
			transactionCallback?: (transaction: any) => void;
		} = {},
	) => {
		const mockTransaction = {
			get: vi.fn((ref: any) => {
				const path = ref.toString?.() || "";
				if (path.includes("top10")) {
					return {
						exists: !!options.top10Data,
						data: () => options.top10Data,
					};
				}
				return {
					exists: !!options.evaluationData,
					data: () => options.evaluationData,
				};
			}),
			set: vi.fn(),
			delete: vi.fn(),
		};

		return {
			runTransaction: vi.fn(async (callback: any) => {
				const result = await callback(mockTransaction);
				options.transactionCallback?.(mockTransaction);
				return options.transactionResult ?? result;
			}),
			collection: vi.fn((name: string) => ({
				doc: vi.fn((id: string) => {
					const docRef = {
						toString: () => `${name}/${id}`,
						get: vi.fn().mockResolvedValue({
							exists: !!options.evaluationData,
							data: () => options.evaluationData,
						}),
						collection: vi.fn(() => ({
							doc: vi.fn(() => ({
								toString: () => `${name}/${id}/top10/ranking`,
							})),
						})),
					};
					return docRef;
				}),
			})),
		};
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("updateWorkEvaluation", () => {
		it("returns error when user is not authenticated", async () => {
			mockAuth.mockResolvedValueOnce(null);

			const result = await updateWorkEvaluation("RJ12345678", {
				type: "star",
				starRating: 3,
				workTitle: "Test Work",
			});

			expect(result).toEqual({
				success: false,
				error: "認証が必要です",
			});
		});

		it("returns error when user has no discordId", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { id: "test-user", name: "Test User" },
				expires: new Date().toISOString(),
			} as any);

			const result = await updateWorkEvaluation("RJ12345678", {
				type: "star",
				starRating: 3,
				workTitle: "Test Work",
			});

			expect(result).toEqual({
				success: false,
				error: "認証が必要です",
			});
		});

		it("validates input data", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { discordId: "test-discord-id" },
			} as any);

			const result = await updateWorkEvaluation("RJ12345678", {
				type: "star",
				// starRating is missing
				workTitle: "Test Work",
			} as any);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("handles transaction errors", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { discordId: "test-discord-id" },
			} as any);

			const mockFirestore = {
				runTransaction: vi.fn().mockRejectedValueOnce(new Error("Transaction failed")),
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await updateWorkEvaluation("RJ12345678", {
				type: "star",
				starRating: 3,
				workTitle: "Test Work",
			});

			expect(result).toEqual({
				success: false,
				error: "Transaction failed",
			});
		});

		describe("基本的な評価操作", () => {
			it("creates new star evaluation", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const savedEvaluation = {
					id: "test-discord-id_RJ12345678",
					workId: "RJ12345678",
					userId: "test-discord-id",
					evaluationType: "star",
					starRating: 3,
					createdAt: { toDate: () => new Date() },
					updatedAt: { toDate: () => new Date() },
				};

				const mockFirestore = createMockFirestore({
					transactionResult: "test-discord-id_RJ12345678",
					evaluationData: savedEvaluation,
				});

				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", {
					type: "star",
					starRating: 3,
					workTitle: "Test Work",
				});

				expect(result.success).toBe(true);
				expect(result.data?.evaluationType).toBe("star");
				expect(result.data?.starRating).toBe(3);
			});

			it("updates existing evaluation from star to ng", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const existingEval = {
					id: "test-discord-id_RJ12345678",
					workId: "RJ12345678",
					userId: "test-discord-id",
					evaluationType: "star",
					starRating: 2,
					createdAt: { toDate: () => new Date("2024-01-01") },
					updatedAt: { toDate: () => new Date("2024-01-01") },
				};

				const updatedEval = {
					...existingEval,
					evaluationType: "ng",
					starRating: undefined,
					updatedAt: { toDate: () => new Date() },
				};

				const mockFirestore = createMockFirestore({
					transactionResult: "test-discord-id_RJ12345678",
					evaluationData: updatedEval,
				});

				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", {
					type: "ng",
					workTitle: "Test Work",
				});

				expect(result.success).toBe(true);
				expect(result.data?.evaluationType).toBe("ng");
			});

			it("removes evaluation", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const existingEval = {
					id: "test-discord-id_RJ12345678",
					workId: "RJ12345678",
					userId: "test-discord-id",
					evaluationType: "star",
					starRating: 3,
					createdAt: { toDate: () => new Date() },
					updatedAt: { toDate: () => new Date() },
				};

				const mockFirestore = createMockFirestore({
					transactionResult: null,
					evaluationData: existingEval,
					transactionCallback: (transaction) => {
						// Verify delete was called
						expect(transaction.delete).toHaveBeenCalled();
					},
				});

				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", { type: "remove" });

				expect(result.success).toBe(true);
			});
		});

		describe("10選の複雑な操作", () => {
			it("adds work to position 3 and shifts existing works", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const existingTop10 = {
					userId: "test-discord-id",
					rankings: {
						1: { workId: "RJ111", workTitle: "Work 1", updatedAt: new Date().toISOString() },
						2: { workId: "RJ222", workTitle: "Work 2", updatedAt: new Date().toISOString() },
						3: { workId: "RJ333", workTitle: "Work 3", updatedAt: new Date().toISOString() },
						4: { workId: "RJ444", workTitle: "Work 4", updatedAt: new Date().toISOString() },
					},
					totalCount: 4,
					lastUpdatedAt: new Date().toISOString(),
				};

				const savedEvaluation = {
					id: "test-discord-id_RJ12345678",
					workId: "RJ12345678",
					userId: "test-discord-id",
					evaluationType: "top10",
					top10Rank: 3,
					createdAt: { toDate: () => new Date() },
					updatedAt: { toDate: () => new Date() },
				};

				const mockFirestore = createMockFirestore({
					transactionResult: "test-discord-id_RJ12345678",
					evaluationData: savedEvaluation,
					top10Data: existingTop10,
					transactionCallback: (transaction) => {
						// Verify the rankings were updated correctly
						const setCall = transaction.set.mock.calls.find(
							(call: any) => call[1].rankings !== undefined,
						);
						if (setCall) {
							expect(setCall[1].rankings[1].workId).toBe("RJ111");
							expect(setCall[1].rankings[2].workId).toBe("RJ222");
							expect(setCall[1].rankings[3].workId).toBe("RJ12345678");
							expect(setCall[1].rankings[4].workId).toBe("RJ333");
							expect(setCall[1].rankings[5].workId).toBe("RJ444");
						}
					},
				});

				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", {
					type: "top10",
					top10Rank: 3,
					workTitle: "New Work",
				});

				expect(result.success).toBe(true);
				expect(result.data?.evaluationType).toBe("top10");
				expect(result.data?.top10Rank).toBe(3);
			});

			it("removes 11th work when adding to full list", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const fullTop10: any = {
					userId: "test-discord-id",
					rankings: {},
					totalCount: 10,
					lastUpdatedAt: new Date().toISOString(),
				};

				// Fill all 10 positions
				for (let i = 1; i <= 10; i++) {
					fullTop10.rankings[i] = {
						workId: `RJ${i.toString().padStart(3, "0")}`,
						workTitle: `Work ${i}`,
						updatedAt: new Date().toISOString(),
					};
				}

				const savedEvaluation = {
					id: "test-discord-id_RJ12345678",
					workId: "RJ12345678",
					userId: "test-discord-id",
					evaluationType: "top10",
					top10Rank: 5,
					createdAt: { toDate: () => new Date() },
					updatedAt: { toDate: () => new Date() },
				};

				const mockFirestore = createMockFirestore({
					transactionResult: "test-discord-id_RJ12345678",
					evaluationData: savedEvaluation,
					top10Data: fullTop10,
					transactionCallback: (transaction) => {
						// Verify that the removed work was converted to 3-star rating (not deleted)
						const starRatingSetCalls = transaction.set.mock.calls.filter(
							(call: any) => call[1].starRating === 3 && call[1].evaluationType === "star",
						);
						expect(starRatingSetCalls.length).toBeGreaterThan(0);

						// Check final rankings
						const setCall = transaction.set.mock.calls.find(
							(call: any) => call[1].rankings !== undefined,
						);
						if (setCall) {
							expect(Object.keys(setCall[1].rankings)).toHaveLength(10);
							expect(setCall[1].rankings[5].workId).toBe("RJ12345678");
						}
					},
				});

				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", {
					type: "top10",
					top10Rank: 5,
					workTitle: "New Work",
				});

				expect(result.success).toBe(true);
			});

			it("removes work from top10 when deleting evaluation", async () => {
				mockAuth.mockResolvedValueOnce({
					user: { discordId: "test-discord-id" },
				} as any);

				const existingTop10 = {
					rankings: {
						1: { workId: "RJ111", workTitle: "Work 1" },
						2: { workId: "RJ12345678", workTitle: "Target Work" },
						3: { workId: "RJ333", workTitle: "Work 3" },
					},
					totalCount: 3,
				};

				const mockTransaction = {
					get: vi.fn((ref: any) => {
						if (ref.toString?.().includes("top10")) {
							return { exists: true, data: () => existingTop10 };
						}
						return {
							exists: true,
							data: () => ({ evaluationType: "top10", top10Rank: 2 }),
						};
					}),
					set: vi.fn(),
					delete: vi.fn(),
				};

				const mockFirestore = {
					runTransaction: vi.fn(async (callback: any) => {
						await callback(mockTransaction);
						return null;
					}),
					collection: vi.fn(() => ({
						doc: vi.fn(() => ({
							collection: vi.fn(() => ({
								doc: vi.fn(() => ({
									toString: () => "users/test-discord-id/top10/ranking",
								})),
							})),
						})),
					})),
				};
				mockGetFirestore.mockReturnValue(mockFirestore as any);

				const result = await updateWorkEvaluation("RJ12345678", { type: "remove" });

				expect(result.success).toBe(true);

				// Check that top10 was updated
				const setCall = mockTransaction.set.mock.calls[0];
				expect(setCall[1].rankings[1].workId).toBe("RJ111");
				expect(setCall[1].rankings[2].workId).toBe("RJ333");
				expect(setCall[1].totalCount).toBe(2);
			});
		});
	});

	describe("getWorkEvaluation", () => {
		it("returns null when not authenticated", async () => {
			mockAuth.mockResolvedValueOnce(null);

			const result = await getWorkEvaluation("RJ12345678");

			expect(result).toBeNull();
		});

		it("returns evaluation when it exists", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { discordId: "test-discord-id" },
			} as any);

			const mockFirestore = {
				collection: vi.fn(() => ({
					doc: vi.fn(() => ({
						get: vi.fn().mockResolvedValue({
							exists: true,
							data: () => ({
								id: "test-discord-id_RJ12345678",
								workId: "RJ12345678",
								userId: "test-discord-id",
								evaluationType: "star",
								starRating: 3,
								createdAt: { toDate: () => new Date("2024-01-01") },
								updatedAt: { toDate: () => new Date("2024-01-02") },
							}),
						}),
					})),
				})),
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await getWorkEvaluation("RJ12345678");

			expect(result).toEqual({
				id: "test-discord-id_RJ12345678",
				workId: "RJ12345678",
				userId: "test-discord-id",
				evaluationType: "star",
				starRating: 3,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-02T00:00:00.000Z",
			});
		});
	});

	describe("getUserTop10List", () => {
		it("returns null when not authenticated", async () => {
			mockAuth.mockResolvedValueOnce(null);

			const result = await getUserTop10List();

			expect(result).toBeNull();
		});

		it("returns top10 list when it exists", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { discordId: "test-discord-id" },
			} as any);

			const mockFirestore = {
				collection: vi.fn(() => ({
					doc: vi.fn(() => ({
						collection: vi.fn(() => ({
							doc: vi.fn(() => ({
								get: vi.fn().mockResolvedValue({
									exists: true,
									data: () => ({
										userId: "test-discord-id",
										rankings: {
											1: {
												workId: "RJ111",
												workTitle: "Work 1",
												updatedAt: { toDate: () => new Date("2024-01-01") },
											},
										},
										totalCount: 1,
										lastUpdatedAt: { toDate: () => new Date("2024-01-03") },
									}),
								}),
							})),
						})),
					})),
				})),
			};
			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await getUserTop10List();

			expect(result).toEqual({
				userId: "test-discord-id",
				rankings: {
					1: {
						workId: "RJ111",
						workTitle: "Work 1",
						updatedAt: "2024-01-01T00:00:00.000Z",
					},
				},
				totalCount: 1,
				lastUpdatedAt: "2024-01-03T00:00:00.000Z",
			});
		});
	});

	describe("removeWorkEvaluation", () => {
		it("calls updateWorkEvaluation with remove type", async () => {
			mockAuth.mockResolvedValueOnce({
				user: { discordId: "test-discord-id" },
			} as any);

			const existingEval = {
				id: "test-discord-id_RJ12345678",
				workId: "RJ12345678",
				userId: "test-discord-id",
				evaluationType: "star",
				starRating: 3,
				createdAt: { toDate: () => new Date() },
				updatedAt: { toDate: () => new Date() },
			};

			const mockFirestore = createMockFirestore({
				transactionResult: null,
				evaluationData: existingEval,
				transactionCallback: (transaction) => {
					expect(transaction.delete).toHaveBeenCalled();
				},
			});

			mockGetFirestore.mockReturnValue(mockFirestore as any);

			const result = await removeWorkEvaluation("RJ12345678");

			expect(result.success).toBe(true);
		});
	});
});
