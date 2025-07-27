/**
 * Creator information type
 */
export interface CreatorInfo {
	id: string;
	name: string;
}

/**
 * Work Creators Value Object
 *
 * Represents all creators involved in a work
 */
export class WorkCreators {
	constructor(
		private readonly _voiceActors: CreatorInfo[] = [],
		private readonly _scenario: CreatorInfo[] = [],
		private readonly _illustration: CreatorInfo[] = [],
		private readonly _music: CreatorInfo[] = [],
		private readonly _others: CreatorInfo[] = [],
	) {
		// Ensure arrays are valid
		this._voiceActors = this._voiceActors.filter((v) => v?.name?.trim());
		this._scenario = this._scenario.filter((v) => v?.name?.trim());
		this._illustration = this._illustration.filter((v) => v?.name?.trim());
		this._music = this._music.filter((v) => v?.name?.trim());
		this._others = this._others.filter((v) => v?.name?.trim());
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

	/**
	 * Converts to plain object
	 */
	toPlainObject() {
		return {
			voiceActors: this.voiceActors,
			scenario: this.scenario,
			illustration: this.illustration,
			music: this.music,
			others: this.others,
			// 互換性のための名前配列
			voiceActorNames: this.voiceActorNames,
			scenarioNames: this.scenarioNames,
			illustrationNames: this.illustrationNames,
			musicNames: this.musicNames,
			otherNames: this.otherNames,
		};
	}

	equals(other: WorkCreators): boolean {
		if (!(other instanceof WorkCreators)) return false;

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

	/**
	 * Creates from creators object (normalized from DLsite API)
	 */
	static fromCreatorsObject(creators?: {
		voice_by?: Array<{ id: string; name: string }>;
		scenario_by?: Array<{ id: string; name: string }>;
		illust_by?: Array<{ id: string; name: string }>;
		music_by?: Array<{ id: string; name: string }>;
		others_by?: Array<{ id: string; name: string }>;
		created_by?: Array<{ id: string; name: string }>;
	}): WorkCreators {
		if (!creators) return new WorkCreators();

		return new WorkCreators(
			creators.voice_by || [],
			creators.scenario_by || [],
			creators.illust_by || [],
			creators.music_by || [],
			[...(creators.others_by || []), ...(creators.created_by || [])],
		);
	}

	/**
	 * Creates from legacy arrays (for backward compatibility)
	 */
	static fromLegacyArrays(data: {
		voiceActors?: string[];
		scenario?: string[];
		illustration?: string[];
		music?: string[];
		author?: string[];
	}): WorkCreators {
		// レガシー配列からはIDがないので、名前をIDとして使用
		return new WorkCreators(
			(data.voiceActors || []).map((name) => ({ id: name, name })),
			(data.scenario || []).map((name) => ({ id: name, name })),
			(data.illustration || []).map((name) => ({ id: name, name })),
			(data.music || []).map((name) => ({ id: name, name })),
			(data.author || []).map((name) => ({ id: name, name })),
		);
	}
}
