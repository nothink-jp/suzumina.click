import { describe, expect, it } from "vitest";
import {
	CREATOR_ROLE_LABELS,
	CREATOR_ROLE_PRIORITY,
	CreatorRole,
	CreatorsInfo,
	CreatorUtils,
} from "../creator-type";

describe("creator-type", () => {
	describe("CreatorRole", () => {
		it("should validate valid creator roles", () => {
			expect(() => CreatorRole.parse("voice")).not.toThrow();
			expect(() => CreatorRole.parse("illustration")).not.toThrow();
			expect(() => CreatorRole.parse("scenario")).not.toThrow();
			expect(() => CreatorRole.parse("music")).not.toThrow();
			expect(() => CreatorRole.parse("other")).not.toThrow();
		});

		it("should reject invalid creator roles", () => {
			expect(() => CreatorRole.parse("invalid")).toThrow();
			expect(() => CreatorRole.parse("")).toThrow();
		});
	});

	describe("CREATOR_ROLE_LABELS", () => {
		it("should have labels for all roles", () => {
			expect(CREATOR_ROLE_LABELS.voice).toBe("声優");
			expect(CREATOR_ROLE_LABELS.illustration).toBe("イラスト");
			expect(CREATOR_ROLE_LABELS.scenario).toBe("シナリオ");
			expect(CREATOR_ROLE_LABELS.music).toBe("音楽");
			expect(CREATOR_ROLE_LABELS.other).toBe("その他");
		});
	});

	describe("CREATOR_ROLE_PRIORITY", () => {
		it("should have correct priority order", () => {
			expect(CREATOR_ROLE_PRIORITY.voice).toBe(1);
			expect(CREATOR_ROLE_PRIORITY.scenario).toBe(2);
			expect(CREATOR_ROLE_PRIORITY.illustration).toBe(3);
			expect(CREATOR_ROLE_PRIORITY.music).toBe(4);
			expect(CREATOR_ROLE_PRIORITY.other).toBe(5);
		});
	});

	describe("CreatorsInfo", () => {
		it("should create valid creators info with defaults", () => {
			const creators = CreatorsInfo.parse({});
			expect(creators.voice).toEqual([]);
			expect(creators.scenario).toEqual([]);
			expect(creators.illustration).toEqual([]);
			expect(creators.music).toEqual([]);
			expect(creators.other).toEqual([]);
		});

		it("should create valid creators info with data", () => {
			const input = {
				voice: ["涼花みなせ", "Voice Actor 2"],
				scenario: ["Writer 1"],
				illustration: ["Artist 1", "Artist 2"],
				music: ["Composer 1"],
				other: ["Other 1"],
			};
			const creators = CreatorsInfo.parse(input);
			expect(creators.voice).toEqual(["涼花みなせ", "Voice Actor 2"]);
			expect(creators.scenario).toEqual(["Writer 1"]);
			expect(creators.illustration).toEqual(["Artist 1", "Artist 2"]);
			expect(creators.music).toEqual(["Composer 1"]);
			expect(creators.other).toEqual(["Other 1"]);
		});

		describe("transform methods", () => {
			const testCreators = CreatorsInfo.parse({
				voice: ["涼花みなせ", "Voice Actor 2"],
				scenario: ["Writer 1"],
				illustration: ["Artist 1"],
				music: [],
				other: [],
			});

			describe("getAll", () => {
				it("should return all creators sorted by priority", () => {
					const all = testCreators.getAll();
					expect(all).toHaveLength(4);
					expect(all[0]).toEqual({ type: "voice", name: "涼花みなせ" });
					expect(all[1]).toEqual({ type: "voice", name: "Voice Actor 2" });
					expect(all[2]).toEqual({ type: "scenario", name: "Writer 1" });
					expect(all[3]).toEqual({ type: "illustration", name: "Artist 1" });
				});

				it("should handle empty creators", () => {
					const emptyCreators = CreatorsInfo.parse({});
					expect(emptyCreators.getAll()).toEqual([]);
				});
			});

			describe("hasCreators", () => {
				it("should return true when creators exist", () => {
					expect(testCreators.hasCreators()).toBe(true);
				});

				it("should return false when no creators exist", () => {
					const emptyCreators = CreatorsInfo.parse({});
					expect(emptyCreators.hasCreators()).toBe(false);
				});
			});

			describe("countByType", () => {
				it("should count creators by type", () => {
					expect(testCreators.countByType("voice")).toBe(2);
					expect(testCreators.countByType("scenario")).toBe(1);
					expect(testCreators.countByType("illustration")).toBe(1);
					expect(testCreators.countByType("music")).toBe(0);
					expect(testCreators.countByType("other")).toBe(0);
				});
			});

			describe("totalCount", () => {
				it("should return total creator count", () => {
					expect(testCreators.totalCount()).toBe(4);
				});

				it("should return 0 for empty creators", () => {
					const emptyCreators = CreatorsInfo.parse({});
					expect(emptyCreators.totalCount()).toBe(0);
				});
			});

			describe("getPrimary", () => {
				it("should return first creator of each type", () => {
					const primary = testCreators.getPrimary();
					expect(primary).toEqual({
						voice: "涼花みなせ",
						scenario: "Writer 1",
						illustration: "Artist 1",
					});
				});

				it("should handle empty types", () => {
					const creators = CreatorsInfo.parse({
						voice: ["涼花みなせ"],
					});
					const primary = creators.getPrimary();
					expect(primary).toEqual({
						voice: "涼花みなせ",
					});
				});
			});

			describe("equals", () => {
				it("should return true for equal creators", () => {
					const creators1 = CreatorsInfo.parse({
						voice: ["涼花みなせ", "Voice Actor 2"],
						scenario: ["Writer 1"],
					});
					const creators2 = CreatorsInfo.parse({
						voice: ["Voice Actor 2", "涼花みなせ"], // Different order
						scenario: ["Writer 1"],
					});
					expect(creators1.equals(creators2)).toBe(true);
				});

				it("should return false for different creators", () => {
					const creators1 = CreatorsInfo.parse({
						voice: ["涼花みなせ"],
					});
					const creators2 = CreatorsInfo.parse({
						voice: ["Voice Actor 2"],
					});
					expect(creators1.equals(creators2)).toBe(false);
				});

				it("should handle empty creators", () => {
					const creators1 = CreatorsInfo.parse({});
					const creators2 = CreatorsInfo.parse({});
					expect(creators1.equals(creators2)).toBe(true);
				});
			});
		});
	});

	describe("CreatorUtils", () => {
		describe("getTypeLabel", () => {
			it("should return correct labels", () => {
				expect(CreatorUtils.getTypeLabel("voice")).toBe("声優");
				expect(CreatorUtils.getTypeLabel("illustration")).toBe("イラスト");
				expect(CreatorUtils.getTypeLabel("scenario")).toBe("シナリオ");
				expect(CreatorUtils.getTypeLabel("music")).toBe("音楽");
				expect(CreatorUtils.getTypeLabel("other")).toBe("その他");
			});
		});

		describe("getTypeLabels", () => {
			it("should handle empty array", () => {
				expect(CreatorUtils.getTypeLabels([])).toBe("");
			});

			it("should handle single type", () => {
				expect(CreatorUtils.getTypeLabels(["voice" as CreatorRole])).toBe("声優");
			});

			it("should handle multiple types", () => {
				expect(CreatorUtils.getTypeLabels(["voice", "illustration"] as CreatorRole[])).toBe(
					"声優 / イラスト",
				);
			});

			it("should handle unknown types gracefully", () => {
				expect(CreatorUtils.getTypeLabels(["unknown" as any])).toBe("unknown");
			});
		});

		describe("mergeCreators", () => {
			it("should merge and deduplicate creators", () => {
				const result = CreatorUtils.mergeCreators(
					["涼花みなせ", "Voice Actor 2"],
					["Voice Actor 2", "Voice Actor 3"],
					["涼花みなせ"],
				);
				expect(result).toEqual(["涼花みなせ", "Voice Actor 2", "Voice Actor 3"]);
			});

			it("should handle empty arrays", () => {
				expect(CreatorUtils.mergeCreators([], [], [])).toEqual([]);
			});

			it("should handle single array", () => {
				expect(CreatorUtils.mergeCreators(["涼花みなせ"])).toEqual(["涼花みなせ"]);
			});
		});

		describe("fromApiCreaters", () => {
			it("should convert API format to CreatorsInfo", () => {
				const apiData = [
					{ type: "voice", name: "涼花みなせ" },
					{ type: "Voice", name: "Voice Actor 2" }, // Case insensitive
					{ type: "scenario", name: "Writer 1" },
					{ type: "unknown", name: "Unknown Creator" }, // Should go to other
				];

				const creators = CreatorUtils.fromApiCreaters(apiData);
				expect(creators.voice).toEqual(["涼花みなせ", "Voice Actor 2"]);
				expect(creators.scenario).toEqual(["Writer 1"]);
				expect(creators.other).toEqual(["Unknown Creator"]);
			});

			it("should handle empty input", () => {
				const creators = CreatorUtils.fromApiCreaters([]);
				expect(creators.hasCreators()).toBe(false);
			});

			it("should handle undefined input", () => {
				const creators = CreatorUtils.fromApiCreaters(undefined);
				expect(creators.hasCreators()).toBe(false);
			});

			it("should deduplicate creators", () => {
				const apiData = [
					{ type: "voice", name: "涼花みなせ" },
					{ type: "voice", name: "涼花みなせ" }, // Duplicate
				];

				const creators = CreatorUtils.fromApiCreaters(apiData);
				expect(creators.voice).toEqual(["涼花みなせ"]);
			});
		});
	});
});
