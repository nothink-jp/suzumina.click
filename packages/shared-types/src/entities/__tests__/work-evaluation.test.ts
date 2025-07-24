import { describe, expect, it } from "vitest";
import {
	convertToFrontendEvaluation,
	convertToFrontendTop10List,
	EvaluationInputSchema,
	type FirestoreWorkEvaluation,
	type FrontendWorkEvaluation,
	isNgEvaluation,
	isStarEvaluation,
	isTop10Evaluation,
	type UserTop10List,
	UserTop10ListSchema,
	WorkEvaluationSchema,
} from "../work-evaluation";

describe("work-evaluation", () => {
	describe("EvaluationInputSchema", () => {
		it("should validate top10 evaluation input", () => {
			const input = {
				type: "top10" as const,
				top10Rank: 5,
				workTitle: "素晴らしい作品",
			};
			expect(() => EvaluationInputSchema.parse(input)).not.toThrow();
		});

		it("should reject top10 without rank", () => {
			const input = {
				type: "top10" as const,
				workTitle: "素晴らしい作品",
			};
			expect(() => EvaluationInputSchema.parse(input)).toThrow();
		});

		it("should reject top10 without title", () => {
			const input = {
				type: "top10" as const,
				top10Rank: 5,
			};
			expect(() => EvaluationInputSchema.parse(input)).toThrow();
		});

		it("should validate star evaluation input", () => {
			const input = {
				type: "star" as const,
				starRating: 3 as const,
			};
			expect(() => EvaluationInputSchema.parse(input)).not.toThrow();
		});

		it("should reject star without rating", () => {
			const input = {
				type: "star" as const,
			};
			expect(() => EvaluationInputSchema.parse(input)).toThrow();
		});

		it("should validate ng evaluation input", () => {
			const input = {
				type: "ng" as const,
			};
			expect(() => EvaluationInputSchema.parse(input)).not.toThrow();
		});

		it("should validate remove evaluation input", () => {
			const input = {
				type: "remove" as const,
			};
			expect(() => EvaluationInputSchema.parse(input)).not.toThrow();
		});

		it("should reject invalid star ratings", () => {
			const input = {
				type: "star" as const,
				starRating: 4, // Invalid: should be 1, 2, or 3
			};
			expect(() => EvaluationInputSchema.parse(input)).toThrow();
		});

		it("should reject invalid top10 ranks", () => {
			const input = {
				type: "top10" as const,
				top10Rank: 11, // Invalid: should be 1-10
				workTitle: "作品",
			};
			expect(() => EvaluationInputSchema.parse(input)).toThrow();
		});
	});

	describe("WorkEvaluationSchema", () => {
		it("should validate complete work evaluation", () => {
			const evaluation = {
				id: "user123_RJ01414353",
				workId: "RJ01414353",
				userId: "user123",
				evaluationType: "star",
				starRating: 3,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-01T00:00:00.000Z",
			};
			expect(() => WorkEvaluationSchema.parse(evaluation)).not.toThrow();
		});

		it("should reject invalid work ID format", () => {
			const evaluation = {
				id: "user123_invalid",
				workId: "invalid", // Should match RJ\d+
				userId: "user123",
				evaluationType: "star",
				starRating: 3,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-01T00:00:00.000Z",
			};
			expect(() => WorkEvaluationSchema.parse(evaluation)).toThrow();
		});

		it("should reject invalid evaluation type", () => {
			const evaluation = {
				id: "user123_RJ01414353",
				workId: "RJ01414353",
				userId: "user123",
				evaluationType: "invalid", // Should be top10, star, or ng
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-01T00:00:00.000Z",
			};
			expect(() => WorkEvaluationSchema.parse(evaluation)).toThrow();
		});
	});

	describe("UserTop10ListSchema", () => {
		it("should validate user top10 list", () => {
			const list = {
				userId: "user123",
				rankings: {
					"1": {
						workId: "RJ01414353",
						workTitle: "作品タイトル",
						updatedAt: "2024-01-01T00:00:00.000Z",
					},
					"2": null,
					"3": {
						workId: "RJ01414354",
						updatedAt: "2024-01-01T00:00:00.000Z",
					},
				},
				lastUpdatedAt: "2024-01-01T00:00:00.000Z",
				totalCount: 2,
			};
			expect(() => UserTop10ListSchema.parse(list)).not.toThrow();
		});

		it("should reject invalid work ID in rankings", () => {
			const list = {
				userId: "user123",
				rankings: {
					"1": {
						workId: "invalid", // Should match RJ\d+
						updatedAt: "2024-01-01T00:00:00.000Z",
					},
				},
				lastUpdatedAt: "2024-01-01T00:00:00.000Z",
				totalCount: 1,
			};
			expect(() => UserTop10ListSchema.parse(list)).toThrow();
		});

		it("should reject invalid total count", () => {
			const list = {
				userId: "user123",
				rankings: {},
				lastUpdatedAt: "2024-01-01T00:00:00.000Z",
				totalCount: 11, // Should be 0-10
			};
			expect(() => UserTop10ListSchema.parse(list)).toThrow();
		});
	});

	describe("Type Guards", () => {
		describe("isTop10Evaluation", () => {
			it("should identify top10 evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "top10",
					top10Rank: 5,
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isTop10Evaluation(evaluation)).toBe(true);
			});

			it("should reject non-top10 evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					starRating: 3,
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isTop10Evaluation(evaluation)).toBe(false);
			});

			it("should reject top10 without rank", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "top10",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isTop10Evaluation(evaluation)).toBe(false);
			});
		});

		describe("isStarEvaluation", () => {
			it("should identify star evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					starRating: 3,
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isStarEvaluation(evaluation)).toBe(true);
			});

			it("should reject non-star evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "ng",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isStarEvaluation(evaluation)).toBe(false);
			});

			it("should reject star without rating", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isStarEvaluation(evaluation)).toBe(false);
			});
		});

		describe("isNgEvaluation", () => {
			it("should identify ng evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "ng",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isNgEvaluation(evaluation)).toBe(true);
			});

			it("should reject non-ng evaluations", () => {
				const evaluation: FrontendWorkEvaluation = {
					id: "test",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					starRating: 3,
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
				};
				expect(isNgEvaluation(evaluation)).toBe(false);
			});
		});
	});

	describe("Conversion Functions", () => {
		// Mock Firestore Timestamp
		const createTimestamp = (date: Date) => ({
			toDate: () => date,
		});

		describe("convertToFrontendEvaluation", () => {
			it("should convert Firestore evaluation to frontend format", () => {
				const firestoreData: FirestoreWorkEvaluation = {
					id: "user123_RJ01414353",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					starRating: 3,
					createdAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
					updatedAt: createTimestamp(new Date("2024-01-02T00:00:00.000Z")),
				};

				const result = convertToFrontendEvaluation(firestoreData);

				expect(result).toEqual({
					id: "user123_RJ01414353",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "star",
					starRating: 3,
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-02T00:00:00.000Z",
				});
			});

			it("should handle top10 evaluation", () => {
				const firestoreData: FirestoreWorkEvaluation = {
					id: "user123_RJ01414353",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "top10",
					top10Rank: 1,
					createdAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
					updatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
				};

				const result = convertToFrontendEvaluation(firestoreData);

				expect(result.evaluationType).toBe("top10");
				expect(result.top10Rank).toBe(1);
				expect(result.starRating).toBeUndefined();
			});

			it("should handle ng evaluation", () => {
				const firestoreData: FirestoreWorkEvaluation = {
					id: "user123_RJ01414353",
					workId: "RJ01414353",
					userId: "user123",
					evaluationType: "ng",
					createdAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
					updatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
				};

				const result = convertToFrontendEvaluation(firestoreData);

				expect(result.evaluationType).toBe("ng");
				expect(result.top10Rank).toBeUndefined();
				expect(result.starRating).toBeUndefined();
			});
		});

		describe("convertToFrontendTop10List", () => {
			it("should convert Firestore top10 list to frontend format", () => {
				const firestoreData: UserTop10List = {
					userId: "user123",
					rankings: {
						1: {
							workId: "RJ01414353",
							workTitle: "作品1",
							updatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
						},
						2: null,
						3: {
							workId: "RJ01414354",
							updatedAt: createTimestamp(new Date("2024-01-02T00:00:00.000Z")),
						},
					},
					lastUpdatedAt: createTimestamp(new Date("2024-01-02T00:00:00.000Z")),
					totalCount: 2,
				};

				const result = convertToFrontendTop10List(firestoreData);

				expect(result).toEqual({
					userId: "user123",
					rankings: {
						1: {
							workId: "RJ01414353",
							workTitle: "作品1",
							updatedAt: "2024-01-01T00:00:00.000Z",
						},
						2: null,
						3: {
							workId: "RJ01414354",
							workTitle: undefined,
							updatedAt: "2024-01-02T00:00:00.000Z",
						},
					},
					lastUpdatedAt: "2024-01-02T00:00:00.000Z",
					totalCount: 2,
				});
			});

			it("should handle empty rankings", () => {
				const firestoreData: UserTop10List = {
					userId: "user123",
					rankings: {},
					lastUpdatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
					totalCount: 0,
				};

				const result = convertToFrontendTop10List(firestoreData);

				expect(result.rankings).toEqual({});
				expect(result.totalCount).toBe(0);
			});

			it("should preserve null values in rankings", () => {
				const firestoreData: UserTop10List = {
					userId: "user123",
					rankings: {
						1: null,
						2: null,
						3: {
							workId: "RJ01414353",
							updatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
						},
					},
					lastUpdatedAt: createTimestamp(new Date("2024-01-01T00:00:00.000Z")),
					totalCount: 1,
				};

				const result = convertToFrontendTop10List(firestoreData);

				expect(result.rankings[1]).toBeNull();
				expect(result.rankings[2]).toBeNull();
				expect(result.rankings[3]).not.toBeNull();
			});
		});
	});
});
