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

	describe("create", () => {
		it("should create with all creator types", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);

			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.voiceActors).toEqual(sampleCreators.voiceActors);
			expect(creators.scenario).toEqual(sampleCreators.scenario);
			expect(creators.illustration).toEqual(sampleCreators.illustration);
			expect(creators.music).toEqual(sampleCreators.music);
			expect(creators.others).toEqual(sampleCreators.others);
		});

		it("should create with empty arrays by default", () => {
			const result = WorkCreators.create();
			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.voiceActors).toEqual([]);
			expect(creators.scenario).toEqual([]);
			expect(creators.illustration).toEqual([]);
			expect(creators.music).toEqual([]);
			expect(creators.others).toEqual([]);
		});

		it("should filter out invalid entries", () => {
			const result = WorkCreators.create([
				{ id: "va1", name: "声優1" },
				{ id: "va2", name: "" }, // Empty name
				{ id: "va3", name: "   " }, // Whitespace only
				null as any, // Invalid entry
				{ id: "va4", name: "声優4" },
			]);

			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.voiceActors).toEqual([
				{ id: "va1", name: "声優1" },
				{ id: "va4", name: "声優4" },
			]);
		});
	});

	describe("name getters", () => {
		it("should return arrays of names", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);
			const creators = result._unsafeUnwrap();

			expect(creators.voiceActorNames).toEqual(["声優1", "声優2"]);
			expect(creators.scenarioNames).toEqual(["シナリオライター"]);
			expect(creators.illustrationNames).toEqual(["イラストレーター"]);
			expect(creators.musicNames).toEqual(["音楽制作者"]);
			expect(creators.otherNames).toEqual(["その他スタッフ"]);
		});
	});

	describe("getAll", () => {
		it("should return all creators in order", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);
			const creators = result._unsafeUnwrap();

			const all = creators.getAll();
			expect(all).toHaveLength(6);
			expect(all[0]).toEqual({ id: "va1", name: "声優1" });
			expect(all[5]).toEqual({ id: "ot1", name: "その他スタッフ" });
		});
	});

	describe("getAllNames", () => {
		it("should return all creator names", () => {
			const result = WorkCreators.create(sampleCreators.voiceActors, sampleCreators.scenario);
			const creators = result._unsafeUnwrap();

			expect(creators.getAllNames()).toEqual(["声優1", "声優2", "シナリオライター"]);
		});
	});

	describe("getAllUnique", () => {
		it("should return unique creators by ID", () => {
			const result = WorkCreators.create(
				[{ id: "1", name: "クリエイター1" }],
				[{ id: "1", name: "クリエイター1" }], // Duplicate ID
				[{ id: "2", name: "クリエイター2" }],
			);
			const creators = result._unsafeUnwrap();

			const unique = creators.getAllUnique();
			expect(unique).toHaveLength(2);
			expect(unique.map((c) => c.id)).toEqual(["1", "2"]);
		});
	});

	describe("getAllUniqueNames", () => {
		it("should return unique creator names", () => {
			const result = WorkCreators.create(
				[
					{ id: "1", name: "同じ名前" },
					{ id: "2", name: "同じ名前" },
				],
				[{ id: "3", name: "別の名前" }],
			);
			const creators = result._unsafeUnwrap();

			expect(creators.getAllUniqueNames()).toEqual(["同じ名前", "別の名前"]);
		});
	});

	describe("hasVoiceActors", () => {
		it("should return true when has voice actors", () => {
			const result = WorkCreators.create([{ id: "1", name: "声優" }]);
			const creators = result._unsafeUnwrap();
			expect(creators.hasVoiceActors()).toBe(true);
		});

		it("should return false when no voice actors", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.hasVoiceActors()).toBe(false);
		});
	});

	describe("hasAnyCreators", () => {
		it("should return true when has any creators", () => {
			const result = WorkCreators.create([], [{ id: "1", name: "シナリオ" }]);
			const creators = result._unsafeUnwrap();
			expect(creators.hasAnyCreators()).toBe(true);
		});

		it("should return false when no creators", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.hasAnyCreators()).toBe(false);
		});
	});

	describe("getPrimaryVoiceActor", () => {
		it("should return first voice actor", () => {
			const result = WorkCreators.create(sampleCreators.voiceActors);
			const creators = result._unsafeUnwrap();
			expect(creators.getPrimaryVoiceActor()).toEqual({ id: "va1", name: "声優1" });
		});

		it("should return undefined when no voice actors", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.getPrimaryVoiceActor()).toBeUndefined();
		});
	});

	describe("getPrimaryVoiceActorName", () => {
		it("should return first voice actor name", () => {
			const result = WorkCreators.create(sampleCreators.voiceActors);
			const creators = result._unsafeUnwrap();
			expect(creators.getPrimaryVoiceActorName()).toBe("声優1");
		});

		it("should return undefined when no voice actors", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.getPrimaryVoiceActorName()).toBeUndefined();
		});
	});

	describe("getSearchableText", () => {
		it("should return unique names joined", () => {
			const result = WorkCreators.create(
				[{ id: "1", name: "声優" }],
				[{ id: "2", name: "声優" }], // Duplicate name
				[{ id: "3", name: "イラスト" }],
			);
			const creators = result._unsafeUnwrap();

			expect(creators.getSearchableText()).toBe("声優 イラスト");
		});
	});

	describe("toString", () => {
		it("should format all creator types", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);
			const creators = result._unsafeUnwrap();

			expect(creators.toString()).toBe(
				"CV: 声優1, 声優2 / シナリオ: シナリオライター / イラスト: イラストレーター / 音楽: 音楽制作者 / その他: その他スタッフ",
			);
		});

		it("should omit empty categories", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				[], // No scenario
				sampleCreators.illustration,
			);
			const creators = result._unsafeUnwrap();

			expect(creators.toString()).toBe("CV: 声優1, 声優2 / イラスト: イラストレーター");
		});

		it("should return empty string when no creators", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.toString()).toBe("");
		});
	});

	describe("toJSON", () => {
		it("should use underscore property names", () => {
			const result = WorkCreators.create(
				sampleCreators.voiceActors,
				sampleCreators.scenario,
				sampleCreators.illustration,
				sampleCreators.music,
				sampleCreators.others,
			);
			const creators = result._unsafeUnwrap();

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
		it("should include objects", () => {
			const result = WorkCreators.create(sampleCreators.voiceActors);
			const creators = result._unsafeUnwrap();
			const plain = creators.toPlainObject();

			expect(plain.voiceActors).toEqual(sampleCreators.voiceActors);
			expect(plain.scenario).toEqual([]);
			expect(plain.illustration).toEqual([]);
			expect(plain.music).toEqual([]);
			expect(plain.others).toEqual([]);
		});
	});

	describe("equals", () => {
		it("should return true for equal creators", () => {
			const result1 = WorkCreators.create(sampleCreators.voiceActors);
			const result2 = WorkCreators.create(sampleCreators.voiceActors);
			const creators1 = result1._unsafeUnwrap();
			const creators2 = result2._unsafeUnwrap();
			expect(creators1.equals(creators2)).toBe(true);
		});

		it("should return false for different creators", () => {
			const result1 = WorkCreators.create([{ id: "1", name: "声優1" }]);
			const result2 = WorkCreators.create([{ id: "2", name: "声優2" }]);
			const creators1 = result1._unsafeUnwrap();
			const creators2 = result2._unsafeUnwrap();
			expect(creators1.equals(creators2)).toBe(false);
		});

		it("should return false for different order", () => {
			const result1 = WorkCreators.create([
				{ id: "1", name: "声優1" },
				{ id: "2", name: "声優2" },
			]);
			const result2 = WorkCreators.create([
				{ id: "2", name: "声優2" },
				{ id: "1", name: "声優1" },
			]);
			const creators1 = result1._unsafeUnwrap();
			const creators2 = result2._unsafeUnwrap();
			expect(creators1.equals(creators2)).toBe(false);
		});

		it("should return false for non-WorkCreators", () => {
			const result = WorkCreators.create();
			const creators = result._unsafeUnwrap();
			expect(creators.equals({} as any)).toBe(false);
		});
	});

	describe("fromCreatorsObject", () => {
		it("should create from API object", () => {
			const result = WorkCreators.fromCreatorsObject({
				voice_by: [{ id: "1", name: "声優" }],
				scenario_by: [{ id: "2", name: "シナリオ" }],
				illust_by: [{ id: "3", name: "イラスト" }],
				music_by: [{ id: "4", name: "音楽" }],
				others_by: [{ id: "5", name: "その他" }],
				created_by: [{ id: "6", name: "制作" }],
			});

			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.voiceActors).toHaveLength(1);
			expect(creators.scenario).toHaveLength(1);
			expect(creators.illustration).toHaveLength(1);
			expect(creators.music).toHaveLength(1);
			expect(creators.others).toHaveLength(2); // others_by + created_by
		});

		it("should handle undefined creators", () => {
			const result = WorkCreators.fromCreatorsObject(undefined);
			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.hasAnyCreators()).toBe(false);
		});

		it("should handle partial creators", () => {
			const result = WorkCreators.fromCreatorsObject({
				voice_by: [{ id: "1", name: "声優" }],
				// Other fields undefined
			});

			expect(result.isOk()).toBe(true);
			const creators = result._unsafeUnwrap();
			expect(creators.voiceActors).toHaveLength(1);
			expect(creators.scenario).toHaveLength(0);
		});
	});
});
