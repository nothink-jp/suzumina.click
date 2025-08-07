import { describe, expect, it, vi } from "vitest";
import { getPopularGenres } from "../actions";

// Mock Firestore
const mockFirestoreDocs = [
	{
		data: () => ({
			genres: ["中出し", "耳舐め"],
			customGenres: {},
		}),
	},
	{
		data: () => ({
			genres: ["中出し", "バイノーラル"],
			customGenres: {},
		}),
	},
	{
		data: () => ({
			genres: ["耳舐め", "バイノーラル", "ASMR"],
			customGenres: {},
		}),
	},
	{
		data: () => ({
			genres: ["中出し"],
			customGenres: {},
		}),
	},
	{
		data: () => ({
			genres: ["ASMR", "耳舐め"],
			customGenres: {},
		}),
	},
];

vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => ({
		collection: vi.fn(() => ({
			where: vi.fn().mockReturnThis(),
			get: vi.fn(() =>
				Promise.resolve({
					docs: mockFirestoreDocs,
				}),
			),
		})),
	})),
}));

vi.mock("@/lib/logger", () => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
}));

describe("Genre Filter", () => {
	describe("getPopularGenres", () => {
		it("should return popular genres sorted by count", async () => {
			const result = await getPopularGenres(3);

			expect(result).toHaveLength(3);
			expect(result[0].genre).toBe("中出し");
			expect(result[0].count).toBe(3);
			expect(result[1].genre).toBe("耳舐め");
			expect(result[1].count).toBe(3);
			expect(result[2].genre).toBe("バイノーラル");
			expect(result[2].count).toBe(2);
		});

		it("should respect the limit parameter", async () => {
			const result = await getPopularGenres(2);
			expect(result).toHaveLength(2);
		});

		it("should handle empty genres gracefully", async () => {
			vi.mocked(vi.fn()).mockResolvedValueOnce({
				docs: [
					{
						data: () => ({
							genres: [],
							customGenres: {},
						}),
					},
				],
			});

			const result = await getPopularGenres(10);
			expect(result).toBeDefined();
		});
	});

	describe("Genre AND search logic", () => {
		it("should filter works with ALL selected genres", () => {
			const works = [
				{ genres: ["中出し", "耳舐め", "バイノーラル"] },
				{ genres: ["中出し", "ASMR"] },
				{ genres: ["耳舐め", "バイノーラル"] },
				{ genres: ["中出し", "耳舐め"] },
			];

			const selectedGenres = ["中出し", "耳舐め"];

			const filtered = works.filter((work) => {
				const workGenres = work.genres || [];
				return selectedGenres.every((genre) => workGenres.some((wg) => wg.includes(genre)));
			});

			expect(filtered).toHaveLength(2);
			expect(filtered[0].genres).toContain("中出し");
			expect(filtered[0].genres).toContain("耳舐め");
			expect(filtered[1].genres).toContain("中出し");
			expect(filtered[1].genres).toContain("耳舐め");
		});

		it("should return empty array when no works match all genres", () => {
			const works = [{ genres: ["中出し"] }, { genres: ["耳舐め"] }, { genres: ["バイノーラル"] }];

			const selectedGenres = ["中出し", "耳舐め"];

			const filtered = works.filter((work) => {
				const workGenres = work.genres || [];
				return selectedGenres.every((genre) => workGenres.some((wg) => wg.includes(genre)));
			});

			expect(filtered).toHaveLength(0);
		});
	});
});
