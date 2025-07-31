import { describe, expect, it } from "vitest";
import { WorkCreators } from "../work-creators";

describe("WorkCreators", () => {
	// Helper to create sample creators
	const sampleCreators = {
		voiceActors: [
			{ id: "va1", name: "声優1" },
			{ id: "va2", name: "声優2" },
		],
		scenario: [{ id: "sc1", name: "シナリオライター" }],
		illustration: [{ id: "il1", name: "イラストレーター" }],
		music: [{ id: "mu1", name: "音楽制作者" }],
		others: [{ id: "ot1", name: "その他スタッフ" }],
	};

	describe("constructor", () => {
		it("should create with all creator types", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			expect(creators.voiceActors).toEqual(sampleCreators.voiceActors);
			expect(creators.scenario).toEqual(sampleCreators.scenario);
			expect(creators.illustration).toEqual(sampleCreators.illustration);
			expect(creators.music).toEqual(sampleCreators.music);
			expect(creators.others).toEqual(sampleCreators.others);
		});

		it("should create with empty arrays by default", () => {
			const creators = new WorkCreators();
			expect(creators.voiceActors).toEqual([]);
			expect(creators.scenario).toEqual([]);
			expect(creators.illustration).toEqual([]);
			expect(creators.music).toEqual([]);
			expect(creators.others).toEqual([]);
		});

		it("should filter out invalid entries", () => {
			const creators = new WorkCreators([
				{ id: "va1", name: "声優1" },
				{ id: "va2", name: "" }, // Empty name
				{ id: "va3", name: "   " }, // Whitespace only
				null as any, // Invalid entry
				{ id: "va4", name: "声優4" },
			]);

			expect(creators.voiceActors).toEqual([
				{ id: "va1", name: "声優1" },
				{ id: "va4", name: "声優4" },
			]);
		});
	});

	describe("name getters", () => {
		it("should return arrays of names", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			expect(creators.voiceActorNames).toEqual(["声優1", "声優2"]);
			expect(creators.scenarioNames).toEqual(["シナリオライター"]);
			expect(creators.illustrationNames).toEqual(["イラストレーター"]);
			expect(creators.musicNames).toEqual(["音楽制作者"]);
			expect(creators.otherNames).toEqual(["その他スタッフ"]);
		});
	});

	describe("getAll", () => {
		it("should return all creators in order", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			const all = creators.getAll();
			expect(all).toHaveLength(6);
			expect(all[0]).toEqual({ id: "va1", name: "声優1" });
			expect(all[5]).toEqual({ id: "ot1", name: "その他スタッフ" });
		});
	});

	describe("getAllNames", () => {
		it("should return all creator names", () => {
			const creators = new WorkCreators(sampleCreators.voiceActors, sampleCreators.scenario);

			expect(creators.getAllNames()).toEqual(["声優1", "声優2", "シナリオライター"]);
		});
	});

	describe("getAllUnique", () => {
		it("should return unique creators by ID", () => {
			const creators = new WorkCreators(
				[{ id: "1", name: "クリエイター1" }],
				[{ id: "1", name: "クリエイター1" }], // Duplicate ID
				[{ id: "2", name: "クリエイター2" }],
			);

			const unique = creators.getAllUnique();
			expect(unique).toHaveLength(2);
			expect(unique.map((c) => c.id)).toEqual(["1", "2"]);
		});
	});

	describe("getAllUniqueNames", () => {
		it("should return unique creator names", () => {
			const creators = new WorkCreators(
				[
					{ id: "1", name: "同じ名前" },
					{ id: "2", name: "同じ名前" },
				],
				[{ id: "3", name: "別の名前" }],
			);

			expect(creators.getAllUniqueNames()).toEqual(["同じ名前", "別の名前"]);
		});
	});

	describe("hasVoiceActors", () => {
		it("should return true when has voice actors", () => {
			const creators = new WorkCreators([{ id: "1", name: "声優" }]);
			expect(creators.hasVoiceActors()).toBe(true);
		});

		it("should return false when no voice actors", () => {
			const creators = new WorkCreators();
			expect(creators.hasVoiceActors()).toBe(false);
		});
	});

	describe("hasAnyCreators", () => {
		it("should return true when has any creators", () => {
			const creators = new WorkCreators([], [{ id: "1", name: "シナリオ" }]);
			expect(creators.hasAnyCreators()).toBe(true);
		});

		it("should return false when no creators", () => {
			const creators = new WorkCreators();
			expect(creators.hasAnyCreators()).toBe(false);
		});
	});

	describe("getPrimaryVoiceActor", () => {
		it("should return first voice actor", () => {
			const creators = new WorkCreators(sampleCreators.voiceActors);
			expect(creators.getPrimaryVoiceActor()).toEqual({ id: "va1", name: "声優1" });
		});

		it("should return undefined when no voice actors", () => {
			const creators = new WorkCreators();
			expect(creators.getPrimaryVoiceActor()).toBeUndefined();
		});
	});

	describe("getPrimaryVoiceActorName", () => {
		it("should return first voice actor name", () => {
			const creators = new WorkCreators(sampleCreators.voiceActors);
			expect(creators.getPrimaryVoiceActorName()).toBe("声優1");
		});

		it("should return undefined when no voice actors", () => {
			const creators = new WorkCreators();
			expect(creators.getPrimaryVoiceActorName()).toBeUndefined();
		});
	});

	describe("getSearchableText", () => {
		it("should return unique names joined", () => {
			const creators = new WorkCreators(
				[{ id: "1", name: "声優" }],
				[{ id: "2", name: "声優" }], // Duplicate name
				[{ id: "3", name: "イラスト" }],
			);

			expect(creators.getSearchableText()).toBe("声優 イラスト");
		});
	});

	describe("toString", () => {
		it("should format all creator types", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			expect(creators.toString()).toBe(
				"CV: 声優1, 声優2 / シナリオ: シナリオライター / イラスト: イラストレーター / 音楽: 音楽制作者 / その他: その他スタッフ",
			);
		});

		it("should omit empty categories", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				[], // No scenario
				sampleCreators.illustration,
			);

			expect(creators.toString()).toBe("CV: 声優1, 声優2 / イラスト: イラストレーター");
		});

		it("should return empty string when no creators", () => {
			const creators = new WorkCreators();
			expect(creators.toString()).toBe("");
		});
	});

	describe("toJSON", () => {
		it("should use underscore property names", () => {
			const creators = new WorkCreators(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			expect(creators.toJSON()).toEqual({
				voice_by: sampleCreators.voiceActors,
				scenario_by: sampleCreators.scenario,
				illust_by: sampleCreators.illustration,
				music_by: sampleCreators.music,
				others_by: sampleCreators.others,
			});
		});
	});

	describe("toPlainObject", () => {
		it("should include both objects and name arrays", () => {
			const creators = new WorkCreators(sampleCreators.voiceActors);
			const plain = creators.toPlainObject();

			expect(plain.voiceActors).toEqual(sampleCreators.voiceActors);
			expect(plain.voiceActorNames).toEqual(["声優1", "声優2"]);
		});
	});

	describe("equals", () => {
		it("should return true for equal creators", () => {
			const creators1 = new WorkCreators(sampleCreators.voiceActors);
			const creators2 = new WorkCreators(sampleCreators.voiceActors);
			expect(creators1.equals(creators2)).toBe(true);
		});

		it("should return false for different creators", () => {
			const creators1 = new WorkCreators([{ id: "1", name: "声優1" }]);
			const creators2 = new WorkCreators([{ id: "2", name: "声優2" }]);
			expect(creators1.equals(creators2)).toBe(false);
		});

		it("should return false for different order", () => {
			const creators1 = new WorkCreators([
				{ id: "1", name: "声優1" },
				{ id: "2", name: "声優2" },
			]);
			const creators2 = new WorkCreators([
				{ id: "2", name: "声優2" },
				{ id: "1", name: "声優1" },
			]);
			expect(creators1.equals(creators2)).toBe(false);
		});

		it("should return false for non-WorkCreators", () => {
			const creators = new WorkCreators();
			expect(creators.equals({} as any)).toBe(false);
		});
	});

	describe("fromCreatorsObject", () => {
		it("should create from API object", () => {
			const creators = WorkCreators.fromCreatorsObject({
				voice_by: [{ id: "1", name: "声優" }],
				scenario_by: [{ id: "2", name: "シナリオ" }],
				illust_by: [{ id: "3", name: "イラスト" }],
				music_by: [{ id: "4", name: "音楽" }],
				others_by: [{ id: "5", name: "その他" }],
				created_by: [{ id: "6", name: "制作" }],
			});

			expect(creators.voiceActors).toHaveLength(1);
			expect(creators.scenario).toHaveLength(1);
			expect(creators.illustration).toHaveLength(1);
			expect(creators.music).toHaveLength(1);
			expect(creators.others).toHaveLength(2); // others_by + created_by
		});

		it("should handle undefined creators", () => {
			const creators = WorkCreators.fromCreatorsObject(undefined);
			expect(creators.hasAnyCreators()).toBe(false);
		});

		it("should handle partial creators", () => {
			const creators = WorkCreators.fromCreatorsObject({
				voice_by: [{ id: "1", name: "声優" }],
				// Other fields undefined
			});

			expect(creators.voiceActors).toHaveLength(1);
			expect(creators.scenario).toHaveLength(0);
		});
	});

	describe("fromLegacyArrays", () => {
		it("should create from string arrays", () => {
			const creators = WorkCreators.fromLegacyArrays({
				voiceActors: ["声優1", "声優2"],
				scenario: ["シナリオ"],
				illustration: ["イラスト"],
				music: ["音楽"],
				author: ["作者"],
			});

			expect(creators.voiceActors).toEqual([
				{ id: "声優1", name: "声優1" },
				{ id: "声優2", name: "声優2" },
			]);
			expect(creators.scenario).toEqual([{ id: "シナリオ", name: "シナリオ" }]);
			expect(creators.others).toEqual([{ id: "作者", name: "作者" }]);
		});

		it("should handle empty data", () => {
			const creators = WorkCreators.fromLegacyArrays({});
			expect(creators.hasAnyCreators()).toBe(false);
		});
	});
});
