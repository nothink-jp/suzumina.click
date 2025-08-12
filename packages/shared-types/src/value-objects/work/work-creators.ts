/**
 * Work Creators Value Object
 *
 * Represents all creators involved in a work
 * Refactored to use BaseValueObject and Result pattern for type safety
 */

import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import type { WorkCreatorsPlain } from "../../plain-objects/work-plain";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * Creator information type
 */
export interface CreatorInfo {
	id: string;
	name: string;
}

/**
 * WorkCreators data structure
 */
interface WorkCreatorsData {
	voiceActors: CreatorInfo[];
	scenario: CreatorInfo[];
	illustration: CreatorInfo[];
	music: CreatorInfo[];
	others: CreatorInfo[];
}

/**
 * WorkCreators Value Object with enhanced type safety
 */
export class WorkCreators
	extends BaseValueObject<WorkCreators>
	implements ValidatableValueObject<WorkCreators>
{
	private constructor(
		private readonly _voiceActors: CreatorInfo[] = [],
		private readonly _scenario: CreatorInfo[] = [],
		private readonly _illustration: CreatorInfo[] = [],
		private readonly _music: CreatorInfo[] = [],
		private readonly _others: CreatorInfo[] = [],
	) {
		super();
	}

	/**
	 * Creates a WorkCreators with validation
	 * @param voiceActors - Voice actors
	 * @param scenario - Scenario writers
	 * @param illustration - Illustrators
	 * @param music - Music composers
	 * @param others - Other creators
	 * @returns Result containing WorkCreators or ValidationError
	 */
	static create(
		voiceActors: CreatorInfo[] = [],
		scenario: CreatorInfo[] = [],
		illustration: CreatorInfo[] = [],
		music: CreatorInfo[] = [],
		others: CreatorInfo[] = [],
	): Result<WorkCreators, ValidationError> {
		const validation = WorkCreators.validate({
			voiceActors,
			scenario,
			illustration,
			music,
			others,
		});
		if (!validation.isValid) {
			return err(
				validationError("workCreators", validation.error ?? "クリエイター情報の検証に失敗しました"),
			);
		}

		// Filter valid creators
		const filteredVoiceActors = voiceActors.filter((v) => v?.name?.trim());
		const filteredScenario = scenario.filter((v) => v?.name?.trim());
		const filteredIllustration = illustration.filter((v) => v?.name?.trim());
		const filteredMusic = music.filter((v) => v?.name?.trim());
		const filteredOthers = others.filter((v) => v?.name?.trim());

		return ok(
			new WorkCreators(
				filteredVoiceActors,
				filteredScenario,
				filteredIllustration,
				filteredMusic,
				filteredOthers,
			),
		);
	}

	/**
	 * Creates a WorkCreators from data object
	 * @param data - WorkCreators data object
	 * @returns Result containing WorkCreators or ValidationError
	 */
	static fromData(data: WorkCreatorsData): Result<WorkCreators, ValidationError> {
		return WorkCreators.create(
			data.voiceActors,
			data.scenario,
			data.illustration,
			data.music,
			data.others,
		);
	}

	/**
	 * Creates a WorkCreators from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing WorkCreators or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<WorkCreators, ValidationError> {
		if (typeof obj !== "object" || obj === null) {
			return err(validationError("workCreators", "WorkCreators must be an object"));
		}

		const data = obj as Record<string, unknown>;

		const voiceActors = Array.isArray(data.voiceActors) ? (data.voiceActors as CreatorInfo[]) : [];
		const scenario = Array.isArray(data.scenario) ? (data.scenario as CreatorInfo[]) : [];
		const illustration = Array.isArray(data.illustration)
			? (data.illustration as CreatorInfo[])
			: [];
		const music = Array.isArray(data.music) ? (data.music as CreatorInfo[]) : [];
		const others = Array.isArray(data.others) ? (data.others as CreatorInfo[]) : [];

		return WorkCreators.create(voiceActors, scenario, illustration, music, others);
	}

	/**
	 * Validates WorkCreators data
	 */
	private static validate(data: {
		voiceActors: CreatorInfo[];
		scenario: CreatorInfo[];
		illustration: CreatorInfo[];
		music: CreatorInfo[];
		others: CreatorInfo[];
	}): { isValid: boolean; error?: string } {
		// Validate each array contains valid CreatorInfo objects
		const arrays = [
			{ name: "voiceActors", array: data.voiceActors },
			{ name: "scenario", array: data.scenario },
			{ name: "illustration", array: data.illustration },
			{ name: "music", array: data.music },
			{ name: "others", array: data.others },
		];

		for (const { name, array } of arrays) {
			if (!Array.isArray(array)) {
				return { isValid: false, error: `${name} must be an array` };
			}

			for (const item of array) {
				if (typeof item !== "object" || !item) {
					continue; // Will be filtered out
				}
				if (typeof item.id !== "string" || typeof item.name !== "string") {
					return { isValid: false, error: `${name} must contain objects with id and name strings` };
				}
			}
		}

		return { isValid: true };
	}

	get voiceActors(): CreatorInfo[] {
		return [...this._voiceActors];
	}

	get scenario(): CreatorInfo[] {
		return [...this._scenario];
	}

	get illustration(): CreatorInfo[] {
		return [...this._illustration];
	}

	get music(): CreatorInfo[] {
		return [...this._music];
	}

	get others(): CreatorInfo[] {
		return [...this._others];
	}

	// 互換性のための名前のみのゲッター
	get voiceActorNames(): string[] {
		return this._voiceActors.map((c) => c.name);
	}

	get scenarioNames(): string[] {
		return this._scenario.map((c) => c.name);
	}

	get illustrationNames(): string[] {
		return this._illustration.map((c) => c.name);
	}

	get musicNames(): string[] {
		return this._music.map((c) => c.name);
	}

	get otherNames(): string[] {
		return this._others.map((c) => c.name);
	}

	/**
	 * Gets all creators as a flat array
	 */
	getAll(): CreatorInfo[] {
		return [
			...this._voiceActors,
			...this._scenario,
			...this._illustration,
			...this._music,
			...this._others,
		];
	}

	/**
	 * Gets all creator names as a flat array
	 */
	getAllNames(): string[] {
		return this.getAll().map((c) => c.name);
	}

	/**
	 * Gets all unique creators
	 */
	getAllUnique(): CreatorInfo[] {
		const uniqueMap = new Map<string, CreatorInfo>();
		this.getAll().forEach((c) => {
			if (!uniqueMap.has(c.id)) {
				uniqueMap.set(c.id, c);
			}
		});
		return Array.from(uniqueMap.values());
	}

	/**
	 * Gets all unique creator names
	 */
	getAllUniqueNames(): string[] {
		return [...new Set(this.getAllNames())];
	}

	/**
	 * Checks if has any voice actors
	 */
	hasVoiceActors(): boolean {
		return this._voiceActors.length > 0;
	}

	/**
	 * Checks if has any creators
	 */
	hasAnyCreators(): boolean {
		return this.getAll().length > 0;
	}

	/**
	 * Gets primary voice actor (first one)
	 */
	getPrimaryVoiceActor(): CreatorInfo | undefined {
		return this._voiceActors[0];
	}

	/**
	 * Gets primary voice actor name
	 */
	getPrimaryVoiceActorName(): string | undefined {
		return this._voiceActors[0]?.name;
	}

	/**
	 * Gets searchable text for all creators
	 */
	getSearchableText(): string {
		return this.getAllUniqueNames().join(" ");
	}

	/**
	 * Returns string representation
	 */
	toString(): string {
		const parts: string[] = [];
		if (this._voiceActors.length > 0) {
			parts.push(`CV: ${this.voiceActorNames.join(", ")}`);
		}
		if (this._scenario.length > 0) {
			parts.push(`シナリオ: ${this.scenarioNames.join(", ")}`);
		}
		if (this._illustration.length > 0) {
			parts.push(`イラスト: ${this.illustrationNames.join(", ")}`);
		}
		if (this._music.length > 0) {
			parts.push(`音楽: ${this.musicNames.join(", ")}`);
		}
		if (this._others.length > 0) {
			parts.push(`その他: ${this.otherNames.join(", ")}`);
		}
		return parts.join(" / ");
	}

	/**
	 * Returns JSON representation
	 */
	toJSON() {
		return {
			voice_by: this._voiceActors,
			scenario_by: this._scenario,
			illust_by: this._illustration,
			music_by: this._music,
			others_by: this._others,
		};
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return WorkCreators.validate({
			voiceActors: this._voiceActors,
			scenario: this._scenario,
			illustration: this._illustration,
			music: this._music,
			others: this._others,
		}).isValid;
	}

	getValidationErrors(): string[] {
		const validation = WorkCreators.validate({
			voiceActors: this._voiceActors,
			scenario: this._scenario,
			illustration: this._illustration,
			music: this._music,
			others: this._others,
		});
		return validation.isValid ? [] : [validation.error ?? "クリエイター情報の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: WorkCreators): boolean {
		if (!other || !(other instanceof WorkCreators)) {
			return false;
		}

		return (
			this.arrayEquals(this._voiceActors, other._voiceActors) &&
			this.arrayEquals(this._scenario, other._scenario) &&
			this.arrayEquals(this._illustration, other._illustration) &&
			this.arrayEquals(this._music, other._music) &&
			this.arrayEquals(this._others, other._others)
		);
	}

	private arrayEquals(a: CreatorInfo[], b: CreatorInfo[]): boolean {
		if (a.length !== b.length) return false;
		return a.every((v, i) => b[i] && v.id === b[i].id && v.name === b[i].name);
	}

	clone(): WorkCreators {
		return new WorkCreators(
			[...this._voiceActors.map((c) => ({ ...c }))],
			[...this._scenario.map((c) => ({ ...c }))],
			[...this._illustration.map((c) => ({ ...c }))],
			[...this._music.map((c) => ({ ...c }))],
			[...this._others.map((c) => ({ ...c }))],
		);
	}

	toPlainObject(): WorkCreatorsPlain {
		return {
			voiceActors: [...this._voiceActors.map((c) => ({ ...c }))],
			scenario: [...this._scenario.map((c) => ({ ...c }))],
			illustration: [...this._illustration.map((c) => ({ ...c }))],
			music: [...this._music.map((c) => ({ ...c }))],
			others: [...this._others.map((c) => ({ ...c }))],
			voiceActorNames: this.voiceActorNames,
			scenarioNames: this.scenarioNames,
			illustrationNames: this.illustrationNames,
			musicNames: this.musicNames,
			otherNames: this.otherNames,
		};
	}

	/**
	 * Creates from creators object (normalized from DLsite API)
	 * @param creators - Creators object from API
	 * @returns Result containing WorkCreators or ValidationError
	 */
	static fromCreatorsObject(creators?: {
		voice_by?: Array<{ id: string; name: string }>;
		scenario_by?: Array<{ id: string; name: string }>;
		illust_by?: Array<{ id: string; name: string }>;
		music_by?: Array<{ id: string; name: string }>;
		others_by?: Array<{ id: string; name: string }>;
		created_by?: Array<{ id: string; name: string }>;
	}): Result<WorkCreators, ValidationError> {
		if (!creators) {
			return WorkCreators.create();
		}

		return WorkCreators.create(
			creators.voice_by || [],
			creators.scenario_by || [],
			creators.illust_by || [],
			creators.music_by || [],
			[...(creators.others_by || []), ...(creators.created_by || [])],
		);
	}

	/**
	 * Creates from legacy arrays (for backward compatibility)
	 * @param data - Legacy array data
	 * @returns Result containing WorkCreators or ValidationError
	 */
	static fromLegacyArrays(data: {
		voiceActors?: string[];
		scenario?: string[];
		illustration?: string[];
		music?: string[];
		author?: string[];
	}): Result<WorkCreators, ValidationError> {
		// レガシー配列からはIDがないので、名前をIDとして使用
		return WorkCreators.create(
			(data.voiceActors || []).map((name) => ({ id: name, name })),
			(data.scenario || []).map((name) => ({ id: name, name })),
			(data.illustration || []).map((name) => ({ id: name, name })),
			(data.music || []).map((name) => ({ id: name, name })),
			(data.author || []).map((name) => ({ id: name, name })),
		);
	}

	/**
	 * Creates an empty WorkCreators instance
	 * @returns Empty WorkCreators
	 */
	static createEmpty(): WorkCreators {
		return new WorkCreators([], [], [], [], []);
	}
}
