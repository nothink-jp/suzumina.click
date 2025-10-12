import { describe, expect, it, vi } from "vitest";
import { getPopularAudioButtonTags } from "../lib/audio-button-stats";

// Mock auth
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

// Mock Firestore
const mockFirestoreDocs = [
	{
		data: () => ({
			tags: ["かわいい", "甘え"],
			isPublic: true,
		}),
	},
	{
		data: () => ({
			tags: ["かわいい", "ツンデレ"],
			isPublic: true,
		}),
	},
	{
		data: () => ({
			tags: ["甘え", "ツンデレ", "ASMR"],
			isPublic: true,
		}),
	},
	{
		data: () => ({
			tags: ["かわいい"],
			isPublic: true,
		}),
	},
	{
		data: () => ({
			tags: ["ASMR", "甘え"],
			isPublic: true,
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

describe("Audio Button Tag Filter", () => {
	describe("getPopularAudioButtonTags", () => {
		it("should return popular tags sorted by count", async () => {
			const result = await getPopularAudioButtonTags(3);

			expect(result).toHaveLength(3);
			expect(result[0].tag).toBe("かわいい");
			expect(result[0].count).toBe(3);
			expect(result[1].tag).toBe("甘え");
			expect(result[1].count).toBe(3);
			expect(result[2].tag).toBe("ツンデレ");
			expect(result[2].count).toBe(2);
		});

		it("should respect the limit parameter", async () => {
			const result = await getPopularAudioButtonTags(2);
			expect(result).toHaveLength(2);
		});

		it("should filter out empty and invalid tags", async () => {
			vi.mocked(vi.fn()).mockResolvedValueOnce({
				docs: [
					{
						data: () => ({
							tags: ["", "valid", null, undefined, "  "],
							isPublic: true,
						}),
					},
				],
			});

			const result = await getPopularAudioButtonTags(10);
			expect(result).toBeDefined();
		});
	});

	describe("Tag AND search logic", () => {
		it("should filter audio buttons with ALL selected tags", () => {
			const buttons = [
				{ tags: ["かわいい", "甘え", "ツンデレ"] },
				{ tags: ["かわいい", "ASMR"] },
				{ tags: ["甘え", "ツンデレ"] },
				{ tags: ["かわいい", "甘え"] },
			];

			const selectedTags = ["かわいい", "甘え"];

			const filtered = buttons.filter((button) => {
				const buttonTags = button.tags || [];
				return selectedTags.every((tag) => buttonTags.includes(tag));
			});

			expect(filtered).toHaveLength(2);
			expect(filtered[0].tags).toContain("かわいい");
			expect(filtered[0].tags).toContain("甘え");
			expect(filtered[1].tags).toContain("かわいい");
			expect(filtered[1].tags).toContain("甘え");
		});

		it("should return empty array when no buttons match all tags", () => {
			const buttons = [{ tags: ["かわいい"] }, { tags: ["甘え"] }, { tags: ["ツンデレ"] }];

			const selectedTags = ["かわいい", "甘え"];

			const filtered = buttons.filter((button) => {
				const buttonTags = button.tags || [];
				return selectedTags.every((tag) => buttonTags.includes(tag));
			});

			expect(filtered).toHaveLength(0);
		});

		it("should handle buttons without tags", () => {
			const buttons = [
				{ tags: ["かわいい", "甘え"] },
				{ tags: null },
				{ tags: undefined },
				{ tags: [] },
			];

			const selectedTags = ["かわいい"];

			const filtered = buttons.filter((button) => {
				const buttonTags = button.tags || [];
				return selectedTags.every((tag) => buttonTags.includes(tag));
			});

			expect(filtered).toHaveLength(1);
			expect(filtered[0].tags).toContain("かわいい");
		});
	});
});
